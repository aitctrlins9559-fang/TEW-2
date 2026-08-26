import { GoogleGenAI } from '@google/genai';
import { BUILTIN_STOCK_DICTIONARY, searchLocalDictionary, lookupStockInfo } from '../data/stockDictionary';

export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// CORS Proxy fallback list for static deployment (GitHub Pages)
const CORS_PROXIES = [
  (targetUrl: string) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  (targetUrl: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  (targetUrl: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
];

async function fetchWithCorsFallback(targetUrl: string, timeoutMs = 6000) {
  // First try direct fetch
  try {
    const res = await fetchWithTimeout(targetUrl, { cache: 'no-store' }, timeoutMs);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }

  // Try CORS proxies sequentially
  for (const getProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = getProxyUrl(targetUrl);
      const res = await fetchWithTimeout(proxyUrl, { cache: 'no-store' }, timeoutMs);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // try next
    }
  }

  throw new Error('All CORS proxies failed');
}

// 1. Exchange Rate (USD/TWD)
export async function apiFetchFx(): Promise<number> {
  try {
    const res = await fetchWithTimeout('/api/fx', {}, 4000);
    if (res.ok) {
      const json = await res.json();
      if (json.rate) return json.rate;
    }
  } catch {
    // Fallback for static hosting
  }

  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', {}, 5000);
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.TWD) return data.rates.TWD;
    }
  } catch {
    // ignore
  }

  return 31.5;
}

// 2. Real-time Quotes
export interface QuoteResult {
  symbol: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketPreviousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
}

