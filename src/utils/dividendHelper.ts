import { StockPosition, MarketType } from '../types';

export interface DividendInfo {
  singleDividendPerShare: number; // 單次每股配息 (e.g. 1.01)
  annualDividendPerShare: number; // 年化每股總配息 (e.g. 4.04)
  stockDps: number; // 股票股利 (配股 元/股, e.g. 0.3 元配股 = 30股/張)
  dividendYieldPct: number; // %
  frequency: '月配息' | '季配息' | '半年配' | '年配息';
  exMonths: number[]; // e.g. [1, 4, 7, 10] for quarterly
  nextExMonthStr: string; // e.g. "2026/09/18" or "2026/09月"
  exactExDate?: string; // YYYY/MM/DD (future upcoming date)
  rawExDate?: string; // Original exact ex-date (whether past or future)
  hasExDatePassed: boolean; // 是否已過除息日
  isUpcomingExDate: boolean; // 是否為尚未除息之未來日期
  passedExDateStr?: string; // 已過除息日字串
  lastBuyDate?: string; // YYYY/MM/DD
  isOfficial?: boolean;
  announcementStatus: 'official' | 'unannounced';
  announcementNote: string;
  singlePayoutTWD: number; // 當次/單季預估可領金額 TWD
  annualIncomeTWD: number; // 全年預估總配息 TWD
  monthlyIncomeTWD: number; // 平均每月折算 TWD
  pendingStockShares: number; // 待撥配股數量
  pendingStockValueTWD: number; // 待撥配股當前市值 TWD
}

export interface KnownDividendProfile {
  annualDps: number; // Dividend per share
  stockDps?: number; // Stock dividend per share (配股 元)
  frequency: '月配息' | '季配息' | '半年配' | '年配息';
  exMonths: number[];
  exactExDate?: string; // YYYY/MM/DD if officially announced
}

