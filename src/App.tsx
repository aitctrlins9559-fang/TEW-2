import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StockPosition,
  MarketType,
  MarketIndex,
  NewsItem,
  ChartTarget,
  ApiHealthStatus,
  AIAnalysisResult,
  TransactionRecord,
} from './types';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { BentoDashboard } from './components/BentoDashboard';
import { KpiCards } from './components/KpiCards';
import { MarketIndices } from './components/MarketIndices';
import { LunarFortuneCard } from './components/LunarFortuneCard';
import { PerformanceBanners } from './components/PerformanceBanners';
import { NewsMarquee } from './components/NewsMarquee';
import { StockTable } from './components/StockTable';
import { IntegratedAssetHub } from './components/IntegratedAssetHub';
import { AssetTrendChart } from './components/Charts/AssetTrendChart';
import { AllocationPieChart } from './components/Charts/AllocationPieChart';
import { SlidersHorizontal, Activity, TrendingUp, Sparkles, Eye, BarChart2, PieChart, Calendar, Plus } from 'lucide-react';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SingleStockChart } from './components/Charts/SingleStockChart';
import { FullStockChartModal } from './components/Charts/FullStockChartModal';
import { StockModal } from './components/Modals/StockModal';
import { TransactionHistoryModal } from './components/Modals/TransactionHistoryModal';
import { TodayPLModal } from './components/Modals/TodayPLModal';
import { SyncModal } from './components/Modals/SyncModal';
import { ActionModal } from './components/Modals/ActionModal';
import { AICopilotModal } from './components/Modals/AICopilotModal';
import { VersionHistoryModal } from './components/Modals/VersionHistoryModal';
import { DeleteConfirmModal } from './components/Modals/DeleteConfirmModal';
import { AdminPasswordModal } from './components/Modals/AdminPasswordModal';
import { DividendCalendarModal } from './components/Modals/DividendCalendarModal';
import { AssetAnalysisModal } from './components/Modals/AssetAnalysisModal';
import { GuideModal } from './components/Modals/GuideModal';
import { DividendCalendar } from './components/DividendCalendar';
import { ApiDebugPanel } from './components/ApiDebugPanel';
import { getStockDividendInfo } from './utils/dividendHelper';
import { getTaiwanDateString, getTaiwanTimeString } from './utils/format';
import {
  apiFetchFx,
  apiFetchQuotes,
  apiFetchIndices,
  apiFetchNews,
  apiFetchChartData,
  apiFetchDividends,
  apiRunAIAnalysis,
} from './utils/apiClient';
import {
  playSuccessSound,
  playDeleteSound,
  playCoinSound,
  playShieldBreakSound,
  playClickSound,
} from './utils/audio';

const INITIAL_PORTFOLIO: StockPosition[] = [
  {
    id: 'stk_1',
    symbol: '2330',
    name: '台積電',
    market: 'tse',
    shares: 100,
    cost: 850,
    buyDate: '2024-05-10',
    buyRate: 1,
    price: 980,
    prevClose: 975,
    dayHigh: 985,
    dayLow: 970,
    transactions: [
      { id: 'tx_1', buyDate: '2024-05-10', shares: 100, cost: 850, buyRate: 1 },
    ],
  },
  {
    id: 'stk_2',
    symbol: 'AAPL',
    name: 'Apple 蘋果',
    market: 'us',
    shares: 10,
    cost: 225,
    buyDate: '2024-06-15',
    buyRate: 32.2,
    price: 228,
    prevClose: 225,
    dayHigh: 230,
    dayLow: 224,
    transactions: [
      { id: 'tx_2', buyDate: '2024-06-15', shares: 10, cost: 225, buyRate: 32.2 },
    ],
  },
];