export async function apiFetchQuotes(symbols: string[]): Promise<QuoteResult[]> {
  if (!symbols || symbols.length === 0) return [];

  let backendResults: QuoteResult[] = [];

  // 1. Try primary backend route
  try {
    const res = await fetchWithTimeout('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
    }, 6000);

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.results)) {
        backendResults = json.results;
      }
    }
  } catch {
    // Fallback
  }

  const foundSyms = new Set(
    backendResults.map((r) => r.symbol.toUpperCase().replace(/\.(TW|TWO)$/i, ''))
  );

  const missingSymbols = symbols.filter((sym) => {
    const upper = sym.toUpperCase();
    const bare = upper.replace(/\.(TW|TWO)$/i, '');
    return !foundSyms.has(upper) && !foundSyms.has(bare);
  });

  if (missingSymbols.length === 0) {
    return backendResults;
  }

  // 2. Client-side TWSE/TPEx OpenAPI Fallback for missing Taiwan stocks
  let clientOpenApiMap: Map<string, QuoteResult> = new Map();

  const twMissing = missingSymbols.filter((sym) => {
    const bare = sym.replace(/\.(TW|TWO)$/i, '').trim();
    return /^\d{4,6}[A-Z]?$/i.test(bare);
  });

  if (twMissing.length > 0) {
    try {
      const [twseRes, tpexRes] = await Promise.allSettled([
        fetchWithTimeout('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', {}, 5000),
        fetchWithTimeout('https://openapi.tpex.org.tw/v1/opendata/MainBoard_Daily_Quotes', {}, 5000),
      ]);

      if (twseRes.status === 'fulfilled' && twseRes.value.ok) {
        const twseData = await twseRes.value.json();
        if (Array.isArray(twseData)) {
          twseData.forEach((row: any) => {
            const code = row.Code?.toString().trim();
            const close = parseFloat((row.ClosingPrice || '').toString().replace(/,/g, ''));
            const open = parseFloat((row.OpeningPrice || '').toString().replace(/,/g, '')) || close;
            const high = parseFloat((row.HighestPrice || '').toString().replace(/,/g, '')) || close;
            const low = parseFloat((row.LowestPrice || '').toString().replace(/,/g, '')) || close;
            const change = parseFloat((row.Change || '').toString().replace(/,/g, '')) || 0;
            const prevClose = close - change > 0 ? close - change : close;

            if (code && !isNaN(close) && close > 0) {
              const resObj: QuoteResult = {
                symbol: code,
                shortName: row.Name || code,
                regularMarketPrice: close,
                regularMarketPreviousClose: !isNaN(prevClose) && prevClose > 0 ? prevClose : close,
                regularMarketDayHigh: high,
                regularMarketDayLow: low,
              };
              clientOpenApiMap.set(code, resObj);
              clientOpenApiMap.set(`${code}.TW`, resObj);
            }
          });
        }
      }

      if (tpexRes.status === 'fulfilled' && tpexRes.value.ok) {
        const tpexData = await tpexRes.value.json();
        if (Array.isArray(tpexData)) {
          tpexData.forEach((row: any) => {
            const code = (row.SecuritiesCompanyCode || row.Code)?.toString().trim();
            const close = parseFloat((row.Close || row.ClosePrice || '').toString().replace(/,/g, ''));
            const open = parseFloat((row.Open || row.OpenPrice || '').toString().replace(/,/g, '')) || close;
            const high = parseFloat((row.High || row.HighPrice || '').toString().replace(/,/g, '')) || close;
            const low = parseFloat((row.Low || row.LowPrice || '').toString().replace(/,/g, '')) || close;
            const change = parseFloat((row.Change || '').toString().replace(/,/g, '')) || 0;
            const prevClose = close - change > 0 ? close - change : close;

            if (code && !isNaN(close) && close > 0) {
              const resObj: QuoteResult = {
                symbol: code,
                shortName: row.CompanyName || code,
                regularMarketPrice: close,
                regularMarketPreviousClose: !isNaN(prevClose) && prevClose > 0 ? prevClose : close,
                regularMarketDayHigh: high,
                regularMarketDayLow: low,
              };
              clientOpenApiMap.set(code, resObj);
              clientOpenApiMap.set(`${code}.TWO`, resObj);
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Yahoo Finance CORS proxy fallback for any remaining missing symbols
  const clientResults = await Promise.all(
    missingSymbols.map(async (sym) => {
      const bare = sym.replace(/\.(TW|TWO)$/i, '').trim();
      const openApiMatch = clientOpenApiMap.get(bare) || clientOpenApiMap.get(sym);
      if (openApiMatch) {
        return { ...openApiMatch, symbol: sym };
      }

      try {
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`;
        const data = await fetchWithCorsFallback(targetUrl, 6000);
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          return {
            symbol: sym,
            shortName: meta.shortName || meta.longName || sym,
            regularMarketPrice: meta.regularMarketPrice,
            regularMarketPreviousClose: meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice,
            regularMarketDayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
            regularMarketDayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
          };
        }
      } catch {
        // ignore
      }

      return null;
    })
  );

  const combined = [...backendResults, ...(clientResults.filter(Boolean) as QuoteResult[])];

  // Remove duplicates
  const uniqueMap = new Map<string, QuoteResult>();
  combined.forEach((item) => {
    if (item && item.symbol) {
      const key = item.symbol.toUpperCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }
  });

  return Array.from(uniqueMap.values());
}

// 3. Market Indices
export async function apiFetchIndices() {
  const indexSymbols = ['^TWII', '^N225', '^KS11', '^DJI', '^GSPC', '^IXIC'];

  try {
    const res = await fetchWithTimeout('/api/indices', {}, 5000);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.results) && json.results.length > 0) {
        return json.results;
      }
    }
  } catch {
    // Fallback
  }

  const results = await Promise.all(
    indexSymbols.map(async (sym) => {
      try {
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`;
        const data = await fetchWithCorsFallback(targetUrl, 5000);
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number') {
          const price = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || meta.previousClose || price;
          const change = price - prevClose;
          const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
          return { symbol: sym, price, prevClose, change, changePct };
        }
      } catch {
        // ignore
      }
      return null;
    })
  );

  return results.filter(Boolean);
}

// 4. Stock Search
export async function apiSearchStock(query: string) {
  const q = query.trim();
  if (!q) return [];

  // Local dictionary matches first (contains Chinese stock names)
  const localMatches = searchLocalDictionary(q, 10);

  let remoteResults: Array<{ symbol: string; name: string; market: 'tse' | 'otc' | 'us' }> = [];

  try {
    const res = await fetchWithTimeout(`/api/search?q=${encodeURIComponent(q)}`, {}, 5000);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.results)) {
        remoteResults = json.results;
      }
    }
  } catch {
    // Fallback via CORS proxy if API route unavailable
    try {
      const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=zh-Hant-TW&region=TW&quotesCount=10&newsCount=0`;
      const data = await fetchWithCorsFallback(targetUrl, 5000);
      const quotes = data?.quotes || [];
      remoteResults = quotes
        .filter((item: { quoteType?: string }) => item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
        .map((item: { symbol: string; shortname?: string; longname?: string }) => {
          let symbol = item.symbol;
          let market: 'tse' | 'otc' | 'us' = 'us';
          if (symbol.endsWith('.TW')) {
            symbol = symbol.slice(0, -3);
            market = 'tse';
          } else if (symbol.endsWith('.TWO')) {
            symbol = symbol.slice(0, -4);
            market = 'otc';
          }
          return {
            symbol,
            name: item.shortname || item.longname || symbol,
            market,
          };
        });
    } catch {
      // ignore
    }
  }

  // Combine local and remote results, preferring local Chinese names when symbol matches
  const merged: Array<{ symbol: string; name: string; market: 'tse' | 'otc' | 'us' }> = [...localMatches];

  remoteResults.forEach((remote) => {
    // Check if symbol exists in local dictionary for Chinese name lookup
    const localInfo = lookupStockInfo(remote.symbol);
    const chineseName = localInfo ? localInfo.name : remote.name;

    const existingIdx = merged.findIndex((m) => m.symbol.toUpperCase() === remote.symbol.toUpperCase());
    if (existingIdx === -1) {
      merged.push({
        symbol: remote.symbol,
        name: chineseName,
        market: localInfo ? localInfo.market : remote.market,
      });
    } else {
      const currentName = merged[existingIdx].name;
      const isPlaceholder =
        !currentName ||
        currentName.startsWith('台股標的') ||
        currentName.startsWith('美股標的') ||
        currentName.startsWith('搜尋') ||
        currentName === merged[existingIdx].symbol;

      if (localInfo) {
        merged[existingIdx].name = localInfo.name;
        merged[existingIdx].market = localInfo.market;
      } else if (isPlaceholder && remote.name && remote.name !== remote.symbol) {
        merged[existingIdx].name = remote.name;
        merged[existingIdx].market = remote.market;
      }
    }
  });

  return merged.slice(0, 10);
}

// 5. News
export interface DividendEventItem {
  symbol: string;
  exDate: string; // YYYY/MM/DD
  exDateTs: number;
  amount: number; // 現金股利 (配息)
  stockDps?: number; // 股票股利 (配股)
  type?: string; // '息' | '權' | '權息'
}

export async function apiFetchDividends(symbols: string[], forceRefresh = false): Promise<DividendEventItem[]> {
  if (!symbols || symbols.length === 0) return [];
  try {
    const timestamp = Date.now();
    const res = await fetchWithTimeout(
      `/api/dividends?symbols=${encodeURIComponent(symbols.join(','))}&_t=${timestamp}`,
      { cache: forceRefresh ? 'no-store' : 'no-cache' },
      8000
    );
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.events)) {
        return json.events;
      }
    }
  } catch {
    // Fallback if backend route fails
  }
  return [];
}

export async function apiFetchNews() {
  try {
    const res = await fetchWithTimeout('/api/news', {}, 5000);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items) && json.items.length > 0) {
        return json.items;
      }
    }
  } catch {
    // Fallback
  }

  try {
    const rssUrl = 'https://tw.stock.yahoo.com/rss';
    const res = await fetchWithTimeout(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`, {}, 6000);
    if (res.ok) {
      const data = await res.json();
      if (data?.status === 'ok' && Array.isArray(data.items)) {
        return data.items.slice(0, 15).map((item: { title: string; link: string; pubDate?: string }) => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
        }));
      }
    }
  } catch {
    // ignore
  }

  return [];
}