export const KNOWN_DIVIDENDS: Record<string, KnownDividendProfile> = {
  // 高股息 ETF
  '0056': { annualDps: 4.2, frequency: '季配息', exMonths: [1, 4, 7, 10] },
  '00878': { annualDps: 4.04, frequency: '季配息', exMonths: [2, 5, 8, 11], exactExDate: '2026/08/18' }, // 00878 Q3 官方最新公告：2026/08/18 除息 (單季 $1.01)
  '00919': { annualDps: 2.8, frequency: '季配息', exMonths: [3, 6, 9, 12], exactExDate: '2026/09/18' },
  '00929': { annualDps: 2.2, frequency: '月配息', exMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], exactExDate: '2026/08/21' },
  '00940': { annualDps: 0.6, frequency: '月配息', exMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  '00713': { annualDps: 3.5, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  '00915': { annualDps: 2.8, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  '00918': { annualDps: 2.8, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  '00934': { annualDps: 1.6, frequency: '月配息', exMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  '00936': { annualDps: 1.2, frequency: '月配息', exMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },

  // 市值型 ETF
  '0050': { annualDps: 5.0, frequency: '半年配', exMonths: [1, 7] },
  '006208': { annualDps: 3.8, frequency: '半年配', exMonths: [7, 11] },

  // 台股權值股 / 金融股 / 傳產及高配股個股
  '2330': { annualDps: 18.0, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  '2317': { annualDps: 5.4, frequency: '年配息', exMonths: [7] },
  '2454': { annualDps: 55.0, frequency: '半年配', exMonths: [1, 7] },
  '6691': { annualDps: 21.0, stockDps: 1.0, frequency: '年配息', exMonths: [8], exactExDate: '2026/08/20' }, // 洋基工程 2026/08/20 除權息：現金 21 元 + 股票 1.0 元 (配股率 10%)
  '6944': { annualDps: 17.0, stockDps: 3.0, frequency: '年配息', exMonths: [7], exactExDate: '2026/07/23' }, // 兆聯實業 2026/07/23 最新除權息：現金 17 元 + 股票 3.0 元
  '1229': { annualDps: 1.8, stockDps: 0.2, frequency: '年配息', exMonths: [7] }, // 聯華：現金 1.8 元 + 股票 0.2 元
  '2881': { annualDps: 2.5, stockDps: 0.5, frequency: '年配息', exMonths: [7] }, // 富邦金
  '2882': { annualDps: 2.8, frequency: '年配息', exMonths: [7] }, // 國泰金
  '2891': { annualDps: 1.8, frequency: '年配息', exMonths: [7] }, // 中信金
  '2886': { annualDps: 1.5, stockDps: 0.3, frequency: '年配息', exMonths: [8] }, // 兆豐金
  '2884': { annualDps: 1.2, stockDps: 0.2, frequency: '年配息', exMonths: [8] }, // 玉山金
  '5880': { annualDps: 0.8, stockDps: 0.25, frequency: '年配息', exMonths: [8] }, // 合庫金
  '2892': { annualDps: 0.85, stockDps: 0.3, frequency: '年配息', exMonths: [8] }, // 第一金
  '2880': { annualDps: 1.2, stockDps: 0.1, frequency: '年配息', exMonths: [8] }, // 華南金
  '2890': { annualDps: 0.75, stockDps: 0.25, frequency: '年配息', exMonths: [8] }, // 永豐金
  '2885': { annualDps: 1.4, frequency: '年配息', exMonths: [7] }, // 元大金
  '2834': { annualDps: 0.2, stockDps: 1.15, frequency: '年配息', exMonths: [8] }, // 臺企銀
  '2603': { annualDps: 10.0, frequency: '年配息', exMonths: [6] },
  '2002': { annualDps: 1.0, frequency: '年配息', exMonths: [7] },
  '1101': { annualDps: 1.2, frequency: '年配息', exMonths: [7] },

  // 美股巨頭與美股 ETF (USD)
  'AAPL': { annualDps: 1.0, frequency: '季配息', exMonths: [2, 5, 8, 11] },
  'NVDA': { annualDps: 0.4, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  'MSFT': { annualDps: 3.0, frequency: '季配息', exMonths: [2, 5, 8, 11] },
  'VOO': { annualDps: 6.8, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  'SPY': { annualDps: 7.2, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  'QQQ': { annualDps: 2.8, frequency: '季配息', exMonths: [3, 6, 9, 12] },
  'SCHD': { annualDps: 2.8, frequency: '季配息', exMonths: [3, 6, 9, 12] },
};

/**
 * 取得單一股票的預估股利與殖利率
 */
export function getStockDividendInfo(
  stock: StockPosition,
  usdTwdRate: number,
  liveEvent?: { exDate?: string; amount?: number; stockDps?: number }
): DividendInfo {
  const symbol = stock.symbol.toUpperCase();
  const currentPrice = typeof stock.price === 'number' && stock.price > 0 ? stock.price : stock.cost;
  const isUS = stock.market === 'us';
  const marketFx = isUS ? usdTwdRate : 1;

  let annualDps = 0;
  let stockDps = 0;
  let frequency: '月配息' | '季配息' | '半年配' | '年配息' = '年配息';
  let exMonths: number[] = [7];

  if (KNOWN_DIVIDENDS[symbol]) {
    const prof = KNOWN_DIVIDENDS[symbol];
    annualDps = prof.annualDps;
    stockDps = prof.stockDps || 0;
    frequency = prof.frequency;
    exMonths = prof.exMonths;
  } else {
    // Smart fallback estimate based on symbol pattern
    if (symbol.startsWith('009') || symbol.startsWith('008') || symbol.startsWith('007')) {
      annualDps = currentPrice * 0.08;
      frequency = '季配息';
      exMonths = [2, 5, 8, 11];
    } else if (symbol.startsWith('005') || symbol.startsWith('006')) {
      annualDps = currentPrice * 0.035;
      frequency = '半年配';
      exMonths = [1, 7];
    } else if (isUS) {
      annualDps = currentPrice * 0.015;
      frequency = '季配息';
      exMonths = [3, 6, 9, 12];
    } else {
      annualDps = 0; // 當官方未公告且非已知清單時，設為 0 元（避免虛構 4% 數字），使用者亦可隨時於卡片校正
      frequency = '年配息';
      exMonths = [7];
    }
  }

  const freqMultiplier = frequency === '月配息' ? 12 : frequency === '季配息' ? 4 : frequency === '半年配' ? 2 : 1;

  // Apply live official event from TWSE OpenAPI if present and user didn't override custom values
  if (liveEvent) {
    if (liveEvent.amount && liveEvent.amount > 0 && !stock.customSingleDps && !stock.customDps) {
      annualDps = liveEvent.amount * freqMultiplier;
    }
    if (typeof liveEvent.stockDps === 'number' && liveEvent.stockDps > 0 && stock.customStockDps === undefined) {
      stockDps = liveEvent.stockDps;
    }
  }

  // Override with user custom single DPS or custom annual DPS if specified
  if (typeof stock.customSingleDps === 'number' && stock.customSingleDps > 0) {
    annualDps = stock.customSingleDps * freqMultiplier;
  } else if (typeof stock.customDps === 'number' && stock.customDps > 0) {
    annualDps = stock.customDps;
  }

  if (typeof stock.customStockDps === 'number') {
    stockDps = stock.customStockDps;
  }

  const singleDps = annualDps / freqMultiplier;
  const dividendYieldPct = currentPrice > 0 ? (annualDps / currentPrice) * 100 : 0;
  const annualIncomeTWD = stock.shares * annualDps * marketFx;
  const singlePayoutTWD = stock.shares * singleDps * marketFx;
  const monthlyIncomeTWD = annualIncomeTWD / 12;

  // Stock dividend calculations (配股計算: 每 1000 股配 stockDps * 100 股 = 每股配 stockDps / 10 股)
  let pendingStockShares = typeof stock.pendingStockShares === 'number'
    ? stock.pendingStockShares
    : stockDps > 0
    ? Math.floor(stock.shares * (stockDps / 10))
    : 0;
  const pendingStockValueTWD = pendingStockShares * currentPrice * marketFx;

  // Calculate next ex-dividend date / month string
  const rawExDate: string | undefined = stock.customExDate || liveEvent?.exDate || KNOWN_DIVIDENDS[symbol]?.exactExDate;
  let exactExDate: string | undefined = rawExDate;
  let lastBuyDate: string | undefined;
  let isOfficial = Boolean(rawExDate);
  let hasExDatePassed = false;
  let isUpcomingExDate = false;
  let passedExDateStr: string | undefined;

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (rawExDate) {
    const exDt = new Date(rawExDate.replace(/\//g, '-'));
    if (!isNaN(exDt.getTime())) {
      if (exDt >= todayMidnight) {
        isOfficial = true;
        isUpcomingExDate = true;
        hasExDatePassed = false;
        const buyDt = new Date(exDt);
        buyDt.setDate(buyDt.getDate() - 1);
        const yyyy = buyDt.getFullYear();
        const mm = String(buyDt.getMonth() + 1).padStart(2, '0');
        const dd = String(buyDt.getDate()).padStart(2, '0');
        lastBuyDate = `${yyyy}/${mm}/${dd}`;
      } else {
        // Ex-date has passed for this event
        exactExDate = undefined;
        isOfficial = false;
        hasExDatePassed = true;
        isUpcomingExDate = false;
        passedExDateStr = rawExDate;
      }
    }
  } else {
    // If no exact date announced, check if past ex-months exist in the current year
    const currentMonth = today.getMonth() + 1; // 1 ~ 12
    const hasPastMonth = exMonths.some((m) => m < currentMonth);
    if (hasPastMonth && singleDps > 0) {
      hasExDatePassed = true;
    }
  }

  const currentMonth = today.getMonth() + 1; // 1 ~ 12
  const nextExM = exMonths.find((m) => m >= currentMonth) || exMonths[0];
  const nextYear = nextExM < currentMonth ? today.getFullYear() + 1 : today.getFullYear();
  const nextExMonthStr = exactExDate ? exactExDate : `${nextYear}/${nextExM < 10 ? '0' : ''}${nextExM}月`;

  const announcementStatus: 'official' | 'unannounced' = isOfficial ? 'official' : 'unannounced';
  const announcementNote = isOfficial
    ? `官方最新公告 (${exactExDate} 除息)`
    : passedExDateStr
    ? `今年度前次已除息 (${passedExDateStr})`
    : `未公布 (依前次每股 $${singleDps.toFixed(2)} 估算)`;

  return {
    singleDividendPerShare: singleDps,
    annualDividendPerShare: annualDps,
    stockDps,
    dividendYieldPct,
    frequency,
    exMonths,
    nextExMonthStr,
    exactExDate,
    rawExDate,
    hasExDatePassed,
    isUpcomingExDate,
    passedExDateStr,
    lastBuyDate,
    isOfficial,
    announcementStatus,
    announcementNote,
    singlePayoutTWD,
    annualIncomeTWD,
    monthlyIncomeTWD,
    pendingStockShares,
    pendingStockValueTWD,
  };
}

export interface PortfolioDividendSummary {
  totalAnnualPassiveIncomeTWD: number;
  totalMonthlyPassiveIncomeTWD: number;
  weightedDividendYieldPct: number;
  totalPendingStockValueTWD: number; // 待撥股票股利總市值
  totalPendingStockShares: number; // 待撥股票股利總股數
  monthlyBreakdown: number[]; // 12 months (0 = Jan, 11 = Dec) in TWD
  upcomingReminders: Array<{
    symbol: string;
    name: string;
    frequency: string;
    nextExMonthStr: string;
    exactExDate?: string;
    lastBuyDate?: string;
    isOfficial?: boolean;
    announcementStatus: 'official' | 'unannounced';
    announcementNote: string;
    singleDps: number;
    stockDps: number;
    estAmountTWD: number;
    pendingStockShares: number;
    pendingStockValueTWD: number;
  }>;
}

/**
 * 計算整體投資組合的年化被動收入與每月分配
 */
export function calculatePortfolioDividends(
  portfolio: StockPosition[],
  usdTwdRate: number,
  officialEvents?: Record<string, { exDate: string; amount: number; stockDps?: number }>
): PortfolioDividendSummary {
  let totalAnnualPassiveIncomeTWD = 0;
  let totalMarketValTWD = 0;
  let totalPendingStockValueTWD = 0;
  let totalPendingStockShares = 0;
  const monthlyBreakdown = new Array(12).fill(0);
  const reminders: PortfolioDividendSummary['upcomingReminders'] = [];

  portfolio.forEach((stock) => {
    const isUS = stock.market === 'us';
    const marketFx = isUS ? usdTwdRate : 1;
    const currentPrice = typeof stock.price === 'number' && stock.price > 0 ? stock.price : stock.cost;
    const stockMarketVal = stock.shares * currentPrice * marketFx;
    totalMarketValTWD += stockMarketVal;

    const liveEv = officialEvents?.[stock.symbol.toUpperCase()];
    const info = getStockDividendInfo(stock, usdTwdRate, liveEv);
    totalAnnualPassiveIncomeTWD += info.annualIncomeTWD;
    totalPendingStockValueTWD += info.pendingStockValueTWD;
    totalPendingStockShares += info.pendingStockShares;

    // Distribute into monthly breakdown
    if (info.exMonths.length > 0) {
      const payoutPerEx = info.annualIncomeTWD / info.exMonths.length;
      info.exMonths.forEach((m) => {
        const monthIdx = m - 1; // 0 ~ 11
        monthlyBreakdown[monthIdx] += payoutPerEx;
      });
    }

    reminders.push({
      symbol: stock.symbol,
      name: stock.name,
      frequency: info.frequency,
      nextExMonthStr: info.nextExMonthStr,
      exactExDate: info.exactExDate,
      lastBuyDate: info.lastBuyDate,
      isOfficial: info.isOfficial,
      announcementStatus: info.announcementStatus,
      announcementNote: info.announcementNote,
      singleDps: info.singleDividendPerShare,
      stockDps: info.stockDps,
      estAmountTWD: info.annualIncomeTWD / (info.exMonths.length || 1),
      pendingStockShares: info.pendingStockShares,
      pendingStockValueTWD: info.pendingStockValueTWD,
    });
  });

  const totalMonthlyPassiveIncomeTWD = totalAnnualPassiveIncomeTWD / 12;
  const weightedDividendYieldPct =
    totalMarketValTWD > 0 ? (totalAnnualPassiveIncomeTWD / totalMarketValTWD) * 100 : 0;

  // Sort upcoming reminders by next ex month
  reminders.sort((a, b) => a.nextExMonthStr.localeCompare(b.nextExMonthStr));

  return {
    totalAnnualPassiveIncomeTWD,
    totalMonthlyPassiveIncomeTWD,
    weightedDividendYieldPct,
    totalPendingStockValueTWD,
    totalPendingStockShares,
    monthlyBreakdown,
    upcomingReminders: reminders,
  };
}
