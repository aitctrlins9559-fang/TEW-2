import { MarketType } from '../types';

export interface StockDictItem {
  symbol: string;
  name: string;
  market: MarketType;
}

export const BUILTIN_STOCK_DICTIONARY: StockDictItem[] = [
  // === 台灣熱門 ETF ===
  { symbol: '0050', name: '元大台灣50', market: 'tse' },
  { symbol: '0056', name: '元大高股息', market: 'tse' },
  { symbol: '00878', name: '國泰永續高股息', market: 'tse' },
  { symbol: '00919', name: '群益台灣精選高息', market: 'tse' },
  { symbol: '00929', name: '復華台灣科技優息', market: 'tse' },
  { symbol: '00940', name: '元大台灣價值高息', market: 'tse' },
  { symbol: '006208', name: '富邦台50', market: 'tse' },
  { symbol: '00713', name: '元大台灣高息低波', market: 'tse' },
  { symbol: '00939', name: '統一台灣高息動能', market: 'tse' },
  { symbol: '00941', name: '中信上游半導體', market: 'tse' },
  { symbol: '00923', name: '群益台ESG低碳50', market: 'tse' },
  { symbol: '00891', name: '中信關鍵半導體', market: 'tse' },
  { symbol: '00881', name: '國泰台灣5G+', market: 'tse' },
  { symbol: '00900', name: '富邦特選高股息30', market: 'tse' },
  { symbol: '00915', name: '凱基優選高股息30', market: 'tse' },
  { symbol: '00918', name: '大華優利高股息30', market: 'tse' },
  { symbol: '00934', name: '中信成長高股息', market: 'tse' },
  { symbol: '00936', name: '台新永續高息中小', market: 'tse' },
  { symbol: '00632R', name: '元大台灣50反1', market: 'tse' },
  { symbol: '00679B', name: '元大美債20年', market: 'tse' },
  { symbol: '00687B', name: '國泰20年美債', market: 'tse' },
  { symbol: '00937B', name: '群益ESG投等債20+', market: 'otc' },

  // === 台股權值股與半導體/AI概念股 (上市 TSE) ===
  { symbol: '2330', name: '台積電', market: 'tse' },
  { symbol: '2317', name: '鴻海', market: 'tse' },
  { symbol: '2454', name: '聯發科', market: 'tse' },
  { symbol: '2308', name: '台達電', market: 'tse' },
  { symbol: '2382', name: '廣達', market: 'tse' },
  { symbol: '3231', name: '緯創', market: 'tse' },
  { symbol: '2376', name: '技嘉', market: 'tse' },
  { symbol: '2356', name: '英業達', market: 'tse' },
  { symbol: '3017', name: '奇鋐', market: 'tse' },
  { symbol: '3324', name: '雙鴻', market: 'tse' },
  { symbol: '6669', name: '緯穎', market: 'tse' },
  { symbol: '3661', name: '世芯-KY', market: 'tse' },
  { symbol: '3443', name: '創意', market: 'tse' },
  { symbol: '2379', name: '瑞昱', market: 'tse' },
  { symbol: '3034', name: '聯詠', market: 'tse' },
  { symbol: '2303', name: '聯電', market: 'tse' },
  { symbol: '3008', name: '大立光', market: 'tse' },
  { symbol: '2357', name: '華碩', market: 'tse' },
  { symbol: '2324', name: '仁寶', market: 'tse' },
  { symbol: '2327', name: '國巨', market: 'tse' },
  { symbol: '2301', name: '光寶科', market: 'tse' },
  { symbol: '2408', name: '南亞科', market: 'tse' },
  { symbol: '2337', name: '旺宏', market: 'tse' },
  { symbol: '2344', name: '華邦電', market: 'tse' },
  { symbol: '3037', name: '欣興', market: 'tse' },
  { symbol: '3189', name: '景碩', market: 'tse' },
  { symbol: '8046', name: '南電', market: 'tse' },
  { symbol: '3035', name: '智原', market: 'tse' },
  { symbol: '2345', name: '智邦', market: 'tse' },
  { symbol: '3711', name: '日月光投控', market: 'tse' },
  { symbol: '6415', name: '矽力*-KY', market: 'tse' },
  { symbol: '6691', name: '洋基工程', market: 'tse' },
  { symbol: '6944', name: '兆聯實業', market: 'tse' },
  { symbol: '2383', name: '台光電', market: 'tse' },
  { symbol: '2368', name: '金像電', market: 'tse' },
  { symbol: '2313', name: '華通', market: 'tse' },
  { symbol: '3036', name: '文曄', market: 'tse' },
  { symbol: '3706', name: '神達', market: 'tse' },
  { symbol: '6213', name: '聯茂', market: 'tse' },
  { symbol: '8210', name: '勤誠', market: 'tse' },
  { symbol: '3013', name: '晟銘電', market: 'tse' },
  { symbol: '3533', name: '嘉澤', market: 'tse' },
  { symbol: '2059', name: '川湖', market: 'tse' },
  { symbol: '3665', name: '貿聯-KY', market: 'tse' },
  { symbol: '6239', name: '力成', market: 'tse' },
  { symbol: '3702', name: '大聯大', market: 'tse' },
  { symbol: '2347', name: '聯強', market: 'tse' },
  { symbol: '2385', name: '群光', market: 'tse' },
  { symbol: '2352', name: '佳世達', market: 'tse' },
  { symbol: '2353', name: '宏碁', market: 'tse' },
  { symbol: '2323', name: '中環', market: 'tse' },

  // === 重電 / 綠能 / 機電 / 電纜 ===
  { symbol: '1513', name: '中興電', market: 'tse' },
  { symbol: '1519', name: '華城', market: 'tse' },
  { symbol: '1503', name: '士電', market: 'tse' },
  { symbol: '1514', name: '亞力', market: 'tse' },
  { symbol: '1504', name: '東元', market: 'tse' },
  { symbol: '2371', name: '大同', market: 'tse' },
  { symbol: '6806', name: '森崴能源', market: 'tse' },
  { symbol: '1605', name: '華新', market: 'tse' },
  { symbol: '1609', name: '太電', market: 'tse' },

  // === 電信 / 傳統產業 / 航運鋼鐵 ===
  { symbol: '2412', name: '中華電', market: 'tse' },
  { symbol: '3045', name: '台灣大', market: 'tse' },
  { symbol: '4904', name: '遠傳', market: 'tse' },
  { symbol: '2603', name: '長榮', market: 'tse' },
  { symbol: '2609', name: '陽明', market: 'tse' },
  { symbol: '2615', name: '萬海', market: 'tse' },
  { symbol: '2618', name: '長榮航', market: 'tse' },
  { symbol: '2610', name: '華航', market: 'tse' },
  { symbol: '2002', name: '中鋼', market: 'tse' },
  { symbol: '1101', name: '台泥', market: 'tse' },
  { symbol: '1301', name: '台塑', market: 'tse' },
  { symbol: '1303', name: '南亞', market: 'tse' },
  { symbol: '1326', name: '台化', market: 'tse' },
  { symbol: '6505', name: '台塑化', market: 'tse' },
  { symbol: '2207', name: '和泰車', market: 'tse' },
  { symbol: '2201', name: '裕隆', market: 'tse' },
  { symbol: '2912', name: '統一超', market: 'tse' },
  { symbol: '1216', name: '統一', market: 'tse' },
  { symbol: '2409', name: '友達', market: 'tse' },
  { symbol: '3481', name: '群創', market: 'tse' },
  { symbol: '1795', name: '美時', market: 'tse' },
  { symbol: '6472', name: '保瑞', market: 'tse' },

  // === 台股金融股 (金控/銀行) ===
  { symbol: '2881', name: '富邦金', market: 'tse' },
  { symbol: '2882', name: '國泰金', market: 'tse' },
  { symbol: '2891', name: '中信金', market: 'tse' },
  { symbol: '2886', name: '兆豐金', market: 'tse' },
  { symbol: '2884', name: '玉山金', market: 'tse' },
  { symbol: '2892', name: '第一金', market: 'tse' },
  { symbol: '2880', name: '華南金', market: 'tse' },
  { symbol: '2885', name: '元大金', market: 'tse' },
  { symbol: '2883', name: '凱基金', market: 'tse' },
  { symbol: '2887', name: '台新金', market: 'tse' },
  { symbol: '5880', name: '合庫金', market: 'tse' },
  { symbol: '2890', name: '永豐金', market: 'tse' },
  { symbol: '5876', name: '上海商銀', market: 'tse' },
  { symbol: '2801', name: '彰銀', market: 'tse' },
  { symbol: '2834', name: '臺企銀', market: 'tse' },
  { symbol: '2888', name: '新光金', market: 'tse' },

  // === 台股熱門上櫃 (OTC) ===
  { symbol: '6488', name: '環球晶', market: 'otc' },
  { symbol: '8299', name: '群聯', market: 'otc' },
  { symbol: '3293', name: '鈊象', market: 'otc' },
  { symbol: '5274', name: '信驊', market: 'otc' },
  { symbol: '3529', name: '力旺', market: 'otc' },
  { symbol: '3131', name: '弘塑', market: 'otc' },
  { symbol: '3583', name: '辛耘', market: 'otc' },
  { symbol: '6187', name: '萬潤', market: 'otc' },
  { symbol: '6223', name: '旺矽', market: 'otc' },
  { symbol: '3374', name: '精材', market: 'otc' },
  { symbol: '5347', name: '世界', market: 'otc' },
  { symbol: '8069', name: '元太', market: 'otc' },
  { symbol: '6274', name: '台燿', market: 'otc' },
  { symbol: '3081', name: '聯亞', market: 'otc' },
  { symbol: '4966', name: '譜瑞-KY', market: 'otc' },
  { symbol: '3680', name: '家登', market: 'otc' },
  { symbol: '6121', name: '新普', market: 'otc' },
  { symbol: '5483', name: '中美晶', market: 'otc' },
  { symbol: '8454', name: '富邦媒', market: 'otc' },
  { symbol: '6643', name: 'M31', market: 'otc' },
  { symbol: '6531', name: '愛普*', market: 'otc' },
  { symbol: '8054', name: '安國', market: 'otc' },
  { symbol: '5425', name: '台半', market: 'otc' },
  { symbol: '5434', name: '崇越', market: 'otc' },

  // === 美股巨頭與熱門 ETF ===
  { symbol: 'NVDA', name: 'NVIDIA 輝達', market: 'us' },
  { symbol: 'TSM', name: '台積電 ADR', market: 'us' },
  { symbol: 'AAPL', name: 'Apple 蘋果', market: 'us' },
  { symbol: 'MSFT', name: 'Microsoft 微軟', market: 'us' },
  { symbol: 'GOOGL', name: 'Alphabet 谷歌', market: 'us' },
  { symbol: 'AMZN', name: 'Amazon 亞馬遜', market: 'us' },
  { symbol: 'META', name: 'Meta 臉書', market: 'us' },
  { symbol: 'TSLA', name: 'Tesla 特斯拉', market: 'us' },
  { symbol: 'AMD', name: 'AMD 超微', market: 'us' },
  { symbol: 'AVGO', name: 'Broadcom 博通', market: 'us' },
  { symbol: 'PLTR', name: 'Palantir', market: 'us' },
  { symbol: 'SMCI', name: '超微電腦', market: 'us' },
  { symbol: 'INTC', name: 'Intel 英特爾', market: 'us' },
  { symbol: 'ARM', name: 'Arm 控股', market: 'us' },
  { symbol: 'COST', name: 'Costco 好市多', market: 'us' },
  { symbol: 'DIS', name: 'Disney 迪士尼', market: 'us' },
  { symbol: 'COIN', name: 'Coinbase', market: 'us' },
  { symbol: 'LLY', name: 'Eli Lilly 禮來', market: 'us' },
  { symbol: 'NVO', name: 'Novo Nordisk 諾和諾德', market: 'us' },
  { symbol: 'CRM', name: 'Salesforce 賽富時', market: 'us' },
  { symbol: 'JPM', name: 'JPMorgan 摩根大通', market: 'us' },
  { symbol: 'BAC', name: 'Bank of America 美國銀行', market: 'us' },
  { symbol: 'WMT', name: 'Walmart 沃爾瑪', market: 'us' },
  { symbol: 'NFLX', name: 'Netflix 網飛', market: 'us' },
  { symbol: 'ORCL', name: 'Oracle 甲骨文', market: 'us' },
  { symbol: 'QQQ', name: 'Invesco QQQ ETF', market: 'us' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'us' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', market: 'us' },
  { symbol: 'VT', name: 'Vanguard Total World ETF', market: 'us' },
  { symbol: 'SOXX', name: 'iShares 半導體 ETF', market: 'us' },
  { symbol: 'TQQQ', name: 'ProShares 3倍做多納指', market: 'us' },
  { symbol: 'SQQQ', name: 'ProShares 3倍做空納指', market: 'us' },
];

/**
 * 依代號或名稱快速檢索台美股中文資訊
 */
export function lookupStockInfo(query: string): StockDictItem | undefined {
  const q = query.trim().toUpperCase();
  if (!q) return undefined;

  // 1. Exact symbol match
  const exactSym = BUILTIN_STOCK_DICTIONARY.find((item) => item.symbol.toUpperCase() === q);
  if (exactSym) return exactSym;

  // 2. Exact name match
  const exactName = BUILTIN_STOCK_DICTIONARY.find((item) => item.name === query.trim());
  if (exactName) return exactName;

  // 3. Partial match
  return BUILTIN_STOCK_DICTIONARY.find(
    (item) => item.symbol.toUpperCase().includes(q) || item.name.includes(query.trim())
  );
}

/**
 * 智慧搜尋股票，優先返回帶有繁體中文名稱的完整項目。
 * 若使用者輸入任意無預置的代號 (如台股數字 1513 或美股英文字母)，自動產生即時選項。
 */
export function searchLocalDictionary(query: string, maxLimit = 10): StockDictItem[] {
  const q = query.trim();
  if (!q) return [];
  const qLower = q.toLowerCase();

  const matches = BUILTIN_STOCK_DICTIONARY.filter(
    (item) => item.symbol.toLowerCase().includes(qLower) || item.name.toLowerCase().includes(qLower)
  );

  const upperQ = q.toUpperCase();
  const hasExactSymbol = matches.some((m) => m.symbol.toUpperCase() === upperQ);

  if (!hasExactSymbol) {
    const isTwCode = /^\d{4,6}[A-Z]?$/i.test(q);
    const isUsTicker = /^[A-Z]{1,5}$/i.test(q) && !isTwCode;

    if (isTwCode) {
      matches.unshift({
        symbol: upperQ,
        name: `搜尋台股 ${upperQ}...`,
        market: 'tse',
      });
    } else if (isUsTicker) {
      matches.push({
        symbol: upperQ,
        name: `搜尋美股 ${upperQ}...`,
        market: 'us',
      });
    }
  }

  return matches.slice(0, maxLimit);
}