// 6. Chart Data
export async function apiFetchChartData(symbol: string, range = '1d', interval = '5m') {
  try {
    const res = await fetchWithTimeout(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`, {}, 6000);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.meta) {
        return json;
      }
    }
  } catch {
    // Fallback
  }

  try {
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const data = await fetchWithCorsFallback(targetUrl, 6000);
    const result = data?.chart?.result?.[0];
    if (result) {
      return {
        success: true,
        meta: result.meta,
        timestamp: result.timestamp || [],
        quotes: result.indicators?.quote?.[0]?.close || [],
        volumes: result.indicators?.quote?.[0]?.volume || [],
        opens: result.indicators?.quote?.[0]?.open || [],
        highs: result.indicators?.quote?.[0]?.high || [],
        lows: result.indicators?.quote?.[0]?.low || [],
      };
    }
  } catch {
    // ignore
  }

  return null;
}

// 7. Gemini AI Analysis
export async function apiRunAIAnalysis(
  payload: Record<string, unknown>,
  clientApiKey?: string
) {
  try {
    const res = await fetchWithTimeout('/api/ai-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 15000);

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.analysis) {
        return json.analysis;
      }
      if (json.error) {
        throw new Error(json.error);
      }
    }
  } catch (err) {
    const msg = (err as Error).message || '';
    if (msg.includes('GEMINI_API_KEY')) {
      throw err;
    }
  }

  const apiKey = clientApiKey || localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    throw new Error('NEED_API_KEY: 靜態託管 (GitHub Pages) 需設定 Gemini API Key 才能執行 AI 戰情分析。');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `你是一位精通台股與美股的資深首席投資顧問 (Chief Investment Officer)。
請針對用戶目前的持股投資組合進行全方位的「AI 戰情分析診斷」：

【用戶投資組合數據】:
- 總估值 (NT$): ${payload.totalValue}
- 未實現損益 (NT$): ${payload.totalProfit}
- 總報酬率 (%): ${payload.totalROI}%
- 持股明細: ${JSON.stringify(payload.portfolio, null, 2)}
- 國際大盤現況: ${JSON.stringify(payload.indices, null, 2)}

請提供結構化的 JSON 診斷報告，內容必須繁體中文，格式嚴格遵循 JSON 規範：
{
  "summary": "一句話精闢總結目前的整體持股健康狀況與走勢表現",
  "riskRating": "低風險 | 中等風險 | 高風險 | 極高風險",
  "allocationComment": "針對台美股比例、個股集中度與產業分散度的詳細講評",
  "topOpportunities": ["潛力亮點或利多因素 1", "潛力亮點 2"],
  "riskWarnings": ["潛在風險點或需要注意的個股 1", "風控提醒 2"],
  "actionAdvice": "具體可執行的操盤建議 (例如：適度止盈、回檔逢低分批加碼、設好停損)"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: '你是一位講求數據實證、嚴守風控與專業客觀的資深台美股操盤手顧問。',
    },
  });

  const text = response.text || '{}';
  const resultJson = JSON.parse(text);

  return {
    ...resultJson,
    timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
  };
}

