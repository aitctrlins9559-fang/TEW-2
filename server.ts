import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// CORS headers for local / proxy requests
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Utility helper to fetch JSON with timeout
async function fetchWithTimeout(url: string, timeoutMs = 8000, options: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ...(options.headers || {}),
      },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 1. USD/TWD Exchange Rate Endpoint
app.get('/api/fx', async (_req, res) => {
  try {
    const data = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD', 5000);
    const twdRate = data?.rates?.TWD || 31.5;
    res.json({ success: true, rate: twdRate });
  } catch {
    // Fallback if er-api is down
    res.json({ success: true, rate: 31.5, fallback: true });
  }
});

// 2. Real-time Quotes Endpoint (TWSE MIS Batch + TWSE/TPEx OpenAPIs + Yahoo Finance Multi-Host Fallback)

interface StockOpenApiCacheItem {
  symbol: string;
  shortName: string;
  price: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  market: 'tse' | 'otc';
}

let twseOpenApiCache: Map<string, StockOpenApiCacheItem> = new Map();
let lastOpenApiFetchTime = 0;

async function getTwseOpenApiQuotes(): Promise<Map<string, StockOpenApiCacheItem>> {
  const now = Date.now();
  if (twseOpenApiCache.size > 0 && now - lastOpenApiFetchTime < 60000) {
    return twseOpenApiCache;
  }

  const newCache = new Map<string, StockOpenApiCacheItem>();

  try {
    const twseData = await fetchWithTimeout('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', 5000);
    if (Array.isArray(twseData)) {
      twseData.forEach((row: any) => {
        const code = row.Code?.toString().trim();
        const closeStr = (row.ClosingPrice || '').toString().replace(/,/g, '');
        const close = parseFloat(closeStr);
        const open = parseFloat((row.OpeningPrice || '').toString().replace(/,/g, '')) || close;
        const high = parseFloat((row.HighestPrice || '').toString().replace(/,/g, '')) || close;
        const low = parseFloat((row.LowestPrice || '').toString().replace(/,/g, '')) || close;
        const changeStr = (row.Change || '').toString().replace(/,/g, '');
        const change = parseFloat(changeStr) || 0;
        const prevClose = close - change > 0 ? close - change : close;

        if (code && !isNaN(close) && close > 0) {
          const item: StockOpenApiCacheItem = {
            symbol: code,
            shortName: row.Name || code,
            price: close,
            prevClose: !isNaN(prevClose) && prevClose > 0 ? prevClose : close,
            dayHigh: high,
            dayLow: low,
            market: 'tse',
          };
          newCache.set(code, item);
          newCache.set(`${code}.TW`, item);
        }
      });
    }
  } catch {
    // ignore
  }

  try {
    const tpexData = await fetchWithTimeout('https://openapi.tpex.org.tw/v1/opendata/MainBoard_Daily_Quotes', 5000);
    if (Array.isArray(tpexData)) {
      tpexData.forEach((row: any) => {
        const code = (row.SecuritiesCompanyCode || row.Code)?.toString().trim();
        const closeStr = (row.Close || row.ClosePrice || '').toString().replace(/,/g, '');
        const close = parseFloat(closeStr);
        const open = parseFloat((row.Open || row.OpenPrice || '').toString().replace(/,/g, '')) || close;
        const high = parseFloat((row.High || row.HighPrice || '').toString().replace(/,/g, '')) || close;
        const low = parseFloat((row.Low || row.LowPrice || '').toString().replace(/,/g, '')) || close;
        const change = parseFloat((row.Change || '').toString().replace(/,/g, '')) || 0;
        const prevClose = close - change > 0 ? close - change : close;

        if (code && !isNaN(close) && close > 0) {
          const item: StockOpenApiCacheItem = {
            symbol: code,
            shortName: row.CompanyName || code,
            price: close,
            prevClose: !isNaN(prevClose) && prevClose > 0 ? prevClose : close,
            dayHigh: high,
            dayLow: low,
            market: 'otc',
          };
          newCache.set(code, item);
          newCache.set(`${code}.TWO`, item);
        }
      });
    }
  } catch {
    // ignore
  }

  if (newCache.size > 0) {
    twseOpenApiCache = newCache;
    lastOpenApiFetchTime = now;
  }
  return twseOpenApiCache;
}