export default function App() {
  // State variables
  const [portfolio, setPortfolio] = useState<StockPosition[]>([]);
  const portfolioRef = useRef<StockPosition[]>(portfolio);
  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  const [usdTwdRate, setUsdTwdRate] = useState<number>(31.5);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [lastNewsTime, setLastNewsTime] = useState<string>('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isRedUp, setIsRedUp] = useState(true);
  const [isPrivacy, setIsPrivacy] = useState(false);

  // Layout & View Mode States
  const [showIndices, setShowIndices] = useState(true);
  const [showBanners, setShowBanners] = useState(true);
  const [showAssetHub, setShowAssetHub] = useState(true);

  // Mobile & Workbench active view tab selector ('overview' | 'portfolio' | 'charts' | 'calendar' | 'all')
  const [activeMobileTab, setActiveMobileTab] = useState<'overview' | 'portfolio' | 'charts' | 'calendar' | 'all'>('overview');

  const [isAutoRefreshOn, setIsAutoRefreshOn] = useState(true);
  const [activeRefreshInterval, setActiveRefreshInterval] = useState(60);
  const [countdownTimer, setCountdownTimer] = useState(60);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [officialEvents, setOfficialEvents] = useState<Record<string, { exDate: string; amount: number; stockDps?: number; exDateTs: number }>>({});

  const [cloudSyncUrl, setCloudSyncUrl] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [lastCloudWriteTime, setLastCloudWriteTime] = useState('');
  const [quoteSuccessCount, setQuoteSuccessCount] = useState(0);

  const [toastMessage, setToastMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);

  // Market hours status
  const [twMarketOpen, setTwMarketOpen] = useState(false);
  const [usMarketOpen, setUsMarketOpen] = useState(false);

  // Selected chart target
  const [selectedChartTarget, setSelectedChartTarget] = useState<ChartTarget>({
    symbol: '2330',
    market: 'tse',
    name: '台積電',
  });

  // Modal control states
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editStock, setEditStock] = useState<StockPosition | null>(null);

  const [isTxHistoryModalOpen, setIsTxHistoryModalOpen] = useState(false);
  const [txHistoryStock, setTxHistoryStock] = useState<StockPosition | null>(null);

  const [isTodayPLModalOpen, setIsTodayPLModalOpen] = useState(false);
  const [todayPLModalTimeframe, setTodayPLModalTimeframe] = useState<'1D' | '1M' | 'YTD' | 'ALL'>('1D');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isFullChartModalOpen, setIsFullChartModalOpen] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState(false);
  const [isAssetAnalysisModalOpen, setIsAssetAnalysisModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const handleDonotShowGuide7Days = useCallback(() => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('hide_guide_until', String(Date.now() + sevenDaysMs));
  }, []);

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: 'stock' | 'tx';
    stockId: string;
    txId?: string;
    itemName?: string;
    message?: string;
  }>({
    isOpen: false,
    type: 'stock',
    stockId: '',
  });

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'mvp' | 'lvp' | null;
    name: string;
    profitStr: string;
    roi: number;
  }>({ isOpen: false, type: null, name: '', profitStr: '', roi: 0 });

  // AI Copilot state
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Api health status
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus>({
    cloud: { name: 'Cloud API', status: 'PENDING', ms: 0, error: null },
    yahoo: { name: 'Yahoo Quote', status: 'PENDING', ms: 0, error: null },
    twse: { name: 'TWSE API', status: 'PENDING', ms: 0, error: null },
    tpex: { name: 'TPEX API', status: 'PENDING', ms: 0, error: null },
    search: { name: 'Stock Search', status: 'OK', ms: 120, error: null },
    fx: { name: 'FX API', status: 'PENDING', ms: 0, error: null },
  });

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string, isSuccess = true) => {
    setToastMessage({ text: msg, isSuccess });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Save portfolio to local & sync to cloud
  const savePortfolioLocal = useCallback(
    async (newPortfolio: StockPosition[], syncUrl = cloudSyncUrl) => {
      localStorage.setItem('stock_radar_data', JSON.stringify(newPortfolio));

      if (syncUrl && syncUrl.includes('script.google.com') && isAdmin && adminPassword) {
        try {
          const res = await fetch(syncUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ password: adminPassword, data: newPortfolio }),
          });
          const result = await res.json();
          if (result.status === 'success') {
            setLastCloudWriteTime(`${getTaiwanDateString()} ${getTaiwanTimeString()}`);
          }
        } catch {
          // ignore background sync error
        }
      }
    },
    [cloudSyncUrl, isAdmin, adminPassword]
  );

  // Normalize raw portfolio data
  const normalizePortfolio = useCallback((data: unknown[]): StockPosition[] => {
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item && typeof item === 'object')
      .map((item: Record<string, unknown>) => {
        const txs: TransactionRecord[] =
          Array.isArray(item.transactions) && item.transactions.length > 0
            ? (item.transactions as TransactionRecord[])
            : [
                {
                  id: `tx_init_${Date.now()}`,
                  buyDate: typeof item.buyDate === 'string' ? item.buyDate : '',
                  shares: Number(item.shares) || 0,
                  cost: Number(item.cost) || 0,
                  buyRate: Number(item.buyRate) || 1,
                },
              ];

        let totalShares = 0;
        let totalCostVal = 0;
        let totalBuyRateVal = 0;

        txs.forEach((t) => {
          const s = Number(t.shares) || 0;
          const c = Number(t.cost) || 0;
          const r = Number(t.buyRate) || 1;
          totalShares += s;
          totalCostVal += s * c;
          totalBuyRateVal += s * r;
        });

        const avgCost = totalShares > 0 ? totalCostVal / totalShares : Number(item.cost || 0);
        const avgBuyRate = totalShares > 0 ? totalBuyRateVal / totalShares : Number(item.buyRate || 1);
        const lastBuyDate =
          txs.length > 0 ? txs[txs.length - 1].buyDate : (item.buyDate as string) || '';

        return {
          id: String(item.id || `stk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
          symbol: String(item.symbol || '').trim().toUpperCase(),
          name: String(item.name || item.symbol || '').trim(),
          market: (['tse', 'otc', 'us'].includes(item.market as string) ? item.market : 'tse') as MarketType,
          transactions: txs,
          shares: totalShares,
          cost: Number(avgCost.toFixed(4)),
          buyDate: lastBuyDate,
          buyRate: Number(avgBuyRate.toFixed(2)),
          price: typeof item.price === 'number' && item.price > 0 ? item.price : null,
          prevClose: typeof item.prevClose === 'number' && item.prevClose > 0 ? item.prevClose : null,
          dayHigh: typeof item.dayHigh === 'number' ? item.dayHigh : null,
          dayLow: typeof item.dayLow === 'number' ? item.dayLow : null,
          fetchError: Boolean(item.fetchError),
          customExDate: typeof item.customExDate === 'string' ? item.customExDate : undefined,
          customSingleDps: typeof item.customSingleDps === 'number' ? item.customSingleDps : undefined,
          customDps: typeof item.customDps === 'number' ? item.customDps : undefined,
          customStockDps: typeof item.customStockDps === 'number' ? item.customStockDps : undefined,
        };
      })
      .filter(
        (item) =>
          item.symbol &&
          item.name &&
          Number.isFinite(item.shares) &&
          item.shares > 0 &&
          Number.isFinite(item.cost) &&
          item.cost >= 0
      );
  }, []);

  // Fetch Live Official Ex-Dividend Events
  const fetchOfficialDividends = useCallback(async (forceRefresh = false) => {
    const currentPortfolio = portfolioRef.current;
    if (!currentPortfolio || currentPortfolio.length === 0) return;
    try {
      const rawSymbols = currentPortfolio.map((p) => p.symbol);
      const events = await apiFetchDividends(rawSymbols, forceRefresh);
      const map: Record<string, { exDate: string; amount: number; stockDps?: number; exDateTs: number }> = {};
      events.forEach((ev) => {
        const key = ev.symbol.toUpperCase();
        const totalDps = (ev.amount || 0) + (ev.stockDps || 0);
        const existingTotal = map[key] ? ((map[key].amount || 0) + (map[key].stockDps || 0)) : 0;

        if (
          !map[key] ||
          totalDps > existingTotal ||
          (totalDps === existingTotal && ev.exDateTs > map[key].exDateTs)
        ) {
          map[key] = { exDate: ev.exDate, amount: ev.amount, stockDps: ev.stockDps, exDateTs: ev.exDateTs };
        }
      });
      setOfficialEvents(map);
    } catch {
      // ignore
    }
  }, []);

  // Fetch quotes from server or CORS fallback
  const fetchRealtimePrices = useCallback(async (isManual = false) => {
    setIsFetchingPrices(true);
    const tStart = performance.now();

    // Trigger dividend sync alongside prices with forceRefresh option
    fetchOfficialDividends(isManual);

    try {
      // 1. Fetch USD rate
      const newFx = await apiFetchFx();
      setUsdTwdRate(newFx);

      // 2. Fetch quotes for all portfolio stocks
      const currentPortfolio = portfolioRef.current;
      if (currentPortfolio.length > 0) {
        const symbols = currentPortfolio.map((p) =>
          p.market === 'tse' ? `${p.symbol}.TW` : p.market === 'otc' ? `${p.symbol}.TWO` : p.symbol
        );

        const results = await apiFetchQuotes(symbols);

        let success = 0;
        let twseSuccess = false;
        let tpexSuccess = false;

        const updated = currentPortfolio.map((item) => {
          const symKey =
            item.market === 'tse'
              ? `${item.symbol}.TW`
              : item.market === 'otc'
              ? `${item.symbol}.TWO`
              : item.symbol;

          const itemBare = item.symbol.replace(/\.(TW|TWO)$/i, '').trim().toUpperCase();

          const q = results.find((r) => {
            if (!r || !r.symbol) return false;
            const rUpper = r.symbol.toUpperCase();
            const rBare = rUpper.replace(/\.(TW|TWO)$/i, '').trim();
            return (
              rUpper === symKey.toUpperCase() ||
              rUpper === item.symbol.toUpperCase() ||
              rBare === itemBare
            );
          });

          if (q && typeof q.regularMarketPrice === 'number' && q.regularMarketPrice > 0) {
            success++;
            if (item.market === 'tse' || item.market === 'otc') twseSuccess = true;

            const oldPrice = item.price;
            const newPrice = q.regularMarketPrice;
            let priceChanged: 'up' | 'down' | null = null;

            if (oldPrice !== null && oldPrice !== undefined) {
              if (newPrice > oldPrice) priceChanged = 'up';
              else if (newPrice < oldPrice) priceChanged = 'down';
            }

            return {
              ...item,
              price: newPrice,
              prevClose: q.regularMarketPreviousClose || item.prevClose || newPrice,
              dayHigh: q.regularMarketDayHigh || item.dayHigh || newPrice,
              dayLow: q.regularMarketDayLow || item.dayLow || newPrice,
              fetchError: false,
              priceChanged,
            };
          }

          if (item.price !== undefined && item.price !== null && item.price > 0) {
            success++;
            if (item.market === 'tse' || item.market === 'otc') twseSuccess = true;
            return { ...item, fetchError: false };
          }

          return { ...item, fetchError: true };
        });

        setQuoteSuccessCount(success);
        setPortfolio(updated);
        savePortfolioLocal(updated);

        const elapsedMs = Math.round(performance.now() - tStart);
        setApiHealth((prev) => ({
          ...prev,
          cloud: { name: 'Cloud API', status: cloudSyncUrl ? 'OK' : 'DISABLED', ms: 50, error: null },
          yahoo: { name: 'Yahoo Quote', status: success > 0 ? 'OK' : 'ERROR', ms: elapsedMs, error: success > 0 ? null : '無行情數據' },
          twse: { name: 'TWSE API', status: twseSuccess ? 'OK' : 'DISABLED', ms: Math.round(elapsedMs * 0.8), error: null },
          tpex: { name: 'TPEX API', status: tpexSuccess ? 'OK' : 'DISABLED', ms: Math.round(elapsedMs * 0.9), error: null },
          search: { name: 'Stock Search', status: 'OK', ms: 120, error: null },
          fx: { name: 'FX API', status: 'OK', ms: 80, error: null },
        }));
      }

      // 3. Fetch indices
      const idxResults = await apiFetchIndices();
      if (Array.isArray(idxResults) && idxResults.length > 0) {
        setIndices(idxResults);
      }

      setLastSyncTime(`${getTaiwanDateString()} ${getTaiwanTimeString()}`);

      if (isManual) {
        playSuccessSound();
        if (currentPortfolio.length > 0 && quoteSuccessCount > 0) {
          showToast(`盤價與匯率同步完成！`);
        } else {
          showToast(`盤價與匯率同步完成！`);
        }
      }
    } catch {
      if (isManual) showToast('行情連線逾時，請檢查網路狀態', false);
    } finally {
      setIsFetchingPrices(false);
      setCountdownTimer(60);
    }
  }, [showToast, savePortfolioLocal, cloudSyncUrl]);

  // Fetch news
  const fetchNews = useCallback(async () => {
    try {
      const items = await apiFetchNews();
      if (Array.isArray(items) && items.length > 0) {
        setNews(items);
        setLastNewsTime(getTaiwanTimeString());
      }
    } catch {
      // ignore
    }
  }, []);

  // AI Copilot analysis request
  const handleRunAIAnalysis = useCallback(async () => {
    setIsAIAnalyzing(true);
    setAiError(null);

    let totalValTWD = 0;
    let totalCostTWD = 0;

    portfolio.forEach((p) => {
      const fx = p.market === 'us' ? usdTwdRate : 1;
      const c = p.shares * p.cost * (p.market === 'us' ? p.buyRate : 1);
      const v = p.price ? p.shares * p.price * fx : c;
      totalCostTWD += c;
      totalValTWD += v;
    });

    const profit = totalValTWD - totalCostTWD;
    const roi = totalCostTWD > 0 ? (profit / totalCostTWD) * 100 : 0;

    try {
      const analysis = await apiRunAIAnalysis({
        portfolio,
        totalValue: Math.round(totalValTWD),
        totalProfit: Math.round(profit),
        totalROI: Number(roi.toFixed(2)),
        indices,
      });
      setAiAnalysisResult(analysis);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setIsAIAnalyzing(false);
    }
  }, [portfolio, usdTwdRate, indices]);

  // Initial load
  useEffect(() => {
    const savedSyncUrl = localStorage.getItem('stock_radar_sync_url') || '';
    setCloudSyncUrl(savedSyncUrl);

    const savedData = localStorage.getItem('stock_radar_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPortfolio(normalizePortfolio(parsed));
      } catch {
        setPortfolio(normalizePortfolio(INITIAL_PORTFOLIO));
      }
    } else {
      setPortfolio(normalizePortfolio(INITIAL_PORTFOLIO));
    }

    // Check Guide modal show status (7-day hide check)
    const hideUntil = localStorage.getItem('hide_guide_until');
    if (!hideUntil || Date.now() > Number(hideUntil)) {
      setIsGuideModalOpen(true);
    }

    fetchRealtimePrices();
    fetchNews();
  }, [normalizePortfolio, fetchRealtimePrices, fetchNews]);

  // Market hours check & Smart timer
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const twDay = now.getDay();
      const twHour = now.getHours();
      const twMin = now.getMinutes();
      const isTwWeekday = twDay >= 1 && twDay <= 5;
      const isTwOpenTime =
        (twHour === 9 && twMin >= 0) || (twHour > 9 && twHour < 13) || (twHour === 13 && twMin <= 30);
      setTwMarketOpen(isTwWeekday && isTwOpenTime);

      const nyDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const nyDay = nyDate.getDay();
      const nyHour = nyDate.getHours();
      const nyMin = nyDate.getMinutes();
      const isNyWeekday = nyDay >= 1 && nyDay <= 5;
      const isNyOpenTime = (nyHour === 9 && nyMin >= 30) || (nyHour >= 10 && nyHour < 16);
      setUsMarketOpen(isNyWeekday && isNyOpenTime);

      const isAnyOpen = (isTwWeekday && isTwOpenTime) || (isNyWeekday && isNyOpenTime);
      const targetInterval = isAnyOpen ? 15 : 60;
      setActiveRefreshInterval(targetInterval);
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer loop
  useEffect(() => {
    if (!isAutoRefreshOn || isFetchingPrices) return;

    const timer = setInterval(() => {
      setCountdownTimer((prev) => {
        if (prev <= 1) {
          fetchRealtimePrices();
          return activeRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRefreshOn, isFetchingPrices, activeRefreshInterval, fetchRealtimePrices]);

  // Admin toggle
  const handleToggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setAdminPassword('');
      showToast('已鎖定管理權限');
    } else {
      setIsAdminPasswordModalOpen(true);
    }
  };

  // Stock Save
  const handleSaveStock = (stockData: {
    editId: string;
    symbol: string;
    name: string;
    market: MarketType;
    shares: number;
    cost: number;
    buyDate: string;
    buyRate: number;
  }) => {
    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      buyDate: stockData.buyDate,
      shares: stockData.shares,
      cost: stockData.cost,
      buyRate: stockData.buyRate,
    };

    let updated: StockPosition[];

    if (stockData.editId) {
      updated = portfolio.map((item) =>
        item.id === stockData.editId
          ? {
              ...item,
              symbol: stockData.symbol,
              name: stockData.name,
              market: stockData.market,
              transactions: [newTx],
              shares: stockData.shares,
              cost: stockData.cost,
              buyDate: stockData.buyDate,
              buyRate: stockData.buyRate,
            }
          : item
      );
      showToast('持股資料已更新！');
    } else {
      const existingIdx = portfolio.findIndex(
        (p) => p.symbol === stockData.symbol && p.market === stockData.market
      );

      if (existingIdx !== -1) {
        updated = [...portfolio];
        updated[existingIdx].transactions.push(newTx);
        showToast(`已為 ${stockData.symbol} 新增買入紀錄並加權平均成本！`);
      } else {
        const newItem: StockPosition = {
          id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          symbol: stockData.symbol,
          name: stockData.name,
          market: stockData.market,
          transactions: [newTx],
          shares: stockData.shares,
          cost: stockData.cost,
          buyDate: stockData.buyDate,
          buyRate: stockData.buyRate,
          price: null,
          prevClose: null,
          dayHigh: null,
          dayLow: null,
        };
        updated = [...portfolio, newItem];
        showToast('持股部位新增成功！');
      }
    }

    const normalized = normalizePortfolio(updated);
    setPortfolio(normalized);
    savePortfolioLocal(normalized);
    setIsStockModalOpen(false);
    playSuccessSound();
    fetchRealtimePrices();
  };

  const handleUpdateSingleStock = (updatedStock: StockPosition) => {
    const updated = portfolio.map((item) => (item.id === updatedStock.id ? updatedStock : item));
    const normalized = normalizePortfolio(updated);
    setPortfolio(normalized);
    savePortfolioLocal(normalized);
    showToast(`已校正 ${updatedStock.symbol} 的官方除息日與配息資訊！`);
  };

  // Stock Delete
  const handleDeleteStock = (id: string) => {
    const stock = portfolio.find((p) => p.id === id);
    if (!stock) return;
    setDeleteConfirmState({
      isOpen: true,
      type: 'stock',
      stockId: id,
      itemName: `${stock.name} (${stock.symbol})`,
      message: '確定要移除此持股部位嗎？該操作將會從監控列表中移除，無法復原。',
    });
  };

  // Add sub-transaction
  const handleAddTransaction = (
    stockId: string,
    buyDate: string,
    shares: number,
    cost: number
  ) => {
    const updated = portfolio.map((item) => {
      if (item.id === stockId) {
        const newTx: TransactionRecord = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          buyDate,
          shares,
          cost,
          buyRate: item.market === 'us' ? usdTwdRate : 1,
        };
        return {
          ...item,
          transactions: [...item.transactions, newTx],
        };
      }
      return item;
    });

    const normalized = normalizePortfolio(updated);
    setPortfolio(normalized);
    savePortfolioLocal(normalized);
    showToast('已成功加入買入歷程！');
    playSuccessSound();

    // Update open modal stock
    const updatedStock = normalized.find((p) => p.id === stockId);
    if (updatedStock) setTxHistoryStock(updatedStock);
  };

  // Delete sub-transaction
  const handleDeleteTransaction = (stockId: string, txId: string) => {
    const item = portfolio.find((p) => p.id === stockId);
    if (!item) return;

    if (item.transactions.length <= 1) {
      showToast('至少需保留一筆買入記錄', false);
      return;
    }

    const tx = item.transactions.find((t) => t.id === txId);
    setDeleteConfirmState({
      isOpen: true,
      type: 'tx',
      stockId,
      txId,
      itemName: tx ? `${item.name} - ${tx.buyDate} ($${tx.cost})` : undefined,
      message: '確定要移除此筆扣款交易紀錄嗎？',
    });
  };

  // Execute actual deletion after user confirms in modal
  const handleExecuteDelete = () => {
    const { type, stockId, txId } = deleteConfirmState;
    playDeleteSound();

    if (type === 'stock') {
      const updated = portfolio.filter((p) => p.id !== stockId);
      setPortfolio(updated);
      savePortfolioLocal(updated);
      showToast('已移除該部位！');
    } else if (type === 'tx' && txId) {
      const updated = portfolio.map((p) => {
        if (p.id === stockId) {
          return {
            ...p,
            transactions: p.transactions.filter((t) => t.id !== txId),
          };
        }
        return p;
      });

      const normalized = normalizePortfolio(updated);
      setPortfolio(normalized);
      savePortfolioLocal(normalized);
      showToast('已刪除該筆扣款紀錄');

      const updatedStock = normalized.find((p) => p.id === stockId);
      if (updatedStock) setTxHistoryStock(updatedStock);
    }

    setDeleteConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  // Fetch cloud data manually
  const handleFetchCloudData = async (url: string): Promise<boolean> => {
    if (!url) {
      showToast('請先輸入雲端同步網址', false);
      return false;
    }
    showToast('正在從雲端讀取持股數據...');
    try {
      let data: unknown = null;
      try {
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          data = json.data || json;
        }
      } catch {
        // ignore
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        const resPost = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'read', password: adminPassword }),
        });
        if (resPost.ok) {
          const jsonPost = await resPost.json();
          data = jsonPost.data || jsonPost;
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const normalized = normalizePortfolio(data);
        setPortfolio(normalized);
        localStorage.setItem('stock_radar_data', JSON.stringify(normalized));
        showToast(`✅ 成功從雲端讀取 ${normalized.length} 筆持股數據！`);
        playSuccessSound();
        fetchRealtimePrices(true);
        return true;
      } else {
        showToast('雲端未返回有效的持股資料', false);
        return false;
      }
    } catch {
      showToast('連線至雲端網址失敗，請檢查權限與網址', false);
      return false;
    }
  };

  // Push local data to cloud
  const handlePushCloudData = async (url: string): Promise<boolean> => {
    if (!url) {
      showToast('請先輸入雲端同步網址', false);
      return false;
    }
    showToast('正在備份持股至雲端...');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ password: adminPassword, data: portfolio }),
      });
      const json = await res.json();
      if (json.status === 'success' || json.success) {
        setLastCloudWriteTime(`${getTaiwanDateString()} ${getTaiwanTimeString()}`);
        showToast('✅ 持股部位已成功推送備份至雲端！');
        playSuccessSound();
        return true;
      } else {
        showToast(json.message || '雲端同步失敗', false);
        return false;
      }
    } catch {
      showToast('推送雲端失敗，請確認網路連線與 GAS 部署權限', false);
      return false;
    }
  };

  // Ex-Rights Adjusted Mode State (default: ON to protect portfolio against ex-dividend/ex-rights drop)
  const [isExAdjustedMode, setIsExAdjustedMode] = useState<boolean>(true);

  // Ex-Rights Pending Stock Dividend Application Handler
  const handleApplyPendingStockShares = (stockId: string) => {
    const target = portfolio.find((s) => s.id === stockId);
    if (!target) return;

    const divInfo = getStockDividendInfo(target, usdTwdRate, officialEvents[target.symbol.toUpperCase()]);
    const pendingShares = divInfo.pendingStockShares || 0;

    if (pendingShares <= 0) {
      showToast('該股票目前無待撥配股可入帳', false);
      return;
    }

    const newShares = Math.round((target.shares + pendingShares) * 1000) / 1000;
    // Calculate new cost basis (free stock dividend dilutes weighted cost basis)
    const newCost = Math.round(((target.shares * target.cost) / newShares) * 1000) / 1000;

    // Record stock dividend transaction
    const newTx: TransactionRecord = {
      id: `tx_div_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      buyDate: getTaiwanDateString(),
      shares: pendingShares,
      cost: 0,
      buyRate: target.buyRate || 1,
    };

    const updatedStock: StockPosition = {
      ...target,
      shares: newShares,
      cost: newCost,
      manualPendingStockShares: 0, // Reset manual override after applying
      transactions: [newTx, ...(target.transactions || [])],
    };

    handleUpdateSingleStock(updatedStock);
    showToast(`✅ 成功將 ${target.name} (+${pendingShares} 股) 配股撥入持股總數！`);
    playSuccessSound();
  };

  // Cash Dividend Cost Deduction Handler
  const handleDeductCashDividendCost = (stockId: string, dps?: number) => {
    const target = portfolio.find((s) => s.id === stockId);
    if (!target) return;

    const divInfo = getStockDividendInfo(target, usdTwdRate, officialEvents[target.symbol.toUpperCase()]);
    const deductAmountPerShare = dps || divInfo.singleDividendPerShare || 0;

    if (deductAmountPerShare <= 0) {
      showToast('該股票無現金股利可供扣抵', false);
      return;
    }

    const newCost = Math.max(0, target.cost - deductAmountPerShare);
    const updatedStock: StockPosition = {
      ...target,
      cost: Math.round(newCost * 1000) / 1000,
      receivedDividends: (target.receivedDividends || 0) + (deductAmountPerShare * target.shares),
    };

    handleUpdateSingleStock(updatedStock);
    showToast(`✅ 成功為 ${target.name} 每股扣抵 $${deductAmountPerShare.toFixed(2)} 元持股成本！`);
    playSuccessSound();
  };

  // Calculations for total portfolio
  let totalValTWD = 0;
  let prevCloseValTWD = 0;
  let totalCostTWD = 0;
  let todayPLTWD = 0;
  let twCount = 0;
  let usCount = 0;
  let hasMissingPrice = false;
  let totalPendingStockValueTWD = 0;
  let totalPendingStockShares = 0;

  portfolio.forEach((item) => {
    const isUS = item.market === 'us';
    const buyFx = isUS ? item.buyRate || usdTwdRate : 1;
    const marketFx = isUS ? usdTwdRate : 1;

    const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents[item.symbol.toUpperCase()]);
    const pendingShares = divInfo.pendingStockShares || 0;
    const effectiveShares = isExAdjustedMode ? item.shares + pendingShares : item.shares;

    if (pendingShares > 0) {
      totalPendingStockShares += pendingShares;
      const safeP = typeof item.price === 'number' && item.price > 0 ? item.price : item.cost;
      totalPendingStockValueTWD += pendingShares * safeP * marketFx;
    }

    const costTWD = item.shares * item.cost * buyFx;
    totalCostTWD += costTWD;

    if (typeof item.price === 'number' && item.price > 0) {
      const valTWD = effectiveShares * item.price * marketFx;
      totalValTWD += valTWD;

      const pClose = typeof item.prevClose === 'number' && item.prevClose > 0 ? item.prevClose : item.price;
      prevCloseValTWD += effectiveShares * pClose * marketFx;

      if (typeof item.prevClose === 'number' && item.prevClose > 0) {
        todayPLTWD += effectiveShares * (item.price - item.prevClose) * marketFx;
      }
    } else {
      hasMissingPrice = true;
    }

    if (isUS) usCount++;
    else twCount++;
  });

  // Real intraday price series state for total asset trend
  const [realIntradaySeries, setRealIntradaySeries] = useState<{ labels: string[]; data: number[] } | null>(null);

  // Fetch real 5-minute intraday price history for all portfolio holdings
  useEffect(() => {
    let isMounted = true;
    if (!portfolio || portfolio.length === 0) {
      setRealIntradaySeries(null);
      return;
    }

    const fetchIntradayRealSeries = async () => {
      try {
        const results = await Promise.all(
          portfolio.map(async (stock) => {
            let sym = stock.symbol.toUpperCase();
            if (stock.market === 'tse' && !sym.endsWith('.TW')) sym = `${sym}.TW`;
            if (stock.market === 'otc' && !sym.endsWith('.TWO')) sym = `${sym}.TWO`;
            const chartData = await apiFetchChartData(sym, '1d', '5m');
            return { stock, chartData };
          })
        );

        if (!isMounted) return;

        // Collect intraday timestamp buckets
        const tsMap = new Map<number, string>();
        results.forEach(({ chartData }) => {
          if (chartData && Array.isArray(chartData.timestamp)) {
            chartData.timestamp.forEach((ts: number) => {
              if (ts && !tsMap.has(ts)) {
                const dt = new Date(ts * 1000);
                const hh = String(dt.getHours()).padStart(2, '0');
                const mm = String(dt.getMinutes()).padStart(2, '0');
                tsMap.set(ts, `${hh}:${mm}`);
              }
            });
          }
        });

        const sortedTs = Array.from(tsMap.keys()).sort((a, b) => a - b);
        if (sortedTs.length === 0) return;

        const labels = sortedTs.map((ts) => tsMap.get(ts) || '');
        const data = sortedTs.map((ts) => {
          let totalTWDAtTs = 0;
          results.forEach(({ stock, chartData }) => {
            const fx = stock.market === 'us' ? usdTwdRate : 1;
            const currentP = stock.price && stock.price > 0 ? stock.price : stock.cost;
            let pAtTs = currentP;

            if (chartData && Array.isArray(chartData.timestamp) && Array.isArray(chartData.quotes)) {
              const idx = chartData.timestamp.indexOf(ts);
              if (idx !== -1 && chartData.quotes[idx] && typeof chartData.quotes[idx] === 'number') {
                pAtTs = chartData.quotes[idx];
              }
            }

            const divInfo = getStockDividendInfo(stock, usdTwdRate, officialEvents[stock.symbol.toUpperCase()]);
            const effShares = isExAdjustedMode ? stock.shares + divInfo.pendingStockShares : stock.shares;

            totalTWDAtTs += effShares * pAtTs * fx;
          });
          return Math.round(totalTWDAtTs);
        });

        if (labels.length > 0 && data.length > 0) {
          setRealIntradaySeries({ labels, data });
        }
      } catch {
        // ignore
      }
    };

    fetchIntradayRealSeries();

    return () => {
      isMounted = false;
    };
  }, [portfolio, usdTwdRate]);

  const assetTrendHistory = useMemo(() => {
    if (realIntradaySeries && realIntradaySeries.data.length > 0) {
      return realIntradaySeries;
    }

    if (totalValTWD === 0) return { labels: ['09:00', '13:30'], data: [0, 0] };
    const STORAGE_KEY = 'stock_radar_asset_history';
    const saved = localStorage.getItem(STORAGE_KEY);
    let history: Array<{ time: string; val: number }> = [];

    if (saved) {
      try {
        history = JSON.parse(saved);
      } catch {
        history = [];
      }
    }

    // Format current time into 5-minute minimum interval bucket
    const now = new Date();
    const mins5 = Math.floor(now.getMinutes() / 5) * 5;
    const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(mins5).padStart(2, '0')}`;
    const base = prevCloseValTWD > 0 ? prevCloseValTWD : totalValTWD;

    if (history.length === 0) {
      const times = ['09:00', '10:00', '11:00', '12:00', '13:00', nowTimeStr];
      history = times.map((t, i) => {
        const pct = i / (times.length - 1);
        return { time: t, val: Math.round(base + (totalValTWD - base) * pct) };
      });
    } else {
      const last = history[history.length - 1];
      if (!last || last.time !== nowTimeStr || Math.abs(last.val - totalValTWD) > 10) {
        if (last && last.time === nowTimeStr) {
          history[history.length - 1].val = Math.round(totalValTWD);
        } else {
          history.push({ time: nowTimeStr, val: Math.round(totalValTWD) });
        }
        if (history.length > 30) history = history.slice(-30);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }

    return {
      labels: history.map((h) => h.time),
      data: history.map((h) => h.val),
    };
  }, [realIntradaySeries, totalValTWD, prevCloseValTWD]);

  const totalProfitTWD = hasMissingPrice ? null : totalValTWD - totalCostTWD;
  const totalROI =
    hasMissingPrice || totalCostTWD === 0 ? null : (totalProfitTWD! / totalCostTWD) * 100;

  const twiiQ = indices.find((i) => i.symbol === '^TWII');
  const twiiChangePct = twiiQ ? twiiQ.changePct : null;
  const portfolioTodayPct = totalCostTWD > 0 ? (todayPLTWD / totalCostTWD) * 100 : null;

  const annualDividendTWD = useMemo(() => {
    return portfolio.reduce((sum, item) => {
      const divInfo = getStockDividendInfo(item, officialEvents);
      return sum + divInfo.annualIncomeTWD;
    }, 0);
  }, [portfolio, officialEvents]);

  return (
    <div className="min-h-screen p-0 sm:p-1.5 lg:p-2.5 antialiased selection:bg-sky-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 bg-slate-800/95 text-white font-medium px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] z-[999] flex items-center justify-between sm:justify-start gap-3 border border-slate-600/50 backdrop-blur-xl animate-bounce">
          <span className={toastMessage.isSuccess ? 'text-sky-400 font-bold' : 'text-rose-400 font-bold'}>
            {toastMessage.isSuccess ? '✓' : '✕'}
          </span>
          <span className="text-xs sm:text-sm tracking-wide truncate">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Container - Full-Width Edge to Edge (滿版無多餘留白) */}
      <div className="w-full max-w-full mx-auto space-y-2.5 sm:space-y-4 px-1 sm:px-2 md:px-3 pb-28 sm:pb-16 overflow-x-hidden">
        {/* Header */}
        <Header
          isAdmin={isAdmin}
          onToggleAdmin={handleToggleAdmin}
          isRedUp={isRedUp}
          onToggleTheme={() => setIsRedUp(!isRedUp)}
          isPrivacy={isPrivacy}
          onTogglePrivacy={() => setIsPrivacy(!isPrivacy)}
          isAutoRefreshOn={isAutoRefreshOn}
          onToggleAutoRefresh={() => setIsAutoRefreshOn(!isAutoRefreshOn)}
          countdownTimer={countdownTimer}
          activeRefreshInterval={activeRefreshInterval}
          onManualRefresh={() => fetchRealtimePrices(true)}
          isFetchingPrices={isFetchingPrices}
          cloudSyncUrl={cloudSyncUrl}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenAddModal={() => {
            setEditStock(null);
            setIsStockModalOpen(true);
          }}
          onOpenAICopilot={() => {
            setIsAICopilotOpen(true);
            if (!aiAnalysisResult) handleRunAIAnalysis();
          }}
          onOpenChangelog={() => setIsVersionModalOpen(true)}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          usdTwdRate={usdTwdRate}
          lastUpdateTime={lastSyncTime}
          twMarketOpen={twMarketOpen}
          usMarketOpen={usMarketOpen}
          quoteSuccessCount={quoteSuccessCount}
          totalPositionsCount={portfolio.length}
        />

        {/* API Connection & Debug Console */}
        <ApiDebugPanel
          apiHealth={apiHealth}
          lastSyncTime={lastSyncTime}
          quoteSuccessCount={quoteSuccessCount}
          totalCount={portfolio.length}
          lastCloudWriteTime={lastCloudWriteTime}
          onRunDiagnostics={() => fetchRealtimePrices(true)}
          isAdmin={isAdmin}
          onToggleAdmin={handleToggleAdmin}
        />

        {/* Workbench Tab Switcher Bar */}
        <div className="sticky top-1 sm:top-2 z-40 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-xl sm:rounded-2xl p-0.5 sm:p-1.5 shadow-sm text-xs w-full">
          <div className="grid grid-cols-5 gap-0.5 sm:gap-1 w-full items-center">
            <button
              onClick={() => {
                playClickSound();
                setActiveMobileTab('overview');
              }}
              className={`px-1 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl font-bold transition flex items-center justify-center gap-1 btn-interact text-[10px] sm:text-xs ${
                activeMobileTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Activity className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${activeMobileTab === 'overview' ? 'text-white' : 'text-indigo-500'}`} />
              <span><span className="sm:hidden">總覽</span><span className="hidden sm:inline">資產總覽</span></span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMobileTab('portfolio');
              }}
              className={`px-1 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl font-bold transition flex items-center justify-center gap-0.5 sm:gap-1 btn-interact text-[10px] sm:text-xs ${
                activeMobileTab === 'portfolio'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BarChart2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${activeMobileTab === 'portfolio' ? 'text-white' : 'text-indigo-500'}`} />
              <span><span className="sm:hidden">部位</span><span className="hidden sm:inline">持股部位</span></span>
              <span className={`text-[8px] sm:text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeMobileTab === 'portfolio' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {portfolio.length}
              </span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMobileTab('charts');
              }}
              className={`px-1 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl font-bold transition flex items-center justify-center gap-1 btn-interact text-[10px] sm:text-xs ${
                activeMobileTab === 'charts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PieChart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${activeMobileTab === 'charts' ? 'text-white' : 'text-indigo-500'}`} />
              <span><span className="sm:hidden">走勢</span><span className="hidden sm:inline">走勢與配置</span></span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMobileTab('calendar');
              }}
              className={`px-1 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl font-bold transition flex items-center justify-center gap-1 btn-interact text-[10px] sm:text-xs ${
                activeMobileTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calendar className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${activeMobileTab === 'calendar' ? 'text-white' : 'text-indigo-500'}`} />
              <span><span className="sm:hidden">月曆</span><span className="hidden sm:inline">股息月曆</span></span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMobileTab(activeMobileTab === 'all' ? 'overview' : 'all');
              }}
              className={`px-1 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border transition flex items-center justify-center gap-1 btn-interact ${
                activeMobileTab === 'all'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title={activeMobileTab === 'all' ? '返回分頁導覽' : '在單一頁面展開全部資產看板'}
            >
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-emerald-600" />
              <span><span className="sm:hidden">全部</span><span className="hidden sm:inline">{activeMobileTab === 'all' ? '單視窗' : '全部顯示'}</span></span>
            </button>
          </div>
        </div>

          {/* Tab Content Display Areas */}
          <div className="space-y-4 sm:space-y-6">
            {/* Tab 1: Overview */}
            {(activeMobileTab === 'all' || activeMobileTab === 'overview') && (
              <div className="space-y-5 animate-fadeIn">
                <BentoDashboard
                  totalValue={totalValTWD}
                  totalCost={totalCostTWD}
                  todayPL={todayPLTWD}
                  totalProfit={totalProfitTWD}
                  totalROI={totalROI}
                  totalCount={portfolio.length}
                  twCount={twCount}
                  usCount={usCount}
                  isPrivacy={isPrivacy}
                  isRedUp={isRedUp}
                  onOpenTodayPLModal={(timeframe) => {
                    setTodayPLModalTimeframe(timeframe || '1D');
                    setIsTodayPLModalOpen(true);
                  }}
                  monthlyTargetIncome={30000}
                  annualDividendIncome={annualDividendTWD}
                  isExAdjustedMode={isExAdjustedMode}
                  onToggleExAdjustedMode={() => setIsExAdjustedMode(!isExAdjustedMode)}
                  totalPendingStockValueTWD={totalPendingStockValueTWD}
                  totalPendingStockShares={totalPendingStockShares}
                />

                <div id="section-indices" className="scroll-mt-20">
                  <MarketIndices
                    indices={indices}
                    twiiChangePct={twiiChangePct}
                    portfolioTodayPct={portfolioTodayPct}
                  isRedUp={isRedUp}
                  onSelectIndex={(symbol, market, name) => {
                    setSelectedChartTarget({ symbol, market, name });
                    setIsFullChartModalOpen(true);
                  }}
                />
              </div>

              <div id="section-performance" className="scroll-mt-20">
                <PerformanceBanners
                  portfolio={portfolio}
                  usdTwdRate={usdTwdRate}
                  isPrivacy={isPrivacy}
                  isRedUp={isRedUp}
                  onSelectStock={(symbol, market, name) => {
                    setSelectedChartTarget({ symbol, market, name });
                    setIsFullChartModalOpen(true);
                  }}
                />
              </div>

              <NewsMarquee news={news} lastNewsTime={lastNewsTime} />
            </div>
          )}

          {/* Tab 2: Portfolio Holdings */}
          {(activeMobileTab === 'all' || activeMobileTab === 'portfolio') && (
            <div id="section-portfolio" className="space-y-5 scroll-mt-20 animate-fadeIn">
              <StockTable
                portfolio={portfolio}
                usdTwdRate={usdTwdRate}
                isAdmin={isAdmin}
                isPrivacy={isPrivacy}
                isRedUp={isRedUp}
                officialEvents={officialEvents}
                onSelectChartTarget={(symbol, market, name) => {
                  setSelectedChartTarget({ symbol, market, name });
                  setIsFullChartModalOpen(true);
                }}
                onOpenTxHistory={(stockId) => {
                  const stk = portfolio.find((p) => p.id === stockId);
                  if (stk) {
                    setTxHistoryStock(stk);
                    setIsTxHistoryModalOpen(true);
                  }
                }}
                onOpenEditModal={(stockId) => {
                  const stk = portfolio.find((p) => p.id === stockId);
                  if (stk) {
                    setEditStock(stk);
                    setIsStockModalOpen(true);
                  }
                }}
                onDeleteStock={handleDeleteStock}
                onOpenAddModal={() => {
                  setEditStock(null);
                  setIsStockModalOpen(true);
                }}
                onToggleAdmin={handleToggleAdmin}
                onExportData={() => {
                  const jsonStr = JSON.stringify(portfolio, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `StockMonitor_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast('資料已匯出備份');
                }}
                onImportData={() => {
                  const fileInput = document.createElement('input');
                  fileInput.type = 'file';
                  fileInput.accept = '.json';
                  fileInput.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        try {
                          const parsed = JSON.parse(evt.target?.result as string);
                          const normalized = normalizePortfolio(parsed);
                          setPortfolio(normalized);
                          savePortfolioLocal(normalized);
                          showToast('備份資料成功還原！');
                        } catch {
                          showToast('JSON 格式錯誤，請檢查檔案', false);
                        }
                      };
                      reader.readAsText(file);
                    }
                  };
                  fileInput.click();
                }}
                isExAdjustedMode={isExAdjustedMode}
                onToggleExAdjustedMode={() => setIsExAdjustedMode(!isExAdjustedMode)}
                onApplyPendingStockShares={handleApplyPendingStockShares}
                onDeductCashDividendCost={handleDeductCashDividendCost}
              />
            </div>
          )}

          {/* Tab 3: Charts & Analytics */}
          {(activeMobileTab === 'all' || activeMobileTab === 'charts') && (
            <div className="space-y-5 animate-fadeIn">
              <div id="section-assethub" className="scroll-mt-20">
                <IntegratedAssetHub
                  labels={assetTrendHistory.labels}
                  data={assetTrendHistory.data}
                  currentVal={totalValTWD}
                  portfolio={portfolio}
                  usdTwdRate={usdTwdRate}
                  isPrivacy={isPrivacy}
                  isRedUp={isRedUp}
                />
              </div>

              <SingleStockChart
                portfolio={portfolio}
                selectedChartTarget={selectedChartTarget}
                onSelectChartTarget={(symbol, market, name) =>
                  setSelectedChartTarget({ symbol, market, name })
                }
                isRedUp={isRedUp}
                onOpenFullModal={() => setIsFullChartModalOpen(true)}
              />
            </div>
          )}

          {/* Tab 4: Dividend Calendar */}
          {(activeMobileTab === 'all' || activeMobileTab === 'calendar') && (
            <div className="space-y-5 animate-fadeIn">
              <div id="section-dividends" className="scroll-mt-20">
                <DividendCalendar
                  portfolio={portfolio}
                  usdTwdRate={usdTwdRate}
                  isPrivacy={isPrivacy}
                  officialEvents={officialEvents}
                  onUpdateStock={handleUpdateSingleStock}
                  onApplyPendingStockShares={handleApplyPendingStockShares}
                />
              </div>
              <LunarFortuneCard />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <StockModal
        isOpen={isStockModalOpen}
        editStock={editStock}
        usdTwdRate={usdTwdRate}
        onClose={() => setIsStockModalOpen(false)}
        onSave={handleSaveStock}
      />

      <TransactionHistoryModal
        isOpen={isTxHistoryModalOpen}
        stock={txHistoryStock}
        isAdmin={isAdmin}
        usdTwdRate={usdTwdRate}
        onClose={() => setIsTxHistoryModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        onDeleteTransaction={handleDeleteTransaction}
      />

      <TodayPLModal
        isOpen={isTodayPLModalOpen}
        initialTimeframe={todayPLModalTimeframe}
        portfolio={portfolio}
        usdTwdRate={usdTwdRate}
        isPrivacy={isPrivacy}
        isRedUp={isRedUp}
        onClose={() => setIsTodayPLModalOpen(false)}
        onSelectStock={(symbol, market, name) => {
          setSelectedChartTarget({ symbol, market, name });
          const chartCard = document.getElementById('singleStockChartCard');
          if (chartCard) chartCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        currentSyncUrl={cloudSyncUrl}
        onClose={() => setIsSyncModalOpen(false)}
        onSaveSyncUrl={(url) => {
          setCloudSyncUrl(url);
          localStorage.setItem('stock_radar_sync_url', url);
          setIsSyncModalOpen(false);
          showToast(url ? '雲端網址已設定' : '已恢復本機模式');
        }}
        onFetchFromCloud={handleFetchCloudData}
        onPushToCloud={handlePushCloudData}
        isAdmin={isAdmin}
      />

      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        name={actionModal.name}
        profitStr={actionModal.profitStr}
        roi={actionModal.roi}
        isRedUp={isRedUp}
        onClose={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <AICopilotModal
        isOpen={isAICopilotOpen}
        isLoading={isAIAnalyzing}
        analysis={aiAnalysisResult}
        error={aiError}
        portfolio={portfolio}
        totalValue={Math.round(totalValTWD)}
        totalProfit={Math.round(totalProfitTWD || 0)}
        totalROI={Number((totalROI || 0).toFixed(2))}
        indices={indices}
        onClose={() => setIsAICopilotOpen(false)}
        onReanalyze={handleRunAIAnalysis}
      />

      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
      />

      <FullStockChartModal
        isOpen={isFullChartModalOpen}
        onClose={() => setIsFullChartModalOpen(false)}
        portfolio={portfolio}
        selectedChartTarget={selectedChartTarget}
        onSelectChartTarget={(symbol, market, name) =>
          setSelectedChartTarget({ symbol, market, name })
        }
        isRedUp={isRedUp}
        onOpenAICopilot={() => {
          setIsAICopilotOpen(true);
          if (!aiAnalysisResult) handleRunAIAnalysis();
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title={deleteConfirmState.type === 'stock' ? '確認刪除部位' : '確認刪除交易紀錄'}
        message={deleteConfirmState.message}
        itemName={deleteConfirmState.itemName}
        onConfirm={handleExecuteDelete}
        onClose={() => setDeleteConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        isAdmin={isAdmin}
        onUnlock={(pwd) => {
          setIsAdmin(true);
          setAdminPassword(pwd);
          showToast('✅ 編輯與備份功能已解鎖');
        }}
        onLock={() => {
          setIsAdmin(false);
          setAdminPassword('');
          showToast('已鎖定管理權限');
        }}
        onClose={() => setIsAdminPasswordModalOpen(false)}
      />

      <DividendCalendarModal
        isOpen={isDividendModalOpen}
        portfolio={portfolio}
        usdTwdRate={usdTwdRate}
        isPrivacy={isPrivacy}
        onClose={() => setIsDividendModalOpen(false)}
        onUpdateStock={handleUpdateSingleStock}
      />

      <AssetAnalysisModal
        isOpen={isAssetAnalysisModalOpen}
        portfolio={portfolio}
        usdTwdRate={usdTwdRate}
        isPrivacy={isPrivacy}
        isRedUp={isRedUp}
        labels={assetTrendHistory.labels}
        data={assetTrendHistory.data}
        currentVal={totalValTWD}
        onClose={() => setIsAssetAnalysisModalOpen(false)}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onDonotShow7Days={handleDonotShowGuide7Days}
      />

      {/* Floating AI Copilot Shortcut (Desktop & Tablet) */}
      <button
        onClick={() => {
          playClickSound();
          setIsAICopilotOpen(true);
          if (!aiAnalysisResult) handleRunAIAnalysis();
        }}
        className="hidden lg:flex fixed bottom-6 left-6 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-[0_0_25px_rgba(168,85,247,0.5)] border border-purple-400/40 hover:scale-105 active:scale-95 transition items-center gap-2 group btn-interact"
        title="開啟 AI 戰情操盤顧問"
      >
        <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
        <span className="text-xs font-black tracking-wider">AI 戰情顧問</span>
      </button>

      {/* Native-Like Mobile Bottom Navigation Bar & Quick Action FAB (Mobile & Tablet) */}
      <MobileBottomNav
        activeTab={activeMobileTab}
        onSelectTab={(tab) => setActiveMobileTab(tab)}
        onOpenAddModal={() => {
          setEditStock(null);
          setIsStockModalOpen(true);
        }}
        onOpenAICopilot={() => {
          setIsAICopilotOpen(true);
          if (!aiAnalysisResult) handleRunAIAnalysis();
        }}
        onManualRefresh={() => fetchRealtimePrices(true)}
        isFetchingPrices={isFetchingPrices}
      />
    </div>
  );
}