// 8. Gemini AI Interactive Chat Q&A
export async function apiRunAIChat(
  payload: {
    message: string;
    history?: Array<{ role: 'user' | 'model'; content: string }>;
    portfolio?: unknown;
    totalValue?: number;
    totalProfit?: number;
    totalROI?: number;
    indices?: unknown;
  },
  clientApiKey?: string
) {
  const apiKeyToUse = clientApiKey || localStorage.getItem('gemini_api_key') || '';

  try {
    const res = await fetchWithTimeout('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        customApiKey: apiKeyToUse,
      }),
    }, 15000);

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.reply) {
        return json.reply;
      }
    }
  } catch {
    // Ignore error and fall through to client side / fallback
  }

  const apiKey = clientApiKey || localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    return `針對您提出的問題：「${payload.message}」，根據您當前的資產組合，建議密切追蹤市場輪動與重倉股支撐力道，並維持良好資金比例與防禦心態。`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `你是一位講求數據、嚴守風控且極具親和力的資深台美股首席投資顧問。
用戶當前資產概況：
- 總估值: $${payload.totalValue || 0} TWD
- 累積損益: $${payload.totalProfit || 0} TWD (${payload.totalROI || 0}%)
- 持股明細: ${JSON.stringify(payload.portfolio || [])}

【問題】:
${payload.message}

請以繁體中文給予具體、條理分明的操盤建議與市場解讀 (可用 Markdown 條列)。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: '你是一位精通台股與美股的資深操盤手顧問。',
      },
    });

    return response.text || '無回應';
  } catch {
    return `目前連線繁忙，建議您檢視持股部位並設好止盈止損點，以維持整體投資組合防禦力。`;
  }
}