async function fetchYahooChart(sym: string, interval = '1m', range = '1d', timeoutMs = 6000) {
  const cleanCode = sym.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();
  const isNumericCode = /^\d{4,6}[A-Z]?$/i.test(cleanCode);

  const symbolsToTry: string[] = [];
  if (isNumericCode) {
    if (sym.endsWith('.TWO')) {
      symbolsToTry.push(`${cleanCode}.TWO`, `${cleanCode}.TW`, cleanCode);
    } else {
      symbolsToTry.push(`${cleanCode}.TW`, `${cleanCode}.TWO`, cleanCode);
    }
  } else {
    symbolsToTry.push(sym);
  }

  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

  for (const s of symbolsToTry) {
    for (const host of hosts) {
      // 1. Chart endpoint
      try {
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(s)}?interval=${interval}&range=${range}`;
        const data = await fetchWithTimeout(url, timeoutMs, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          return {
            symbol: sym,
            resolvedSymbol: s,
            shortName: meta.shortName || meta.longName || meta.symbol || sym,
            regularMarketPrice: meta.regularMarketPrice,
            regularMarketPreviousClose: meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice,
            regularMarketDayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
            regularMarketDayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
            rawChart: data,
          };
        }
      } catch {
        // try next
      }

      // 2. Quote endpoint fallback
      try {
        const url = `https://${host}/v7/finance/quote?symbols=${encodeURIComponent(s)}`;
        const data = await fetchWithTimeout(url, timeoutMs, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*',
          },
        });
        const q = data?.quoteResponse?.result?.[0];
        if (q && typeof q.regularMarketPrice === 'number' && q.regularMarketPrice > 0) {
          return {
            symbol: sym,
            resolvedSymbol: s,
            shortName: q.shortName || q.longName || q.symbol || sym,
            regularMarketPrice: q.regularMarketPrice,
            regularMarketPreviousClose: q.regularMarketPreviousClose || q.regularMarketPrice,
            regularMarketDayHigh: q.regularMarketDayHigh || q.regularMarketPrice,
            regularMarketDayLow: q.regularMarketDayLow || q.regularMarketPrice,
          };
        }
      } catch {
        // try next
      }
    }
  }

  // 3. Stooq Fallback for US Stocks
  if (!isNumericCode) {
    try {
      const url = `https://stooq.com/q/l/?s=${encodeURIComponent(cleanCode.toLowerCase())}.us&f=sdal212&e=json`;
      const data = await fetchWithTimeout(url, 4000);
      const symbolItem = data?.symbols?.[0];
      if (symbolItem) {
        const price = parseFloat(symbolItem.close);
        const high = parseFloat(symbolItem.high) || price;
        const low = parseFloat(symbolItem.low) || price;
        const open = parseFloat(symbolItem.open) || price;
        if (!isNaN(price) && price > 0) {
          return {
            symbol: sym,
            resolvedSymbol: sym,
            shortName: sym,
            regularMarketPrice: price,
            regularMarketPreviousClose: open,
            regularMarketDayHigh: high,
            regularMarketDayLow: low,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function fetchTwseBatch(symbols: string[]) {
  const twItems: { original: string; code: string }[] = [];
  symbols.forEach((sym) => {
    const clean = sym.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();
    if (/^\d{4,6}[A-Z]?$/i.test(clean)) {
      twItems.push({ original: sym, code: clean });
    }
  });

  if (twItems.length === 0) return [];

  const exChParts: string[] = [];
  twItems.forEach((item) => {
    exChParts.push(`tse_${item.code}.tw`);
    exChParts.push(`otc_${item.code}.tw`);
  });

  const results: any[] = [];

  try {
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exChParts.join('|'))}&_=${Date.now()}`;
    const data = await fetchWithTimeout(url, 6000, {
      headers: {
        'Referer': 'https://mis.twse.com.tw/stock/fibest.jsp',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    const msgArray = data?.msgArray || [];

    twItems.forEach((item) => {
      const match = msgArray.find((m: any) => m.c === item.code && (m.z || m.y || m.a || m.b));
      if (match) {
        let price = parseFloat(match.z);
        if (isNaN(price) || price <= 0) {
          if (match.a && match.a !== '-') price = parseFloat(match.a.split('_')[0]);
          if ((isNaN(price) || price <= 0) && match.b && match.b !== '-') price = parseFloat(match.b.split('_')[0]);
          if (isNaN(price) || price <= 0) price = parseFloat(match.y);
        }
        const prevClose = parseFloat(match.y) || price;
        const dayHigh = parseFloat(match.h) || price;
        const dayLow = parseFloat(match.l) || price;

        const stockName = match.n || match.nf || '';
        if (price > 0) {
          results.push({
            symbol: item.original,
            shortName: stockName,
            regularMarketPrice: price,
            regularMarketPreviousClose: prevClose,
            regularMarketDayHigh: dayHigh,
            regularMarketDayLow: dayLow,
          });
          if (item.original !== item.code) {
            results.push({
              symbol: item.code,
              shortName: stockName,
              regularMarketPrice: price,
              regularMarketPreviousClose: prevClose,
              regularMarketDayHigh: dayHigh,
              regularMarketDayLow: dayLow,
            });
          }
        }
      }
    });
  } catch {
    // ignore MIS error
  }

  // Fallback to TWSE/TPEx OpenAPI if MIS failed or missed any items
  const foundCodes = new Set(results.map((r) => r.symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase()));
  const missingTwItems = twItems.filter((it) => !foundCodes.has(it.code));

  if (missingTwItems.length > 0) {
    const openApiMap = await getTwseOpenApiQuotes();
    missingTwItems.forEach((item) => {
      const cached = openApiMap.get(item.code) || openApiMap.get(`${item.code}.TW`) || openApiMap.get(`${item.code}.TWO`);
      if (cached) {
        results.push({
          symbol: item.original,
          shortName: cached.shortName,
          regularMarketPrice: cached.price,
          regularMarketPreviousClose: cached.prevClose,
          regularMarketDayHigh: cached.dayHigh,
          regularMarketDayLow: cached.dayLow,
        });
        if (item.original !== item.code) {
          results.push({
            symbol: item.code,
            shortName: cached.shortName,
            regularMarketPrice: cached.price,
            regularMarketPreviousClose: cached.prevClose,
            regularMarketDayHigh: cached.dayHigh,
            regularMarketDayLow: cached.dayLow,
          });
        }
      }
    });
  }

  return results;
}

app.post('/api/quote', async (req, res) => {
  try {
    const { symbols } = req.body as { symbols: string[] };
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.json({ success: true, results: [] });
    }

    // 1. Try TWSE MIS Batch + TWSE OpenAPI for Taiwan stocks
    const twseResults = await fetchTwseBatch(symbols);
    const foundSyms = new Set(twseResults.map((r) => r.symbol.toUpperCase()));

    // 2. Fetch missing / US stocks from Yahoo Finance & Stooq
    const missingSymbols = symbols.filter((sym) => {
      const upper = sym.toUpperCase();
      const bare = upper.replace(/\.(TW|TWO)$/i, '');
      return !foundSyms.has(upper) && !foundSyms.has(bare);
    });

    const yahooResults = await Promise.all(
      missingSymbols.map((sym) => fetchYahooChart(sym, '1m', '1d', 6000))
    );

    const validYahoo = yahooResults.filter(Boolean);

    const combinedResults = [...twseResults, ...validYahoo];
    res.json({ success: true, results: combinedResults });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Market Indices Endpoint
app.get('/api/indices', async (_req, res) => {
  const indexSymbols = ['^TWII', '^N225', '^KS11', '^DJI', '^GSPC', '^IXIC'];
  try {
    // Try TWSE MIS for ^TWII (tse_t00.tw)
    let twiiResult: any = null;
    try {
      const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&_=${Date.now()}`;
      const data = await fetchWithTimeout(url, 4000);
      const match = data?.msgArray?.[0];
      if (match) {
        const price = parseFloat(match.z) || parseFloat(match.y);
        const prevClose = parseFloat(match.y) || price;
        if (price > 0) {
          const change = price - prevClose;
          const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
          twiiResult = {
            symbol: '^TWII',
            price,
            prevClose,
            change,
            changePct,
          };
        }
      }
    } catch {
      // ignore
    }

    const results = await Promise.all(
      indexSymbols.map(async (sym) => {
        if (sym === '^TWII' && twiiResult) return twiiResult;
        try {
          const chartData = await fetchYahooChart(sym, '1m', '1d', 5000);
          if (chartData && typeof chartData.regularMarketPrice === 'number') {
            const price = chartData.regularMarketPrice;
            const prevClose = chartData.regularMarketPreviousClose;
            const change = price - prevClose;
            const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
            return {
              symbol: sym,
              price,
              prevClose,
              change,
              changePct,
            };
          }
        } catch {
          // ignore
        }
        return null;
      })
    );

    res.json({ success: true, results: results.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Helper: Fubon Neo / Fugle Market Data API Fallback (富邦新一代 API 備援數據源)
async function fetchFubonFugleDividendFallback(symbol: string): Promise<{
  exDate: string;
  exDateTs: number;
  amount: number;
  stockDps?: number;
  type?: string;
} | null> {
  const apiKey = process.env.FUBON_API_KEY || process.env.FUGLE_API_KEY;
  const cleanSym = symbol.toUpperCase().replace(/\.(TW|TWO)$/i, '');

  try {
    const url = `https://api.fugle.tw/marketdata/v1.0/stock/historical/dividends/${encodeURIComponent(cleanSym)}`;
    const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0' };
    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    const res = await fetchWithTimeout(url, 4000, { headers });
    if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
      const latest = res.data[0];
      const cashDps = parseFloat(latest.cashDividend || '0');
      const stockDps = parseFloat(latest.stockDividend || '0');
      const rawDate = latest.date || '';
      const dateStr = rawDate.replace(/-/g, '/');
      const dt = new Date(rawDate);
      let typeStr = '息';
      if (cashDps > 0 && stockDps > 0) typeStr = '權息';
      else if (stockDps > 0) typeStr = '權';

      if (cashDps > 0 || stockDps > 0) {
        return {
          exDate: dateStr,
          exDateTs: !isNaN(dt.getTime()) ? Math.floor(dt.getTime() / 1000) : 0,
          amount: cashDps,
          stockDps: stockDps > 0 ? stockDps : undefined,
          type: typeStr,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// 4. Stock Dividend Endpoint (Returns both Cash Dividend 配息 and Stock Dividend 配股 from TWSE OpenAPI & TWT48U)
app.get('/api/dividends', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const symbolsParam = String(req.query.symbols || req.query.symbol || '').trim();
  if (!symbolsParam) return res.json({ success: true, events: [] });

  const rawSymbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
  const eventsResult: Array<{
    symbol: string;
    exDate: string; // YYYY/MM/DD
    exDateTs: number;
    amount: number; // 現金股利
    stockDps?: number; // 股票股利 (元)
    type?: string;
  }> = [];

  // 1. Fetch TWSE Official TWT48U Ex-Dividend/Ex-Rights schedule table
  let twseExDateMap: Record<string, { exDate: string; cashDps: number; stockDps: number; type: string }> = {};
  try {
    const twseRes = await fetchWithTimeout('https://www.twse.com.tw/exchangeReport/TWT48U?response=json', 5000);
    if (twseRes && Array.isArray(twseRes.data)) {
      twseRes.data.forEach((row: string[]) => {
        const rocDate = row[0]; // e.g. '115年08月28日'
        const sym = row[1]?.trim();
        const typeStr = row[3]?.trim(); // '息', '權', '權息'
        const stockRatio = parseFloat(row[4] || '0');
        const stockDps = stockRatio * 10; // 配股元數
        const cashDps = parseFloat(row[7] || '0');

        const match = rocDate.match(/(\d+)年(\d+)月(\d+)日/);
        if (match && sym) {
          const yyyy = parseInt(match[1], 10) + 1911;
          const mm = match[2].padStart(2, '0');
          const dd = match[3].padStart(2, '0');
          const dateStr = `${yyyy}/${mm}/${dd}`;
          twseExDateMap[sym] = { exDate: dateStr, cashDps, stockDps, type: typeStr };
        }
      });
    }
  } catch {
    // Ignore error
  }

  // 2. Fetch TWSE (上市) & TPEx (上櫃) Official Dividend Distribution OpenAPI
  let twseDistributionMap: Record<string, { name: string; year: string; cashDps: number; stockDps: number; type: string; status: string }> = {};

  const parseDistributionApi = (items: any[]) => {
    if (!Array.isArray(items)) return;
    items.forEach((item: Record<string, any>) => {
      const sym = (item['公司代號'] || item['SecuritiesCompanyCode'])?.toString()?.trim();
      if (!sym) return;

      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (item[k] !== undefined && item[k] !== null && item[k] !== '') {
            const v = parseFloat(String(item[k]).replace(/,/g, ''));
            if (!isNaN(v) && v >= 0) return v;
          }
        }
        return 0;
      };

      const cash1 = getVal(['股東配發-盈餘分配之現金股利(元/股)', '盈餘分配現金股利', 'CashDividendPerShare']);
      const cash2 = getVal(['股東配發-法定盈餘公積發放之現金(元/股)', '法定盈餘公積現金股利']);
      const cash3 = getVal(['股東配發-資本公積發放之現金(元/股)', '資本公積現金股利']);
      const cashDirect = getVal(['普通股每股現金股利（元）', '普通股每股現金股利', '現金股利']);
      const cashDps = (cash1 + cash2 + cash3) > 0 ? (cash1 + cash2 + cash3) : cashDirect;

      const stock1 = getVal(['股東配發-盈餘轉增資配股(元/股)', '盈餘轉增資配股', 'StockDividendPerShare']);
      const stock2 = getVal(['股東配發-法定盈餘公積轉增資配股(元/股)', '法定盈餘公積轉增資配股']);
      const stock3 = getVal(['股東配發-資本公積轉增資配股(元/股)', '資本公積轉增資配股']);
      const stockDirect = getVal(['普通股每股股票股利（元）', '普通股每股股票股利', '股票股利']);
      const stockDps = (stock1 + stock2 + stock3) > 0 ? (stock1 + stock2 + stock3) : stockDirect;

      let typeStr = '息';
      if (cashDps > 0 && stockDps > 0) typeStr = '權息';
      else if (stockDps > 0) typeStr = '權';

      const yr = String(item['股利年度'] || item['Year'] || '');
      const existing = twseDistributionMap[sym];

      const newTotalDps = cashDps + stockDps;
      const existingTotalDps = (existing?.cashDps || 0) + (existing?.stockDps || 0);
      const newYr = Number(yr || 0);
      const existingYr = Number(existing?.year || 0);

      if (!existing || newYr > existingYr || (newYr === existingYr && newTotalDps > existingTotalDps)) {
        twseDistributionMap[sym] = {
          name: (item['公司名稱'] || item['SecuritiesCompanyName'])?.toString()?.trim() || '',
          year: yr,
          cashDps: Math.round(cashDps * 10000) / 10000,
          stockDps: Math.round(stockDps * 10000) / 10000,
          type: typeStr,
          status: String(item['決議（擬議）進度'] || ''),
        };
      }
    });
  };

  try {
    const [openResL, openResO] = await Promise.allSettled([
      fetchWithTimeout('https://openapi.twse.com.tw/v1/opendata/t187ap45_L', 5000),
      fetchWithTimeout('https://openapi.tpex.org.tw/v1/opendata/t187ap45_O', 5000),
    ]);
    if (openResL.status === 'fulfilled') parseDistributionApi(openResL.value);
    if (openResO.status === 'fulfilled') parseDistributionApi(openResO.value);
  } catch {
    // Ignore error
  }

  await Promise.all(
    rawSymbols.map(async (rawSym) => {
      const cleanSym = rawSym.toUpperCase().replace(/\.(TW|TWO)$/i, '');
      const isTwCode = /^\d{4,6}[A-Z]?$/i.test(cleanSym);

      // Check 1: Official TWSE Ex-Date schedule (TWT48U)
      if (isTwCode && twseExDateMap[cleanSym]) {
        const official = twseExDateMap[cleanSym];
        const dt = new Date(official.exDate.replace(/\//g, '-'));
        eventsResult.push({
          symbol: rawSym.toUpperCase(),
          exDate: official.exDate,
          exDateTs: Math.floor(dt.getTime() / 1000),
          amount: official.cashDps,
          stockDps: official.stockDps > 0 ? official.stockDps : undefined,
          type: official.type,
        });
        return;
      }

      // Check 2: Official TWSE Dividend Distribution API (t187ap45_L)
      if (isTwCode && twseDistributionMap[cleanSym]) {
        const openOfficial = twseDistributionMap[cleanSym];
        if (openOfficial.cashDps > 0 || openOfficial.stockDps > 0) {
          let exDateStr = '';
          let exDateTs = 0;

          let symbolsToTry: string[] = [rawSym.toUpperCase()];
          if (isTwCode && !rawSym.includes('.')) {
            symbolsToTry = [`${cleanSym}.TWO`, `${cleanSym}.TW`];
          }

          for (const s of symbolsToTry) {
            try {
              const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?events=div|split&range=1y&interval=1d`;
              const data = await fetchWithTimeout(url, 4000);
              const divsObj = data?.chart?.result?.[0]?.events?.dividends;
              if (divsObj && typeof divsObj === 'object') {
                const keys = Object.keys(divsObj);
                if (keys.length > 0) {
                  const latestKey = keys[keys.length - 1];
                  const div = divsObj[latestKey];
                  if (div && div.date) {
                    const dt = new Date(div.date * 1000);
                    const yyyy = dt.getFullYear();
                    const mm = String(dt.getMonth() + 1).padStart(2, '0');
                    const dd = String(dt.getDate()).padStart(2, '0');
                    exDateStr = `${yyyy}/${mm}/${dd}`;
                    exDateTs = div.date;
                    break;
                  }
                }
              }
            } catch {
              // try next symbol
            }
          }

          eventsResult.push({
            symbol: rawSym.toUpperCase(),
            exDate: exDateStr,
            exDateTs,
            amount: openOfficial.cashDps,
            stockDps: openOfficial.stockDps > 0 ? openOfficial.stockDps : undefined,
            type: openOfficial.type,
          });
          return;
        }
      }

      // Check 3: Yahoo Finance div|split API fallback
      let symbolsToTryCheck3: string[] = [rawSym.toUpperCase()];
      if (isTwCode && !rawSym.includes('.')) {
        symbolsToTryCheck3 = [`${cleanSym}.TWO`, `${cleanSym}.TW`];
      }

      const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
      let foundCheck3 = false;

      for (const querySym of symbolsToTryCheck3) {
        if (foundCheck3) break;
        for (const host of hosts) {
          try {
            const url = `https://${host}/v8/finance/chart/${encodeURIComponent(querySym)}?events=div|split&range=2y&interval=1d`;
            const data = await fetchWithTimeout(url, 6000);
            const eventsObj = data?.chart?.result?.[0]?.events;
            const divsObj = eventsObj?.dividends;
            const splitsObj = eventsObj?.splits;

            if ((divsObj && typeof divsObj === 'object') || (splitsObj && typeof splitsObj === 'object')) {
              const dateMap: Record<string, { cashDps: number; stockDps: number; dateTs: number }> = {};

              if (divsObj) {
                Object.keys(divsObj).forEach((k) => {
                  const div = divsObj[k];
                  if (div && div.date && div.amount) {
                    const dt = new Date(div.date * 1000);
                    const yyyy = dt.getFullYear();
                    const mm = String(dt.getMonth() + 1).padStart(2, '0');
                    const dd = String(dt.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}/${mm}/${dd}`;

                    if (!dateMap[dateStr]) dateMap[dateStr] = { cashDps: 0, stockDps: 0, dateTs: div.date };
                    dateMap[dateStr].cashDps = Number(div.amount);
                  }
                });
              }

              if (splitsObj) {
                Object.keys(splitsObj).forEach((k) => {
                  const sp = splitsObj[k];
                  if (sp && sp.date && sp.numerator && sp.denominator) {
                    const num = Number(sp.numerator);
                    const den = Number(sp.denominator);
                    if (num > den && den >= 100) {
                      const stockDps = ((num / den) - 1) * 10;
                      if (stockDps > 0 && stockDps < 10) {
                        const dt = new Date(sp.date * 1000);
                        const yyyy = dt.getFullYear();
                        const mm = String(dt.getMonth() + 1).padStart(2, '0');
                        const dd = String(dt.getDate()).padStart(2, '0');
                        const dateStr = `${yyyy}/${mm}/${dd}`;

                        if (!dateMap[dateStr]) dateMap[dateStr] = { cashDps: 0, stockDps: 0, dateTs: sp.date };
                        dateMap[dateStr].stockDps = Math.round(stockDps * 1000) / 1000;
                      }
                    }
                  }
                });
              }

              Object.entries(dateMap).forEach(([dateStr, info]) => {
                let typeStr = '息';
                if (info.cashDps > 0 && info.stockDps > 0) typeStr = '權息';
                else if (info.stockDps > 0) typeStr = '權';

                eventsResult.push({
                  symbol: rawSym.toUpperCase(),
                  exDate: dateStr,
                  exDateTs: info.dateTs,
                  amount: info.cashDps,
                  stockDps: info.stockDps > 0 ? info.stockDps : undefined,
                  type: typeStr,
                });
              });

              foundCheck3 = true;
              break; // success
            }
          } catch {
            // try next host
          }
        }
      }

      // Check 4: Yahoo Finance Quote API dividendRate fallback
      const hasSymEvent = eventsResult.some(e => e.symbol.toUpperCase() === rawSym.toUpperCase());
      if (!hasSymEvent) {
        let symbolsToTryQuote: string[] = [rawSym.toUpperCase()];
        if (isTwCode && !rawSym.includes('.')) {
          symbolsToTryQuote = [`${cleanSym}.TW`, `${cleanSym}.TWO`];
        }

        for (const s of symbolsToTryQuote) {
          try {
            const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(s)}`;
            const qData = await fetchWithTimeout(url, 4000);
            const qRes = qData?.quoteResponse?.result?.[0];
            if (qRes) {
              const divRate = Number(qRes.trailingAnnualDividendRate || qRes.dividendRate || 0);
              if (divRate > 0) {
                eventsResult.push({
                  symbol: rawSym.toUpperCase(),
                  exDate: '',
                  exDateTs: 0,
                  amount: divRate,
                  type: '息',
                });
                break;
              }
            }
          } catch {
            // ignore
          }
        }
      }

      // Check 5: Fubon Neo / Fugle Market Data API Fallback (富邦新一代 API / Fugle 備援)
      const hasSymEventFinal = eventsResult.some(e => e.symbol.toUpperCase() === rawSym.toUpperCase());
      if (!hasSymEventFinal && isTwCode) {
        const fubonFallback = await fetchFubonFugleDividendFallback(cleanSym);
        if (fubonFallback) {
          eventsResult.push({
            symbol: rawSym.toUpperCase(),
            exDate: fubonFallback.exDate,
            exDateTs: fubonFallback.exDateTs,
            amount: fubonFallback.amount,
            stockDps: fubonFallback.stockDps,
            type: fubonFallback.type,
          });
        }
      }
    })
  );

  // Sort by ex-date descending
  eventsResult.sort((a, b) => b.exDateTs - a.exDateTs);

  res.json({
    success: true,
    fubonNeoBackupActive: !!(process.env.FUBON_API_KEY || process.env.FUGLE_API_KEY),
    events: eventsResult,
  });
});

// 4. Stock Search Endpoint (With Full Traditional Chinese Translation & TWSE/TPEx OpenAPI Lookup)
const US_STOCK_CN_MAP: Record<string, string> = {
  NVDA: 'NVIDIA 輝達',
  TSM: '台積電 ADR',
  AAPL: 'Apple 蘋果',
  MSFT: 'Microsoft 微軟',
  GOOGL: 'Alphabet 谷歌',
  GOOG: 'Alphabet 谷歌 (Class C)',
  AMZN: 'Amazon 亞馬遜',
  META: 'Meta 臉書',
  TSLA: 'Tesla 特斯拉',
  AMD: 'AMD 超微半導體',
  AVGO: 'Broadcom 博通',
  PLTR: 'Palantir 帕蘭提爾',
  SMCI: '超微電腦 Supermicro',
  INTC: 'Intel 英特爾',
  ARM: 'Arm 安謀控股',
  QCOM: 'Qualcomm 高通',
  TXN: '德州儀器 TI',
  MU: 'Micron 美光',
  AMAT: '應用材料 Applied Materials',
  LRCX: '科林研發 Lam Research',
  ASML: '艾司摩爾 ASML',
  KLAC: '科磊 KLA',
  MRVL: '邁威爾 Marvell',
  ADI: '亞德諾半導體 ADI',
  CRWD: 'CrowdStrike',
  PANW: 'Palo Alto 派拓網路',
  FTNT: 'Fortinet 飛塔資訊',
  NOW: 'ServiceNow',
  SNOW: 'Snowflake',
  DDOG: 'Datadog',
  NET: 'Cloudflare',
  COIN: 'Coinbase 加密交易所',
  MSTR: 'MicroStrategy 微策略',
  LLY: 'Eli Lilly 禮來製藥',
  NVO: 'Novo Nordisk 諾和諾德',
  JNJ: 'Johnson & Johnson 強生',
  PFE: 'Pfizer 輝瑞',
  ABBV: 'AbbVie 艾伯維',
  MRK: 'Merck 默克',
  UNH: 'UnitedHealth 聯合健康',
  ISRG: 'Intuitive 直覺外科 (達文西)',
  COST: 'Costco 好市多',
  WMT: 'Walmart 沃爾瑪',
  TGT: 'Target 塔吉特',
  HD: 'Home Depot 家得寶',
  NKE: 'Nike 耐吉',
  SBUX: 'Starbucks 星巴克',
  MCD: "McDonald's 麥當勞",
  KO: 'Coca-Cola 可口可樂',
  PEP: 'PepsiCo 百事可樂',
  PG: 'Procter & Gamble 寶僑',
  DIS: 'Disney 迪士尼',
  NFLX: 'Netflix 網飛',
  CRM: 'Salesforce 賽富時',
  ORCL: 'Oracle 甲骨文',
  IBM: 'IBM 國際商業機器',
  UBER: 'Uber 優步',
  ABNB: 'Airbnb 愛彼迎',
  JPM: 'JPMorgan 摩根大通',
  BAC: 'Bank of America 美國銀行',
  WFC: 'Wells Fargo 富國銀行',
  C: 'Citigroup 花旗集團',
  MS: 'Morgan Stanley 摩根士丹利',
  GS: 'Goldman Sachs 高盛',
  BLK: 'BlackRock 貝萊德',
  V: 'Visa 維薩',
  MA: 'Mastercard 萬事達卡',
  AXP: 'American Express 美國運通',
  PYPL: 'PayPal 貝寶',
  SQ: 'Block (Square)',
  'BRK.B': '波克夏·海瑟威 Berkshire B',
  'BRK.A': '波克夏·海瑟威 Berkshire A',
  XOM: 'ExxonMobil 埃克森美孚',
  CVX: 'Chevron 雪佛龍',
  CAT: 'Caterpillar 卡特彼勒',
  BA: 'Boeing 波音',
  GE: 'GE 奇異航太',
  LMT: 'Lockheed Martin 洛克希德馬丁',
  SPY: 'SPDR 標普500 ETF',
  VOO: 'Vanguard 標普500 ETF',
  IVV: 'iShares 標普500 ETF',
  QQQ: 'Invesco 納斯達克100 ETF',
  QQQM: 'Invesco 納指100 迷你ETF',
  VTI: 'Vanguard 全美市場 ETF',
  VT: 'Vanguard 全球股票 ETF',
  SOXX: 'iShares 費城半導體 ETF',
  SMH: 'VanEck 半導體 ETF',
  IWM: 'iShares 羅素2000 小型股 ETF',
  DIA: 'SPDR 道瓊工業指數 ETF',
  XLK: '科技類股精選 SPDR ETF',
  XLF: '金融類股精選 SPDR ETF',
  XLE: '能源類股精選 SPDR ETF',
  XLV: '生醫保健精選 SPDR ETF',
  TQQQ: 'ProShares 3倍做多納指 ETF',
  SQQQ: 'ProShares 3倍做空納指 ETF',
  SOXL: 'Direxion 3倍做多半導體 ETF',
  SOXS: 'Direxion 3倍做空半導體 ETF',
  NVDL: 'GraniteShares 2倍做多輝達 ETF',
  TSLL: 'Direxion 2倍做多特斯拉 ETF',
  CONY: 'YieldMax Coinbase 期權高息 ETF',
  TSLY: 'YieldMax 特斯拉期權高息 ETF',
  JEPI: 'JPMorgan 股票溢價收益 ETF',
  JEPQ: 'JPMorgan 納斯達克股票溢價 ETF',
  TLT: 'iShares 20年期以上美國公債 ETF',
  IEF: 'iShares 7-10年期美國公債 ETF',
  SHY: 'iShares 1-3年期美國公債 ETF',
  BND: 'Vanguard 總體債券市場 ETF',
  AGG: 'iShares 核心美國總體債券 ETF',
  GLD: 'SPDR 黃金 ETF',
  SLV: 'iShares 白銀 ETF',
  USO: 'United States 原油基金 ETF',
  IBIT: 'iShares 比特幣現貨 ETF',
  FBTC: 'Fidelity 比特幣現貨 ETF',
};

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ success: true, results: [] });

  const upperQ = q.toUpperCase().replace(/\.(TW|TWO)$/i, '');
  const isTwNumeric = /^\d{4,6}[A-Z]?$/i.test(upperQ);

  try {
    // 1. 取得 TWSE / TPEx 官方中文名稱快取
    const openApiMap = await getTwseOpenApiQuotes();
    const candidateMap = new Map<string, { symbol: string; name: string; market: 'tse' | 'otc' | 'us' }>();

    // 2. 比對 TWSE / TPEx 官方快取資料庫（全台股上市公司與上櫃公司）
    openApiMap.forEach((item) => {
      if (item.symbol.endsWith('.TW') || item.symbol.endsWith('.TWO')) return; // 略過帶後綴的鍵
      const symUpper = item.symbol.toUpperCase();
      const sName = item.shortName;

      // 檢查是否符合搜尋條件
      if (
        symUpper === upperQ ||
        sName === q ||
        symUpper.startsWith(upperQ) ||
        sName.startsWith(q) ||
        sName.includes(q) ||
        symUpper.includes(upperQ)
      ) {
        candidateMap.set(symUpper, {
          symbol: symUpper,
          name: item.shortName,
          market: item.market,
        });
      }
    });

    // 3. 同步並行查詢 TWSE MIS (若輸入精確代號但快取中未命中) 與 Yahoo Finance
    const promises: Promise<void>[] = [];

    if (isTwNumeric && !candidateMap.has(upperQ)) {
      promises.push(
        (async () => {
          try {
            const misUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${upperQ}.tw|otc_${upperQ}.tw&_=${Date.now()}`;
            const misData = await fetchWithTimeout(misUrl, 2000);
            const msg = misData?.msgArray?.[0];
            if (msg && msg.c) {
              const realName = (msg.n && msg.n.trim() !== '-' && msg.n.trim() !== '') 
                ? msg.n.trim() 
                : ((msg.nf && msg.nf.trim() !== '-' && msg.nf.trim() !== '') ? msg.nf.trim() : '');
              
              // 僅在 TWSE/TPEx 官方回傳明確股票名稱時才納入，避免無效代碼顯示假標的
              if (realName) {
                const mkt: 'tse' | 'otc' = msg.ex === 'otc' ? 'otc' : 'tse';
                candidateMap.set(msg.c.toUpperCase(), {
                  symbol: msg.c.toUpperCase(),
                  name: realName,
                  market: mkt,
                });
              }
            }
          } catch {
            // ignore
          }
        })()
      );
    }

    promises.push(
      (async () => {
        try {
          const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=zh-Hant-TW&region=TW&quotesCount=15&newsCount=0`;
          const data = await fetchWithTimeout(url, 2500);
          const quotes = data?.quotes || [];

          quotes
            .filter((item: { quoteType?: string }) => item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
            .forEach((item: { symbol: string; shortname?: string; longname?: string }) => {
              let symbol = item.symbol;
              let market: 'tse' | 'otc' | 'us' = 'us';
              if (symbol.endsWith('.TW')) {
                symbol = symbol.slice(0, -3);
                market = 'tse';
              } else if (symbol.endsWith('.TWO')) {
                symbol = symbol.slice(0, -4);
                market = 'otc';
              }

              const cleanSymUpper = symbol.toUpperCase();
              if (candidateMap.has(cleanSymUpper)) return;

              let finalName = item.shortname || item.longname || '';

              if (market === 'tse' || market === 'otc' || /^\d{4,6}[A-Z]?$/i.test(symbol)) {
                const cached = openApiMap.get(cleanSymUpper) || openApiMap.get(`${cleanSymUpper}.TW`) || openApiMap.get(`${cleanSymUpper}.TWO`);
                if (cached && cached.shortName) {
                  finalName = cached.shortName;
                  market = cached.market;
                }
              } else if (market === 'us') {
                if (US_STOCK_CN_MAP[cleanSymUpper]) {
                  finalName = US_STOCK_CN_MAP[cleanSymUpper];
                }
              }

              // 僅在有有效名稱且非無效純代號字串時納入
              if (finalName && finalName !== cleanSymUpper) {
                candidateMap.set(cleanSymUpper, {
                  symbol: cleanSymUpper,
                  name: finalName,
                  market,
                });
              }
            });
        } catch {
          // ignore
        }
      })()
    );

    await Promise.allSettled(promises);

    // 4. 嚴格依照「輸入順序 (Prefix / Sequential Matching)」計算權重排序
    const allCandidates = Array.from(candidateMap.values());

    allCandidates.sort((a, b) => {
      const aSym = a.symbol.toUpperCase();
      const bSym = b.symbol.toUpperCase();
      const aName = a.name;
      const bName = b.name;

      const calcScore = (sym: string, name: string) => {
        // 1. 完全相同
        if (sym === upperQ) return 1000;
        if (name === q) return 950;
        // 2. 代號前綴相同（按照輸入順序比對，如輸入 23 優先匹配 23xx）
        if (sym.startsWith(upperQ)) return 800 - (sym.length - upperQ.length) * 2;
        // 3. 名稱前綴相同
        if (name.startsWith(q)) return 700 - (name.length - q.length);
        // 4. 名稱包含
        const nameIdx = name.indexOf(q);
        if (nameIdx !== -1) return 600 - nameIdx * 10;
        // 5. 代號中間包含
        const symIdx = sym.indexOf(upperQ);
        if (symIdx !== -1) return 400 - symIdx * 10;
        return 0;
      };

      const scoreA = calcScore(aSym, aName);
      const scoreB = calcScore(bSym, bName);

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // 同分時，依代號自然順序升冪排列 (2301, 2303, 2308, 2317, 2330...)
      return aSym.localeCompare(bSym, undefined, { numeric: true });
    });

    res.json({ success: true, results: allCandidates.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Financial News Endpoint
app.get('/api/news', async (_req, res) => {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://tw.stock.yahoo.com/rss')}`;
    const data = await fetchWithTimeout(url, 6000);
    if (data?.status === 'ok' && Array.isArray(data.items)) {
      const items = data.items.slice(0, 15).map((item: { title: string; link: string; pubDate?: string }) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
      }));
      return res.json({ success: true, items });
    }
    res.json({ success: true, items: [] });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message, items: [] });
  }
});

// 6. Intraday or Historical Chart Endpoint
app.get('/api/chart', async (req, res) => {
  const symbol = String(req.query.symbol || '').trim();
  const range = String(req.query.range || '1d');
  const interval = String(req.query.interval || '5m');

  if (!symbol) return res.status(400).json({ success: false, error: 'Symbol required' });

  try {
    const chartRes = await fetchYahooChart(symbol, interval, range, 6000);
    if (!chartRes || !chartRes.rawChart) {
      return res.status(404).json({ success: false, error: 'No chart data' });
    }

    const result = chartRes.rawChart?.chart?.result?.[0];
    if (!result) return res.status(404).json({ success: false, error: 'No chart result' });

    res.json({
      success: true,
      meta: result.meta,
      timestamp: result.timestamp || [],
      quotes: result.indicators?.quote?.[0]?.close || [],
      volumes: result.indicators?.quote?.[0]?.volume || [],
      opens: result.indicators?.quote?.[0]?.open || [],
      highs: result.indicators?.quote?.[0]?.high || [],
      lows: result.indicators?.quote?.[0]?.low || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Helper for generating rule-based analysis fallback when Gemini API key is unconfigured or rate limited
function generateRuleBasedAnalysis(
  portfolio: Array<{ name: string; symbol: string; market: string; shares: number; cost: number; price?: number }> = [],
  totalValue: number | string = 0,
  totalProfit: number | string = 0,
  totalROI: number | string = 0
) {
  const valNum = Number(totalValue) || 0;
  const profitNum = Number(totalProfit) || 0;
  const roiNum = typeof totalROI === 'number' ? totalROI : parseFloat(String(totalROI)) || 0;

  const twCount = (portfolio || []).filter((p) => p.market !== 'us').length;
  const usCount = (portfolio || []).filter((p) => p.market === 'us').length;
  const isGain = profitNum >= 0;

  const topPos = [...(portfolio || [])].sort((a, b) => b.shares * (b.price || b.cost) - a.shares * (a.price || a.cost))[0];
  const topName = topPos ? `${topPos.symbol} ${topPos.name}` : '未配置主攻標的';

  return {
    summary: `投資組合目前總估值約 $${Math.round(valNum).toLocaleString()} TWD，累積報酬率為 ${roiNum.toFixed(1)}% (${isGain ? '獲利中' : '處於回檔狀態'})。持股涵蓋 ${twCount} 檔台股與 ${usCount} 檔美股。`,
    riskRating: roiNum < -15 ? '高風險' : roiNum > 20 ? '低風險' : '中等風險',
    allocationComment: `持股佈局呈現台股 ${twCount} 檔、美股 ${usCount} 檔之跨國配置。最大持股部位為 ${topName}，整體資金集中度尚屬健康，建議持續追蹤企業基本面與大盤輪動情況。`,
    topOpportunities: [
      `最大重倉部位 ${topName} 具備良好市場地位與資產覆蓋力。`,
      `雙市場 (台股/美股) 跨區配置有助分散單一市場非系統性風險。`,
    ],
    riskWarnings: [
      roiNum < 0 ? '當前總部位處於未實現虧損，請密切留意大盤支撐位與停損機制。' : '持股累積獲利良好，注意大盤高點震盪與利多出盡之拉回風險。',
      '匯率波動 (如 USD/TWD) 將直接影響美股部位之換算權益市值。',
    ],
    actionAdvice: '建議維持彈性現金儲備，若關鍵權值股回檔至月線/季線支撐位可分批建倉，並定時檢視停損與止盈目標。',
    timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
  };
}

// Helper for generating rule-based chat fallback when Gemini API key is unconfigured or rate limited
function generateRuleBasedChatReply(
  userMessage: string,
  portfolio: Array<{ name: string; symbol: string; market: string; shares: number; cost: number; price?: number }> = [],
  totalValue: number | string = 0,
  totalProfit: number | string = 0,
  totalROI: number | string = 0
) {
  const msg = userMessage.toLowerCase();
  const valNum = Number(totalValue) || 0;
  const profitNum = Number(totalProfit) || 0;
  const roiNum = typeof totalROI === 'number' ? totalROI : parseFloat(String(totalROI)) || 0;

  const topPos = [...(portfolio || [])].sort((a, b) => b.shares * (b.price || b.cost) - a.shares * (a.price || a.cost))[0];
  const topName = topPos ? `${topPos.symbol} ${topPos.name}` : '目前持股';

  if (msg.includes('風險') || msg.includes('止損') || msg.includes('停損')) {
    return `針對您目前的投資組合（總估值約 $${Math.round(valNum).toLocaleString()} TWD，累積報酬率 ${roiNum.toFixed(1)}%）：\n\n1. **最大部位觀測**：您的重倉標的為 **${topName}**，建議關注大盤技術指標（月線與季線支撐）。\n2. **風控策略**：若單一持股未實現虧損超過 15%，可考慮設好分批停損或轉換至防禦性個股。\n3. **資金管理**：保持 15%~20% 現金儲備，以應對美股與台股大盤的高位震盪。`;
  }

  if (msg.includes('股息') || msg.includes('殖利率') || msg.includes('被動收入')) {
    return `關聯您的持股股息規劃：\n\n1. **台股高股息**：台股 ETF (如 0050、0056 等) 提供穩定現金流，建議除息前檢視填息歷史紀錄。\n2. **美股股息**：美股標的除息時會有 30% 預扣稅，建議計算稅後實際殖利率。\n3. **再投資策略**：將發放之股息持續投入具成長潛力之標的，發揮複利效應！`;
  }

  if (msg.includes('台積電') || msg.includes('2330') || msg.includes('tsm')) {
    return `針對 **台積電 (2330/TSM)** 與半導體板塊分析：\n\n- **基本面**：AI 晶片與先進製程產能滿載，長線產業壁壘極強。\n- **短線觀測**：密切追蹤美股 NVDA/TSM ADR 走勢與外資期貨空單變化。\n- **操盤建議**：長線投資人可視拉回至季線附近分批逢低佈局，短線不盲目追高。`;
  }

  return `您好！我是您的 AI 戰情投資顧問。根據您當前的資產組合（總市值 $${Math.round(valNum).toLocaleString()} TWD，報酬率 ${roiNum.toFixed(1)}%）：\n\n- **持股現況**：您目前佈局了 ${portfolio.length} 檔標的，重倉核心為 **${topName}**。\n- **市場策略**：當前台美股均處於多空交會點，建議依循「汰弱留強、分批佈局」法則。\n\n請問您對哪一檔個股（例如台積電、美股科技股）或哪種操盤策略需要更深入的解析？`;
}

// 7. Gemini AI Portfolio Copilot Endpoint
app.post('/api/ai-analysis', async (req, res) => {
  const { portfolio = [], totalValue = 0, totalProfit = 0, totalROI = 0, indices = [] } = req.body;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        analysis: generateRuleBasedAnalysis(portfolio, totalValue, totalProfit, totalROI),
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `你是一位精通台股與美股的資深首席投資顧問 (Chief Investment Officer)。
請針對用戶目前的持股投資組合進行全方位的「AI 戰情分析診斷」：

【用戶投資組合數據】:
- 總估值 (NT$): ${totalValue}
- 未實現損益 (NT$): ${totalProfit}
- 總報酬率 (%): ${totalROI}%
- 持股明細: ${JSON.stringify(portfolio, null, 2)}
- 國際大盤現況: ${JSON.stringify(indices, null, 2)}

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

    res.json({
      success: true,
      analysis: {
        ...resultJson,
        timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      },
    });
  } catch (error) {
    res.json({
      success: true,
      analysis: generateRuleBasedAnalysis(portfolio, totalValue, totalProfit, totalROI),
    });
  }
});

// 8. Gemini AI Real-time Live Q&A Chat Endpoint
app.post('/api/ai-chat', async (req, res) => {
  const { message = '', history = [], portfolio = [], totalValue = 0, totalProfit = 0, totalROI = 0, indices = [], customApiKey = '' } = req.body;

  try {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        reply: generateRuleBasedChatReply(message, portfolio, totalValue, totalProfit, totalROI),
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contextPrompt = `你是一位講求數據、嚴守風控且極具親和力的資深台美股首席投資顧問。
目前用戶的資產庫狀況如下：
- 總估值: $${totalValue} TWD
- 累積損益: $${totalProfit} TWD (${totalROI}%)
- 持股明細: ${JSON.stringify(portfolio)}
- 大盤指數: ${JSON.stringify(indices)}

【對話歷史】:
${JSON.stringify(history)}

【用戶最新的問題/指示】:
${message}

請以繁體中文回答用戶的問題，給予精準、有建設性且條理分明的操盤建議與市場解讀。請使用清晰的 Markdown 格式 (列表與粗體) 呈現。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: '你是一位精通台股與美股的資深操盤手顧問，請提供即時專業、條理分明且客觀的回答。',
      },
    });

    const reply = response.text || '非常抱歉，目前暫時無法回應您的問題，請稍後再試。';

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    res.json({
      success: true,
      reply: generateRuleBasedChatReply(message, portfolio, totalValue, totalProfit, totalROI),
    });
  }
});

// Vite middleware / static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 資產戰情室 Server running on http://0.0.0.0:${PORT}`);
    // Pre-warm OpenAPI cache in background
    getTwseOpenApiQuotes().catch(() => {});
  });
}

startServer();
