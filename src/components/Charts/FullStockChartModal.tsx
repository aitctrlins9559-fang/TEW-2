import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Sliders,
  Sparkles,
  DollarSign,
  Layers,
  Flame,
  ArrowLeft,
  Clock,
  BarChart2,
  Maximize2,
  ShieldAlert,
  Target,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Chart } from 'react-chartjs-2';
import {
  StockPosition,
  ChartTarget,
  MarketType,
  IntradayData,
  ChartTimeframe,
  ChartRenderStyle,
  SubChartIndicator,
} from '../../types';
import { playClickSound } from '../../utils/audio';
import { apiFetchChartData, apiSearchStock } from '../../utils/apiClient';
import { searchLocalDictionary } from '../../data/stockDictionary';
import { getMarketStatusInfo } from '../../utils/marketHelper';
import {
  calculateSMA,
  calculateBollingerBands,
  calculateRSI,
  calculateKD,
  calculateMACD,
  calculateSupportResistance,
  evaluateTechnicalDiagnosis,
  generateOrderBook,
  CandleData,
} from '../../utils/technicalAnalysis';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

// Custom Chart.js Plugin for drawing Candlestick High/Low Wicks
const candlestickWicksPlugin = {
  id: 'candlestickWicks',
  beforeDatasetsDraw(chart: any) {
    const opts = chart.config.options?.plugins?.candlestickWicks;
    if (!opts || !opts.enabled) return;
    const meta = chart.getDatasetMeta(0);
    if (!meta || meta.type !== 'bar' || !meta.data) return;
    const ctx = chart.ctx;
    const candles: CandleData[] = opts.candles || [];
    const yScale = chart.scales.y;
    if (!candles.length || !yScale || !ctx) return;

    ctx.save();
    meta.data.forEach((element: any, index: number) => {
      const candle = candles[index];
      if (!candle || !element || typeof element.x !== 'number' || isNaN(element.x)) return;
      if (isNaN(candle.high) || isNaN(candle.low)) return;
      
      const x = element.x;
      const yHigh = yScale.getPixelForValue(candle.high);
      const yLow = yScale.getPixelForValue(candle.low);
      if (typeof yHigh !== 'number' || typeof yLow !== 'number' || isNaN(yHigh) || isNaN(yLow)) return;
      
      const isBullish = candle.close >= candle.open;
      ctx.strokeStyle = isBullish ? opts.upColor : opts.downColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();
    });
    ctx.restore();
  },
};

ChartJS.register(candlestickWicksPlugin);

interface FullStockChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: StockPosition[];
  selectedChartTarget: ChartTarget;
  onSelectChartTarget: (symbol: string, market: MarketType, name: string) => void;
  isRedUp: boolean;
  onOpenAICopilot?: () => void;
}

const MARKET_INDICES: Array<{ symbol: string; market: MarketType; name: string }> = [
  { symbol: '^TWII', market: 'tse', name: '台股加權' },
  { symbol: '^DJI', market: 'us', name: '道瓊工業' },
  { symbol: '^GSPC', market: 'us', name: '標普500' },
  { symbol: '^IXIC', market: 'us', name: '納斯達克' },
  { symbol: '^N225', market: 'us', name: '日經225' },
];

const HOT_STOCKS: Array<{ symbol: string; market: MarketType; name: string }> = [
  { symbol: '2330', market: 'tse', name: '台積電' },
  { symbol: '2317', market: 'tse', name: '鴻海' },
  { symbol: '2454', market: 'tse', name: '聯發科' },
  { symbol: '0050', market: 'tse', name: '元大台灣50' },
  { symbol: '0056', market: 'tse', name: '元大高股息' },
  { symbol: '00878', market: 'tse', name: '國泰永續高股息' },
  { symbol: 'TSLA', market: 'us', name: '特斯拉' },
  { symbol: 'NVDA', market: 'us', name: '輝達' },
  { symbol: 'AAPL', market: 'us', name: '蘋果' },
];

export const FullStockChartModal: React.FC<FullStockChartModalProps> = ({
  isOpen,
  onClose,
  portfolio,
  selectedChartTarget,
  onSelectChartTarget,
  isRedUp,
  onOpenAICopilot,
}) => {
  // Timeframe and View Settings
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1D');
  const [chartStyle, setChartStyle] = useState<ChartRenderStyle>('candlestick');
  const [subIndicator, setSubIndicator] = useState<SubChartIndicator>('volume');

  // Overlays
  const [showMA, setShowMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showPrevClose, setShowPrevClose] = useState(true);

  // Mobile View Mode & Desktop Sidecar Tab
  const [mobileTab, setMobileTab] = useState<'chart' | 'orderbook' | 'diagnosis' | 'position' | 'switcher'>('chart');
  const [sidebarTab, setSidebarTab] = useState<'orderbook' | 'diagnosis' | 'position' | 'switcher'>('orderbook');

  // Raw Candle Data
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [metaInfo, setMetaInfo] = useState<{
    prevClose: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    currency: string;
    tradingDateStr: string;
    isMarketOpen: boolean;
    marketStatusText: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);

  // Quick Switcher search & category tabs
  const [switcherCategory, setSwitcherCategory] = useState<'portfolio' | 'indices' | 'hot'>('portfolio');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ symbol: string; name: string; market: MarketType }>
  >([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Target profit simulation
  const [targetSimPrice, setTargetSimPrice] = useState<string>('');

  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  const upColor = useMemo(() => (isRedUp ? '#e11d48' : '#059669'), [isRedUp]);
  const downColor = useMemo(() => (isRedUp ? '#059669' : '#e11d48'), [isRedUp]);

  // Check if current target is held in portfolio
  const matchedPortfolioItem = useMemo(() => {
    return portfolio.find(
      (p) =>
        p.symbol.toUpperCase() === selectedChartTarget.symbol.toUpperCase() ||
        p.symbol.toUpperCase().replace(/\.(TW|TWO)$/i, '') === selectedChartTarget.symbol.toUpperCase()
    );
  }, [portfolio, selectedChartTarget]);

  // Stepper navigation
  const portfolioList = useMemo(() => {
    return portfolio.map((p) => ({ symbol: p.symbol, market: p.market, name: p.name }));
  }, [portfolio]);

  const currentPortfolioIndex = useMemo(() => {
    return portfolioList.findIndex(
      (p) => p.symbol.toUpperCase() === selectedChartTarget.symbol.toUpperCase()
    );
  }, [portfolioList, selectedChartTarget]);

  const handlePrevStock = () => {
    if (portfolioList.length === 0) return;
    playClickSound();
    const prevIdx = (currentPortfolioIndex - 1 + portfolioList.length) % portfolioList.length;
    const item = portfolioList[prevIdx];
    onSelectChartTarget(item.symbol, item.market, item.name);
  };

  const handleNextStock = () => {
    if (portfolioList.length === 0) return;
    playClickSound();
    const nextIdx = (currentPortfolioIndex + 1) % portfolioList.length;
    const item = portfolioList[nextIdx];
    onSelectChartTarget(item.symbol, item.market, item.name);
  };

  // Search autocomplete in modal
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    const instantLocal = searchLocalDictionary(val, 10);
    if (instantLocal.length > 0) {
      setSearchResults(instantLocal);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiSearchStock(val);
        if (Array.isArray(res)) {
          setSearchResults(res.slice(0, 10));
        }
      } catch {
        // Keep local matches
      }
    }, 150);
  };

  // Fetch Chart & Candle Data based on selected Timeframe
  const fetchChartDataForTimeframe = useCallback(
    async (target: ChartTarget, tf: ChartTimeframe) => {
      if (!target.symbol) return;
      setLoading(true);
      setErrorMsg(null);
      setHoveredCandle(null);

      let range = '1d';
      let interval = '5m';

      switch (tf) {
        case '1D':
          range = '1d';
          interval = '5m';
          break;
        case '5D':
          range = '5d';
          interval = '15m';
          break;
        case '1M':
          range = '1mo';
          interval = '1d';
          break;
        case '3M':
          range = '3mo';
          interval = '1d';
          break;
        case '6M':
          range = '6mo';
          interval = '1d';
          break;
        case '1Y':
          range = '1y';
          interval = '1wk';
          break;
        case '5Y':
          range = '5y';
          interval = '1mo';
          break;
      }

      try {
        const s =
          target.symbol.startsWith('^')
            ? target.symbol
            : target.market === 'tse'
            ? `${target.symbol}.TW`
            : target.market === 'otc'
            ? `${target.symbol}.TWO`
            : target.symbol;

        const matched = portfolioRef.current.find(
          (p) =>
            p.symbol.toUpperCase() === target.symbol.toUpperCase() ||
            p.symbol.toUpperCase().replace(/\.(TW|TWO)$/i, '') === target.symbol.toUpperCase()
        );
        const currentPrice = matched?.price && matched.price > 0 ? matched.price : undefined;

        const json = await apiFetchChartData(s, range, interval, currentPrice);

        if (!json || !json.success || !json.meta) {
          throw new Error('暫無即時走勢數據');
        }

        const meta = json.meta;
        const ts: number[] = json.timestamp || [];
        const quotes: number[] = json.quotes || [];
        const opens: number[] = json.opens || [];
        const highs: number[] = json.highs || [];
        const lows: number[] = json.lows || [];
        const volumes: number[] = json.volumes || [];

        const isUS = target.market === 'us' || target.symbol.startsWith('^');
        const timeZone = isUS ? 'America/New_York' : 'Asia/Taipei';

        const parsedCandles: CandleData[] = [];

        for (let i = 0; i < ts.length; i++) {
          const t = ts[i];
          const c = quotes[i];
          if (typeof c !== 'number' || isNaN(c) || c <= 0) continue;

          const o = typeof opens[i] === 'number' && !isNaN(opens[i]) && opens[i] > 0 ? opens[i] : c;
          const h = typeof highs[i] === 'number' && !isNaN(highs[i]) && highs[i] > 0 ? highs[i] : Math.max(o, c);
          const l = typeof lows[i] === 'number' && !isNaN(lows[i]) && lows[i] > 0 ? lows[i] : Math.min(o, c);
          const v = typeof volumes[i] === 'number' && !isNaN(volumes[i]) ? volumes[i] : 0;

          const dateObj = new Date(t * 1000);
          let dateStr = '';
          let timeStr = '';

          try {
            dateStr = dateObj.toLocaleDateString('zh-TW', { timeZone, month: '2-digit', day: '2-digit' });
            timeStr = dateObj.toLocaleTimeString('zh-TW', {
              timeZone,
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch {
            dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
          }

          parsedCandles.push({
            timestamp: t,
            dateStr,
            timeStr: tf === '1D' || tf === '5D' ? `${tf === '5D' ? dateStr + ' ' : ''}${timeStr}` : dateStr,
            open: Number(o.toFixed(2)),
            high: Number(h.toFixed(2)),
            low: Number(l.toFixed(2)),
            close: Number(c.toFixed(2)),
            volume: Math.round(v),
          });
        }

        if (parsedCandles.length === 0) {
          throw new Error('暫無該週期的 K 線走勢資料');
        }

        const prevClose =
          meta.chartPreviousClose || meta.previousClose || parsedCandles[0].open || parsedCandles[0].close;
        const lastCandle = parsedCandles[parsedCandles.length - 1];
        const latestPrice =
          matched?.price && matched.price > 0
            ? matched.price
            : lastCandle.close;

        const openPrice = meta.regularMarketOpen || meta.open || parsedCandles[0].open;
        const allHighs = parsedCandles.map((c) => c.high);
        const allLows = parsedCandles.map((c) => c.low);
        const highPrice = Math.max(...allHighs);
        const lowPrice = Math.min(...allLows);

        let totalVolume = meta.regularMarketVolume || meta.volume || 0;
        if (totalVolume === 0) {
          totalVolume = parsedCandles.reduce((acc, c) => acc + c.volume, 0);
        }

        const lastTs = meta.regularMarketTime || (ts.length > 0 ? ts[ts.length - 1] : undefined);
        const marketStatus = getMarketStatusInfo(target.market, target.symbol, lastTs);

        setCandles(parsedCandles);
        setMetaInfo({
          prevClose,
          open: openPrice,
          high: highPrice,
          low: lowPrice,
          close: latestPrice,
          volume: totalVolume,
          currency: meta.currency || (target.market === 'us' ? 'USD' : 'TWD'),
          tradingDateStr: marketStatus.tradingDateStr,
          isMarketOpen: marketStatus.isMarketOpen,
          marketStatusText: marketStatus.statusText,
        });

        // Set initial simulation target price without creating effect dependency
        setTargetSimPrice((prev) => (prev ? prev : (latestPrice * 1.1).toFixed(2)));
      } catch (err) {
        setErrorMsg((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen && selectedChartTarget.symbol) {
      fetchChartDataForTimeframe(selectedChartTarget, timeframe);
    }
  }, [isOpen, selectedChartTarget.symbol, selectedChartTarget.market, timeframe, fetchChartDataForTimeframe]);

  // Derived Technical Indicator Series
  const technicalSeries = useMemo(() => {
    if (candles.length === 0) return null;

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    const ma5 = calculateSMA(closes, 5);
    const ma10 = calculateSMA(closes, 10);
    const ma20 = calculateSMA(closes, 20);
    const ma60 = calculateSMA(closes, 60);

    const bollinger = calculateBollingerBands(closes, 20, 2);

    // VWAP
    const vwapData: (number | null)[] = [];
    let cumVol = 0;
    let cumVal = 0;
    candles.forEach((c) => {
      const typical = (c.high + c.low + c.close) / 3;
      const v = Math.max(1, c.volume);
      cumVal += typical * v;
      cumVol += v;
      vwapData.push(Number((cumVal / cumVol).toFixed(2)));
    });

    // Sub indicators
    const volMa5 = calculateSMA(volumes, 5);
    const volMa20 = calculateSMA(volumes, 20);
    const kd = calculateKD(highs, lows, closes, 9, 3, 3);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);

    // Technical diagnosis & levels
    const diagnosis = evaluateTechnicalDiagnosis(closes, highs, lows, volumes, isRedUp);
    const levels = calculateSupportResistance(highs, lows, closes);
    const orderBook = generateOrderBook(
      metaInfo ? metaInfo.close : closes[closes.length - 1],
      metaInfo ? metaInfo.prevClose : closes[0],
      selectedChartTarget.market === 'us'
    );

    return {
      ma5,
      ma10,
      ma20,
      ma60,
      bollinger,
      vwapData,
      volMa5,
      volMa20,
      kd,
      rsi,
      macd,
      diagnosis,
      levels,
      orderBook,
    };
  }, [candles, isRedUp, metaInfo, selectedChartTarget.market]);

  // Main Chart Dataset Builder
  const mainChartData = useMemo(() => {
    if (candles.length === 0 || !metaInfo || !technicalSeries) return null;

    const labels = candles.map((c) => c.timeStr);
    const datasets: any[] = [];

    const isIntraday = timeframe === '1D' || timeframe === '5D';

    // 1. Candlestick vs Line / Area Datasets
    if (chartStyle === 'candlestick') {
      // Floating bar representing [min(open, close), max(open, close)]
      const barData = candles.map((c) => {
        const minVal = Math.min(c.open, c.close);
        const maxVal = Math.max(c.open, c.close);
        // If doji (open == close), give tiny 0.05 height so the line renders
        if (minVal === maxVal) {
          return [minVal - 0.02, maxVal + 0.02];
        }
        return [minVal, maxVal];
      });

      const barBgColors = candles.map((c) =>
        c.close >= c.open ? upColor : downColor
      );

      datasets.push({
        type: 'bar' as const,
        label: 'K線棒體',
        data: barData,
        backgroundColor: barBgColors,
        borderColor: barBgColors,
        borderWidth: 1,
        barPercentage: 0.75,
        categoryPercentage: 0.85,
        yAxisID: 'y',
        order: 2,
      });
    } else {
      const closes = candles.map((c) => c.close);
      const isUpTrend = closes[closes.length - 1] >= (metaInfo?.prevClose || closes[0]);
      const lineColor = isUpTrend ? upColor : downColor;

      datasets.push({
        type: 'line' as const,
        label: `${selectedChartTarget.name} 走勢`,
        data: closes,
        borderColor: lineColor,
        borderWidth: 2.2,
        fill: chartStyle === 'area',
        tension: 0.1,
        pointRadius: (ctx: { dataIndex: number }) => (ctx.dataIndex === closes.length - 1 ? 5 : 0),
        pointBackgroundColor: lineColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        yAxisID: 'y',
        order: 2,
        backgroundColor: (context: {
          chart: { ctx: CanvasRenderingContext2D; chartArea?: { bottom: number; top: number } };
        }) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea || chartStyle !== 'area') return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
          gradient.addColorStop(1, isUpTrend ? (isRedUp ? 'rgba(225, 29, 72, 0.18)' : 'rgba(5, 150, 105, 0.18)') : (isRedUp ? 'rgba(5, 150, 105, 0.18)' : 'rgba(225, 29, 72, 0.18)'));
          return gradient;
        },
      });
    }

    // 2. MA Overlays
    if (showMA) {
      datasets.push({
        type: 'line' as const,
        label: 'MA5 (週)',
        data: technicalSeries.ma5,
        borderColor: '#eab308', // Amber 500
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
        order: 1,
      });

      datasets.push({
        type: 'line' as const,
        label: 'MA10 (雙週)',
        data: technicalSeries.ma10,
        borderColor: '#06b6d4', // Cyan 500
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
        order: 1,
      });

      datasets.push({
        type: 'line' as const,
        label: 'MA20 (月線)',
        data: technicalSeries.ma20,
        borderColor: '#8b5cf6', // Violet 500
        borderWidth: 1.8,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
        order: 1,
      });

      if (!isIntraday && candles.length >= 40) {
        datasets.push({
          type: 'line' as const,
          label: 'MA60 (季線)',
          data: technicalSeries.ma60,
          borderColor: '#f97316', // Orange 500
          borderWidth: 1.8,
          fill: false,
          pointRadius: 0,
          tension: 0.2,
          yAxisID: 'y',
          order: 1,
        });
      }
    }

    // 3. Bollinger Bands Overlays
    if (showBollinger) {
      datasets.push({
        type: 'line' as const,
        label: '布林上軌',
        data: technicalSeries.bollinger.upper,
        borderColor: '#3b82f6',
        borderWidth: 1.2,
        borderDash: [3, 3],
        fill: '+1', // fill down to lower band
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
        order: 3,
      });

      datasets.push({
        type: 'line' as const,
        label: '布林中軌 (20MA)',
        data: technicalSeries.bollinger.middle,
        borderColor: '#3b82f6',
        borderWidth: 1.2,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
        order: 3,
      });

      datasets.push({
        type: 'line' as const,
        label: '布林下軌',
        data: technicalSeries.bollinger.lower,
        borderColor: '#3b82f6',
        borderWidth: 1.2,
        borderDash: [3, 3],
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
        order: 3,
      });
    }

    // 4. VWAP Overlay (Only on Intraday 1D/5D)
    if (showVWAP && isIntraday) {
      datasets.push({
        type: 'line' as const,
        label: 'VWAP 均價',
        data: technicalSeries.vwapData,
        borderColor: '#d97706',
        borderWidth: 1.5,
        borderDash: [4, 3],
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
        order: 1,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [
    candles,
    metaInfo,
    technicalSeries,
    timeframe,
    chartStyle,
    showMA,
    showBollinger,
    showVWAP,
    upColor,
    downColor,
    isRedUp,
    selectedChartTarget.name,
  ]);

  // Dynamic Y-axis Bounds Calculation strictly focusing on current candle price range
  const yBounds = useMemo(() => {
    if (candles.length === 0) return { min: 0, max: 100 };
    
    // Extract actual candle price extremes for the current period / timeframe
    const highs = candles.map((c) => c.high).filter((v) => typeof v === 'number' && v > 0);
    const lows = candles.map((c) => c.low).filter((v) => typeof v === 'number' && v > 0);
    if (highs.length === 0 || lows.length === 0) return { min: 0, max: 100 };

    let minVal = Math.min(...lows);
    let maxVal = Math.max(...highs);

    // Incorporate MA only if reasonably close (within 4%) to keep view focused on price action
    if (showMA && technicalSeries) {
      const maVals = [...technicalSeries.ma5, ...technicalSeries.ma20].filter(
        (v): v is number => typeof v === 'number' && v > 0 && v >= minVal * 0.96 && v <= maxVal * 1.04
      );
      if (maVals.length > 0) {
        minVal = Math.min(minVal, ...maVals);
        maxVal = Math.max(maxVal, ...maVals);
      }
    }

    // Incorporate Bollinger only if reasonably close
    if (showBollinger && technicalSeries?.bollinger) {
      const bbVals = [...technicalSeries.bollinger.upper, ...technicalSeries.bollinger.lower].filter(
        (v): v is number => typeof v === 'number' && v > 0 && v >= minVal * 0.95 && v <= maxVal * 1.05
      );
      if (bbVals.length > 0) {
        minVal = Math.min(minVal, ...bbVals);
        maxVal = Math.max(maxVal, ...bbVals);
      }
    }

    // Incorporate previous close line if enabled and not massively deviated (ex-dividend protection: within 12% of price action)
    if (showPrevClose && metaInfo && metaInfo.prevClose > 0) {
      const pClose = metaInfo.prevClose;
      const isCloseEnough = pClose >= minVal * 0.88 && pClose <= maxVal * 1.12;
      if (isCloseEnough) {
        minVal = Math.min(minVal, pClose);
        maxVal = Math.max(maxVal, pClose);
      }
    }

    const diff = maxVal - minVal;
    const pad = diff > 0 ? diff * 0.025 : (minVal * 0.005 || 0.5);
    return {
      min: Math.max(0.01, Number((minVal - pad).toFixed(2))),
      max: Number((maxVal + pad).toFixed(2)),
    };
  }, [candles, showBollinger, showMA, showPrevClose, metaInfo, technicalSeries]);

  // Main Chart Options
  const mainChartOptions = useMemo(() => {
    if (!metaInfo || candles.length === 0) return {};

    const annotations: any = {};

    // Intelligent Previous Close Line (Ex-dividend safe: only renders if within reasonable 15% range)
    if (showPrevClose && metaInfo.prevClose > 0) {
      const pClose = metaInfo.prevClose;
      const candleMin = Math.min(...candles.map((c) => c.low).filter((v) => v > 0));
      const candleMax = Math.max(...candles.map((c) => c.high).filter((v) => v > 0));
      const isExDividendOrOutlier = pClose < candleMin * 0.85 || pClose > candleMax * 1.15;

      if (!isExDividendOrOutlier) {
        annotations.prevCloseLine = {
          type: 'line' as const,
          yMin: pClose,
          yMax: pClose,
          borderColor: '#94a3b8',
          borderWidth: 1.2,
          borderDash: [4, 4],
          label: {
            content: `昨收 $${pClose.toFixed(2)}`,
            display: true,
            position: 'end' as const,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#cbd5e1',
            font: { size: 9, weight: 'bold' as const, family: 'monospace' },
            padding: { top: 2, bottom: 2, left: 4, right: 4 },
          },
        };
      }
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: {
          top: 2,
          bottom: 2,
          left: 2,
          right: 2,
        },
      },
      interaction: { mode: 'index' as const, axis: 'x' as const, intersect: false },
      plugins: {
        legend: { display: false },
        candlestickWicks: {
          enabled: chartStyle === 'candlestick',
          candles,
          upColor,
          downColor,
        },
        annotation: { annotations },
        tooltip: {
          enabled: false, // We use custom high-contrast HUD and in-chart live inspector
        },
      },
      onHover: (evt: any, elements: any[], chart: any) => {
        const c = chart || evt?.chart;
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          if (typeof index === 'number' && index >= 0 && index < candles.length && index !== hoveredIndexRef.current) {
            hoveredIndexRef.current = index;
            setHoveredCandle(candles[index]);
            return;
          }
        }
        if (c && c.scales && c.scales.x && evt?.x !== undefined) {
          const rawIdx = Math.round(c.scales.x.getValueForPixel(evt.x));
          if (rawIdx >= 0 && rawIdx < candles.length && rawIdx !== hoveredIndexRef.current) {
            hoveredIndexRef.current = rawIdx;
            setHoveredCandle(candles[rawIdx]);
            return;
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#94a3b8',
            maxTicksLimit: 7,
            font: { family: 'monospace', size: 10, weight: 'bold' as const },
          },
        },
        y: {
          type: 'linear' as const,
          position: 'right' as const,
          beginAtZero: false,
          grace: 0,
          min: yBounds.min,
          max: yBounds.max,
          grid: { color: 'rgba(255, 255, 255, 0.08)', borderDash: [2, 2] },
          ticks: {
            color: '#cbd5e1',
            font: { family: 'monospace', size: 10, weight: 'bold' as const },
            callback: (val: string | number) => {
              const num = Number(val);
              return num >= 1000 ? `$${Math.round(num)}` : `$${num.toFixed(1)}`;
            },
          },
        },
      },
    };
  }, [
    metaInfo,
    candles,
    chartStyle,
    upColor,
    downColor,
    yBounds,
  ]);

  // Sub Indicator Chart Datasets & Options
  const subChartData = useMemo(() => {
    if (candles.length === 0 || subIndicator === 'none' || !technicalSeries) return null;

    const labels = candles.map((c) => c.timeStr);
    const datasets: any[] = [];

    if (subIndicator === 'volume') {
      const volColors = candles.map((c) =>
        c.close >= c.open ? upColor + '99' : downColor + '99'
      );

      datasets.push({
        type: 'bar' as const,
        label: '成交量',
        data: candles.map((c) => c.volume),
        backgroundColor: volColors,
        borderWidth: 0,
        barPercentage: 0.75,
        yAxisID: 'y',
        order: 2,
      });

      datasets.push({
        type: 'line' as const,
        label: 'VOL MA5',
        data: technicalSeries.volMa5,
        borderColor: '#eab308',
        borderWidth: 1.2,
        fill: false,
        pointRadius: 0,
        yAxisID: 'y',
        order: 1,
      });

      datasets.push({
        type: 'line' as const,
        label: 'VOL MA20',
        data: technicalSeries.volMa20,
        borderColor: '#8b5cf6',
        borderWidth: 1.2,
        fill: false,
        pointRadius: 0,
        yAxisID: 'y',
        order: 1,
      });
    } else if (subIndicator === 'kd') {
      datasets.push({
        type: 'line' as const,
        label: '%K (9,3)',
        data: technicalSeries.kd.k,
        borderColor: '#f59e0b',
        borderWidth: 1.6,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
      });

      datasets.push({
        type: 'line' as const,
        label: '%D (3)',
        data: technicalSeries.kd.d,
        borderColor: '#6366f1',
        borderWidth: 1.6,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
      });
    } else if (subIndicator === 'rsi') {
      datasets.push({
        type: 'line' as const,
        label: 'RSI (14)',
        data: technicalSeries.rsi,
        borderColor: '#ec4899',
        borderWidth: 1.8,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
      });
    } else if (subIndicator === 'macd') {
      const oscColors = technicalSeries.macd.osc.map((val) =>
        val !== null && val >= 0 ? upColor + 'bb' : downColor + 'bb'
      );

      datasets.push({
        type: 'bar' as const,
        label: 'MACD 柱體 (OSC)',
        data: technicalSeries.macd.osc,
        backgroundColor: oscColors,
        borderWidth: 0,
        barPercentage: 0.75,
        yAxisID: 'y',
        order: 2,
      });

      datasets.push({
        type: 'line' as const,
        label: 'DIF 快線',
        data: technicalSeries.macd.dif,
        borderColor: '#eab308',
        borderWidth: 1.4,
        fill: false,
        pointRadius: 0,
        yAxisID: 'y',
        order: 1,
      });

      datasets.push({
        type: 'line' as const,
        label: 'DEM 慢線',
        data: technicalSeries.macd.dem,
        borderColor: '#3b82f6',
        borderWidth: 1.4,
        fill: false,
        pointRadius: 0,
        yAxisID: 'y',
        order: 1,
      });
    }

    return { labels, datasets };
  }, [candles, subIndicator, technicalSeries, upColor, downColor]);

  // Dynamic volume maximum bound calculation to ensure volume bars use full subchart height
  const volumeMax = useMemo(() => {
    if (subIndicator !== 'volume' || candles.length === 0) return undefined;
    const volList = candles.map((c) => c.volume || 0);
    const ma5List = technicalSeries?.volMa5?.filter((v): v is number => typeof v === 'number' && !isNaN(v)) || [];
    const ma20List = technicalSeries?.volMa20?.filter((v): v is number => typeof v === 'number' && !isNaN(v)) || [];
    const maxV = Math.max(...volList, ...ma5List, ...ma20List, 10);
    return Math.ceil(maxV * 1.08); // 8% headroom so volume bars fill the height instead of leaving 60% empty
  }, [subIndicator, candles, technicalSeries]);

  const subChartOptions = useMemo(() => {
    if (subIndicator === 'none') return {};

    const annotations: any = {};
    if (subIndicator === 'kd') {
      annotations.overbought = {
        type: 'line' as const,
        yMin: 80,
        yMax: 80,
        borderColor: '#f43f5e',
        borderWidth: 1,
        borderDash: [3, 3],
      };
      annotations.oversold = {
        type: 'line' as const,
        yMin: 20,
        yMax: 20,
        borderColor: '#10b981',
        borderWidth: 1,
        borderDash: [3, 3],
      };
    } else if (subIndicator === 'rsi') {
      annotations.overbought = {
        type: 'line' as const,
        yMin: 70,
        yMax: 70,
        borderColor: '#f43f5e',
        borderWidth: 1,
        borderDash: [3, 3],
      };
      annotations.oversold = {
        type: 'line' as const,
        yMin: 30,
        yMax: 30,
        borderColor: '#10b981',
        borderWidth: 1,
        borderDash: [3, 3],
      };
      annotations.mid = {
        type: 'line' as const,
        yMin: 50,
        yMax: 50,
        borderColor: '#94a3b8',
        borderWidth: 1,
        borderDash: [2, 2],
      };
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: {
          top: 2,
          bottom: 2,
          left: 2,
          right: 2,
        },
      },
      interaction: { mode: 'index' as const, axis: 'x' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        annotation: { annotations },
      },
      onHover: (_evt: any, elements: any[]) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          if (typeof index === 'number' && index !== hoveredIndexRef.current && candles[index]) {
            hoveredIndexRef.current = index;
            setHoveredCandle(candles[index]);
          }
        } else if (hoveredIndexRef.current !== null) {
          hoveredIndexRef.current = null;
          setHoveredCandle(null);
        }
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          type: 'linear' as const,
          position: 'right' as const,
          beginAtZero: true,
          grace: 0,
          min: subIndicator === 'kd' ? 0 : subIndicator === 'rsi' ? 0 : subIndicator === 'volume' ? 0 : undefined,
          max: subIndicator === 'kd' ? 100 : subIndicator === 'rsi' ? 100 : subIndicator === 'volume' ? volumeMax : undefined,
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'monospace', size: 9, weight: 'bold' as const },
            maxTicksLimit: 3,
            callback: (val: string | number) => {
              const num = Number(val);
              if (subIndicator === 'volume') {
                return num >= 1000000 ? `${(num / 1000000).toFixed(1)}M` : num >= 1000 ? `${Math.round(num / 1000)}K` : String(num);
              }
              return String(Math.round(num));
            },
          },
        },
      },
    };
  }, [subIndicator, candles, volumeMax]);

  // Active Index for hovering on charts
  const activeIdx = useMemo(() => {
    if (!candles.length) return -1;
    if (hoveredCandle) {
      const idx = candles.findIndex((c) => c.timestamp === hoveredCandle.timestamp);
      if (idx >= 0) return idx;
    }
    return candles.length - 1;
  }, [candles, hoveredCandle]);

  // Derived Active Technical Values for Real-time HUD and Subchart Header
  const activeSubValues = useMemo(() => {
    if (activeIdx < 0 || !technicalSeries || candles.length === 0) return null;
    const candle = candles[activeIdx];
    const vol = candle?.volume || 0;
    const volMa5 = technicalSeries.volMa5[activeIdx];
    const volMa20 = technicalSeries.volMa20[activeIdx];
    const k = technicalSeries.kd.k[activeIdx];
    const d = technicalSeries.kd.d[activeIdx];
    const rsi = technicalSeries.rsi[activeIdx];
    const dif = technicalSeries.macd.dif[activeIdx];
    const dem = technicalSeries.macd.dem[activeIdx];
    const osc = technicalSeries.macd.osc[activeIdx];
    const ma5 = technicalSeries.ma5[activeIdx];
    const ma10 = technicalSeries.ma10[activeIdx];
    const ma20 = technicalSeries.ma20[activeIdx];
    const ma60 = technicalSeries.ma60[activeIdx];
    const bbUpper = technicalSeries.bollinger.upper[activeIdx];
    const bbMid = technicalSeries.bollinger.middle[activeIdx];
    const bbLower = technicalSeries.bollinger.lower[activeIdx];
    const vwap = technicalSeries.vwapData[activeIdx];
    return {
      vol,
      volMa5,
      volMa20,
      k,
      d,
      rsi,
      dif,
      dem,
      osc,
      ma5,
      ma10,
      ma20,
      ma60,
      bbUpper,
      bbMid,
      bbLower,
      vwap,
    };
  }, [activeIdx, technicalSeries, candles]);

  if (!isOpen) return null;

  const currentCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);
  const activePrice = currentCandle ? currentCandle.close : (metaInfo?.close || 0);
  const activePrevClose = metaInfo ? metaInfo.prevClose : activePrice;
  const activeDiff = activePrice - activePrevClose;
  const activeDiffPct = activePrevClose > 0 ? (activeDiff / activePrevClose) * 100 : 0;
  const isActiveUp = activeDiff >= 0;

  // Format Volume string nicely in compact format
  const formatVolumeShort = (shares: number, market: MarketType) => {
    if (!shares || shares <= 0) return '--';
    if (market === 'us') {
      return shares >= 1000000
        ? `${(shares / 1000000).toFixed(2)}M 股`
        : `${(shares / 1000).toFixed(1)}K 股`;
    }
    const lots = Math.round(shares / 1000);
    return lots >= 10000 ? `${(lots / 10000).toFixed(1)}萬張` : `${lots.toLocaleString()}張`;
  };

  // Target profit simulation math
  const simPriceNum = parseFloat(targetSimPrice) || 0;
  const userShares = matchedPortfolioItem ? matchedPortfolioItem.shares : 0;
  const userCost = matchedPortfolioItem ? matchedPortfolioItem.cost : 0;
  const simProfit = userShares > 0 && simPriceNum > 0 ? (simPriceNum - userCost) * userShares : 0;
  const simROI = userCost > 0 && simPriceNum > 0 ? ((simPriceNum - userCost) / userCost) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[96] w-full h-[100dvh] max-h-screen bg-slate-950 flex flex-col text-slate-100 overflow-hidden overscroll-none select-none modal-backdrop">
      {/* TOP COMMAND BAR (PRO TERMINAL HEADER) - Ultra Clean & Responsive */}
      <div className="bg-slate-900 border-b border-slate-800 px-2 sm:px-3 py-1 flex items-center justify-between gap-1.5 shrink-0 shadow-md h-10 sm:h-11 z-20">
        {/* Left: Return + Stock Identity + Live Price */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs font-bold transition btn-interact shrink-0"
            title="返回上一層"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <span className="text-[11px] sm:text-xs font-mono font-black text-indigo-300 bg-indigo-950/90 border border-indigo-700/60 px-1.5 py-0.5 rounded shrink-0">
              {selectedChartTarget.symbol}
            </span>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[180px] shrink-0">
              {selectedChartTarget.name || selectedChartTarget.symbol}
            </h1>
            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase shrink-0 hidden sm:inline">
              {selectedChartTarget.market === 'us' ? '美股' : selectedChartTarget.market === 'otc' ? '上櫃' : '上市'}
            </span>
          </div>

          {/* Integrated Real-time Price & Change Badge */}
          <div className="flex items-baseline gap-1 font-mono shrink-0 pl-1 border-l border-slate-800/80">
            <span className="text-xs sm:text-sm font-black text-white tabular-nums">
              ${activePrice.toFixed(2)}
            </span>
            <span
              className={`text-[10px] sm:text-xs font-bold font-mono px-1 py-0.2 rounded ${
                isActiveUp
                  ? isRedUp
                    ? 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
                    : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                  : isRedUp
                  ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
              }`}
            >
              {isActiveUp ? '+' : ''}{activeDiffPct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Right: Compact Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onOpenAICopilot && (
            <button
              onClick={() => {
                playClickSound();
                onOpenAICopilot();
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white p-1 sm:px-2 sm:py-0.5 rounded text-xs font-bold transition flex items-center gap-1 shadow-xs btn-interact shrink-0"
              title="開啟 AI 深度量化操盤顧問"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="hidden sm:inline text-[10px]">AI診斷</span>
            </button>
          )}

          {portfolioList.length > 1 && (
            <div className="hidden sm:flex items-center bg-slate-800 border border-slate-700 rounded p-0.5 shrink-0">
              <button
                onClick={handlePrevStock}
                className="p-0.5 hover:bg-slate-700 text-slate-300 rounded transition"
                title="上一檔持股"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono px-1 text-slate-400 font-bold">
                {currentPortfolioIndex >= 0 ? `${currentPortfolioIndex + 1}/${portfolioList.length}` : '切換'}
              </span>
              <button
                onClick={handleNextStock}
                className="p-0.5 hover:bg-slate-700 text-slate-300 rounded transition"
                title="下一檔持股"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              playClickSound();
              fetchChartDataForTimeframe(selectedChartTarget, timeframe);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition shrink-0"
            title="手動重新整理"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition shrink-0"
            title="關閉操盤終端"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE TOP TAB BAR (Switch between Chart, Orderbook, Diagnosis, Position, and Switcher) */}
      <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-1 py-0.5 flex items-center justify-between gap-1 text-xs shrink-0 h-8 z-10">
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('chart');
          }}
          className={`flex-1 py-1 rounded font-bold transition text-center text-[11px] flex items-center justify-center gap-1 ${
            mobileTab === 'chart'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Activity className="w-3 h-3" />
          <span>K線</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('orderbook');
            setSidebarTab('orderbook');
          }}
          className={`flex-1 py-1 rounded font-bold transition text-center text-[11px] flex items-center justify-center gap-1 ${
            mobileTab === 'orderbook'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <BarChart2 className="w-3 h-3" />
          <span>五檔</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('diagnosis');
            setSidebarTab('diagnosis');
          }}
          className={`flex-1 py-1 rounded font-bold transition text-center text-[11px] flex items-center justify-center gap-1 ${
            mobileTab === 'diagnosis'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Compass className="w-3 h-3" />
          <span>診斷</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('position');
            setSidebarTab('position');
          }}
          className={`flex-1 py-1 rounded font-bold transition text-center text-[11px] flex items-center justify-center gap-1 ${
            mobileTab === 'position'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <DollarSign className="w-3 h-3" />
          <span>部位</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('switcher');
            setSidebarTab('switcher');
          }}
          className={`flex-1 py-1 rounded font-bold transition text-center text-[11px] flex items-center justify-center gap-1 ${
            mobileTab === 'switcher'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Search className="w-3 h-3" />
          <span>選股</span>
        </button>
      </div>

      {/* MAIN WORKBENCH BODY: Split View Grid for Desktop */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden min-h-0">
        {/* LEFT / MAIN STAGE: CHART & TECHNICAL TOOLS (8 or 9 cols on Desktop) */}
        <div className={`lg:col-span-8 xl:col-span-9 flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 overflow-hidden flex-1 min-h-0 ${mobileTab === 'chart' ? 'flex' : 'hidden lg:flex'}`}>
          {/* TOOLBAR: Responsive 2-Row Layout on Mobile / Single-Row on Desktop */}
          <div className="bg-slate-900 border-b border-slate-800 px-1.5 sm:px-3 py-1 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 sm:gap-1.5 text-xs shrink-0 z-10">
            {/* Timeframe Segmented Switcher (Full Width Grid on Mobile, Compact on Desktop) */}
            <div className="w-full lg:w-auto">
              <div className="grid grid-cols-7 lg:flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 font-mono w-full">
                {(['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'] as ChartTimeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      playClickSound();
                      setTimeframe(tf);
                    }}
                    className={`py-1 lg:py-0.5 px-0.5 sm:px-2 rounded font-bold transition text-[11px] sm:text-xs text-center flex items-center justify-center ${
                      timeframe === tf
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tf === '1D' ? '分時' : tf === '5D' ? '5日' : tf === '1M' ? '日K' : tf === '3M' ? '季K' : tf === '6M' ? '半年' : tf === '1Y' ? '週K' : '月K'}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls & Indicators: Guaranteed 100% Fit on Mobile Screen */}
            <div className="flex items-center justify-between lg:justify-end gap-1 w-full lg:w-auto">
              {/* Chart Style Selector */}
              <select
                value={chartStyle}
                onChange={(e) => {
                  playClickSound();
                  setChartStyle(e.target.value as ChartRenderStyle);
                }}
                className="bg-slate-950 text-slate-200 border border-slate-800 text-[11px] font-bold rounded px-1.5 py-1 lg:py-0.5 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer shrink-0"
                aria-label="切換圖表模式"
              >
                <option value="candlestick">K線</option>
                <option value="area">面積圖</option>
                <option value="line">折線圖</option>
              </select>

              {/* Overlays: MA, Bollinger, VWAP */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    playClickSound();
                    setShowMA(!showMA);
                  }}
                  className={`px-1.5 py-1 lg:py-0.5 rounded text-[11px] font-mono font-bold transition border flex items-center gap-1 ${
                    showMA
                      ? 'bg-amber-950/70 border-amber-600/70 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="切換均線"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showMA ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  均線
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setShowBollinger(!showBollinger);
                  }}
                  className={`px-1.5 py-1 lg:py-0.5 rounded text-[11px] font-mono font-bold transition border flex items-center gap-1 ${
                    showBollinger
                      ? 'bg-blue-950/70 border-blue-600/70 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="切換布林通道"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showBollinger ? 'bg-blue-400' : 'bg-slate-600'}`} />
                  布林
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setShowPrevClose(!showPrevClose);
                  }}
                  className={`px-1.5 py-1 lg:py-0.5 rounded text-[11px] font-mono font-bold transition border flex items-center gap-1 ${
                    showPrevClose
                      ? 'bg-slate-800 border-slate-600 text-slate-200'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title="切換昨收參考線"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showPrevClose ? 'bg-slate-300' : 'bg-slate-700'}`} />
                  昨收
                </button>

                {(timeframe === '1D' || timeframe === '5D') && (
                  <button
                    onClick={() => {
                      playClickSound();
                      setShowVWAP(!showVWAP);
                    }}
                    className={`px-1.5 py-1 lg:py-0.5 rounded text-[11px] font-mono font-bold transition border flex items-center gap-1 ${
                      showVWAP
                        ? 'bg-orange-950/70 border-orange-600/70 text-orange-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="VWAP"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${showVWAP ? 'bg-orange-400' : 'bg-slate-600'}`} />
                    VWAP
                  </button>
                )}
              </div>

              {/* Sub-chart Indicator Dropdown */}
              <div className="flex items-center bg-slate-950 px-1 py-0.5 rounded border border-slate-800 font-mono shrink-0">
                <span className="text-[10px] text-slate-500 pr-0.5 font-bold hidden xs:inline">副圖:</span>
                <select
                  value={subIndicator}
                  onChange={(e) => {
                    playClickSound();
                    setSubIndicator(e.target.value as SubChartIndicator);
                  }}
                  className="bg-transparent text-slate-200 text-[11px] font-bold focus:outline-none cursor-pointer py-0.5 pr-0.5 font-mono"
                  aria-label="選擇副圖指標"
                >
                  <option value="volume" className="bg-slate-900 text-slate-200">量能</option>
                  <option value="kd" className="bg-slate-900 text-slate-200">KD</option>
                  <option value="rsi" className="bg-slate-900 text-slate-200">RSI</option>
                  <option value="macd" className="bg-slate-900 text-slate-200">MACD</option>
                  <option value="none" className="bg-slate-900 text-slate-400">關閉</option>
                </select>
              </div>
            </div>
          </div>

          {/* UNIFIED DYNAMIC INSPECTOR HUD: Responsive 2-Row on Mobile, 1-Row on Desktop so text never overflows */}
          <div className="bg-slate-950 border-b border-slate-800/80 px-2 sm:px-3 py-1 flex flex-col lg:flex-row lg:items-center lg:justify-between text-[10px] xs:text-[11px] sm:text-xs font-mono text-slate-300 shrink-0 gap-1 min-h-[28px]">
            {currentCandle ? (
              <>
                {/* Row 1: Time + OHLC + Volume */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2.5 w-full lg:w-auto overflow-x-auto no-scrollbar">
                  <span className="text-slate-400 flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                    <strong className="text-slate-200">{currentCandle.timeStr}</strong>
                  </span>
                  <div className="flex items-center gap-1.5 xs:gap-2 shrink-0">
                    <span className="text-slate-300">
                      開<strong className="text-slate-100 font-bold">${currentCandle.open.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-300">
                      高<strong className="text-rose-400 font-bold">${currentCandle.high.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-300">
                      低<strong className="text-emerald-400 font-bold">${currentCandle.low.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-300">
                      收<strong className="text-slate-100 font-bold">${currentCandle.close.toFixed(2)}</strong>
                    </span>
                    <span className="text-slate-300">
                      量<strong className="text-indigo-300 font-bold">{formatVolumeShort(currentCandle.volume, selectedChartTarget.market)}</strong>
                    </span>
                  </div>
                </div>

                {/* Row 2 (or inline on Desktop): Moving Averages & Overlays */}
                {(showMA || showBollinger || (showVWAP && (timeframe === '1D' || timeframe === '5D'))) && activeSubValues && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] xs:text-[11px] overflow-x-auto no-scrollbar lg:border-l lg:border-slate-800 lg:pl-2 shrink-0">
                    {showMA && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-amber-400 font-bold">5M:{activeSubValues.ma5 ? activeSubValues.ma5.toFixed(2) : '--'}</span>
                        <span className="text-cyan-400 font-bold">10M:{activeSubValues.ma10 ? activeSubValues.ma10.toFixed(2) : '--'}</span>
                        <span className="text-purple-400 font-bold">20M:{activeSubValues.ma20 ? activeSubValues.ma20.toFixed(2) : '--'}</span>
                        {activeSubValues.ma60 && (
                          <span className="text-orange-400 font-bold">60M:{activeSubValues.ma60.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    {showBollinger && (
                      <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800">
                        <span className="text-blue-400 font-bold">上:{activeSubValues.bbUpper ? activeSubValues.bbUpper.toFixed(2) : '--'}</span>
                        <span className="text-slate-300 font-bold">中:{activeSubValues.bbMid ? activeSubValues.bbMid.toFixed(2) : '--'}</span>
                        <span className="text-blue-400 font-bold">下:{activeSubValues.bbLower ? activeSubValues.bbLower.toFixed(2) : '--'}</span>
                      </div>
                    )}
                    {showVWAP && activeSubValues?.vwap && (timeframe === '1D' || timeframe === '5D') && (
                      <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800">
                        <span className="text-orange-400 font-bold">VWAP:{activeSubValues.vwap.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <span className="text-slate-500 text-xs py-0.5">點擊或游標滑動圖表檢視即時數據</span>
            )}
          </div>

          {/* INTERACTIVE CHART CANVAS CONTAINER - PROPORTIONALLY MANAGED FLEX */}
          <div className="flex-1 flex flex-col p-1 sm:p-2 relative overflow-hidden min-h-0">
            {loading && !mainChartData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 font-mono text-xs gap-3">
                <Activity className="w-6 h-6 animate-spin text-indigo-400" />
                <span>載入行情與深度技術指標中...</span>
              </div>
            ) : errorMsg && !mainChartData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-rose-400 font-mono text-xs gap-2">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
                <span>{errorMsg}</span>
                <button
                  onClick={() => fetchChartDataForTimeframe(selectedChartTarget, timeframe)}
                  className="mt-2 px-3 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700"
                >
                  重試
                </button>
              </div>
            ) : mainChartData ? (
              <div className="flex-1 flex flex-col w-full h-full min-h-0 relative">
                {loading && (
                  <div className="absolute top-2 right-2 z-20 bg-slate-900/85 text-indigo-400 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 backdrop-blur-xs shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    行情更新中...
                  </div>
                )}

                {/* Main Price Chart (Zero Obstruction Canvas) */}
                <div
                  className={`w-full relative min-h-0 transition-all ${
                    subIndicator === 'none' ? 'flex-1' : 'flex-[65] sm:flex-[70]'
                  }`}
                >
                  <Chart type={chartStyle === 'candlestick' ? 'bar' : 'line'} data={mainChartData} options={mainChartOptions} />
                </div>

                {/* Sub Indicator Chart with Slim Header Bar outside Canvas */}
                {subIndicator !== 'none' && subChartData && (
                  <div className="w-full flex-[35] sm:flex-[30] min-h-[90px] sm:min-h-[110px] border-t border-slate-800 flex flex-col min-h-0 relative mt-0.5">
                    {/* Non-overlapping Slim Subchart Header Strip */}
                    <div className="w-full bg-slate-950/90 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300 flex items-center justify-between border-b border-slate-800/60 shrink-0 no-scrollbar overflow-x-auto">
                      <div className="flex items-center gap-2 shrink-0">
                        {subIndicator === 'volume' && (
                          <>
                            <span className="text-slate-400">成交量:</span>
                            <span className="text-slate-100 font-bold">{activeSubValues?.vol?.toLocaleString() || 0} 股</span>
                            {activeSubValues?.volMa5 !== null && activeSubValues?.volMa5 !== undefined && (
                              <span className="text-amber-400 ml-1">5MA: {Math.round(activeSubValues.volMa5).toLocaleString()}</span>
                            )}
                            {activeSubValues?.volMa20 !== null && activeSubValues?.volMa20 !== undefined && (
                              <span className="text-purple-400 ml-1">20MA: {Math.round(activeSubValues.volMa20).toLocaleString()}</span>
                            )}
                          </>
                        )}
                        {subIndicator === 'kd' && (
                          <>
                            <span className="text-slate-400">KD(9,3,3)</span>
                            <span className="text-amber-400">K: {activeSubValues?.k !== undefined && activeSubValues?.k !== null ? activeSubValues.k.toFixed(1) : '--'}</span>
                            <span className="text-indigo-400">D: {activeSubValues?.d !== undefined && activeSubValues?.d !== null ? activeSubValues.d.toFixed(1) : '--'}</span>
                          </>
                        )}
                        {subIndicator === 'rsi' && (
                          <>
                            <span className="text-slate-400">RSI(14):</span>
                            <span className={activeSubValues?.rsi && activeSubValues.rsi >= 70 ? 'text-rose-400 font-bold' : activeSubValues?.rsi && activeSubValues.rsi <= 30 ? 'text-emerald-400 font-bold' : 'text-pink-400 font-bold'}>
                              {activeSubValues?.rsi !== undefined && activeSubValues?.rsi !== null ? activeSubValues.rsi.toFixed(1) : '--'}
                            </span>
                          </>
                        )}
                        {subIndicator === 'macd' && (
                          <>
                            <span className="text-slate-400">MACD(12,26,9)</span>
                            <span className="text-amber-400">DIF: {activeSubValues?.dif !== undefined && activeSubValues?.dif !== null ? (activeSubValues.dif >= 0 ? `+${activeSubValues.dif.toFixed(2)}` : activeSubValues.dif.toFixed(2)) : '--'}</span>
                            <span className="text-blue-400">DEM: {activeSubValues?.dem !== undefined && activeSubValues?.dem !== null ? (activeSubValues.dem >= 0 ? `+${activeSubValues.dem.toFixed(2)}` : activeSubValues.dem.toFixed(2)) : '--'}</span>
                            <span className={activeSubValues?.osc !== undefined && activeSubValues?.osc !== null && activeSubValues.osc >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                              OSC: {activeSubValues?.osc !== undefined && activeSubValues?.osc !== null ? (activeSubValues.osc >= 0 ? `+${activeSubValues.osc.toFixed(2)}` : activeSubValues.osc.toFixed(2)) : '--'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 w-full h-full min-h-0 relative">
                      <Chart type={subIndicator === 'macd' || subIndicator === 'volume' ? 'bar' : 'line'} data={subChartData} options={subChartOptions} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT / WORKSTATION SIDECAR: 4 DEDICATED PRO PANELS (4 or 3 cols on Desktop) */}
        <div className={`lg:col-span-4 xl:col-span-3 flex-col bg-slate-900 border-t lg:border-t-0 border-slate-800 overflow-hidden flex-1 ${mobileTab !== 'chart' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Sidecar Tab Switcher (Desktop only to prevent duplicate tabs on mobile) */}
          <div className="hidden lg:flex bg-slate-950 px-2 py-1.5 border-b border-slate-800 items-center justify-between gap-1 text-xs">
            <button
              onClick={() => {
                playClickSound();
                setSidebarTab('orderbook');
                setMobileTab('orderbook');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-[11px] sm:text-xs flex items-center justify-center gap-1 ${
                sidebarTab === 'orderbook'
                  ? 'bg-slate-800 text-indigo-300 border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>盤口五檔</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setSidebarTab('diagnosis');
                setMobileTab('diagnosis');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-[11px] sm:text-xs flex items-center justify-center gap-1 ${
                sidebarTab === 'diagnosis'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>多空診斷</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setSidebarTab('position');
                setMobileTab('position');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-[11px] sm:text-xs flex items-center justify-center gap-1 ${
                sidebarTab === 'position'
                  ? 'bg-slate-800 text-emerald-300 border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>我的部位</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setSidebarTab('switcher');
                setMobileTab('switcher');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-[11px] sm:text-xs flex items-center justify-center gap-1 ${
                sidebarTab === 'switcher'
                  ? 'bg-slate-800 text-purple-300 border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>選股切換</span>
            </button>
          </div>

          {/* Sidecar Tab Content Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 font-sans modal-content-scroll">
            {/* PANEL 1: LEVEL-2 ORDER BOOK & DRIVE METER */}
            {sidebarTab === 'orderbook' && (
              <div className="space-y-3 animate-fadeIn">
                {technicalSeries && (
                  <>
                    {/* In/Out Flow Meter */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" /> 外盤買進 {technicalSeries.orderBook.outerDrivePct}%
                        </span>
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          內盤賣出 {technicalSeries.orderBook.innerDrivePct}% <ArrowDownRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${technicalSeries.orderBook.outerDrivePct}%` }}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-500"
                          style={{ width: `${technicalSeries.orderBook.innerDrivePct}%` }}
                        />
                      </div>
                    </div>

                    {/* 5-Tier Bid / Ask Depth Table */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-1.5">
                        <span>委買量 (Bid)</span>
                        <span className="font-mono text-slate-200">五檔價位</span>
                        <span>委賣量 (Ask)</span>
                      </div>

                      {/* Asks (5 tiers - highest to lowest) */}
                      <div className="space-y-1 font-mono text-xs">
                        {technicalSeries.orderBook.asks.map((tier, idx) => (
                          <div key={`ask-${idx}`} className="relative flex justify-between items-center py-0.5 px-1 rounded hover:bg-slate-900">
                            <span className="text-slate-600 text-[10px]">--</span>
                            <span className="font-bold text-rose-400 z-10">${tier.price.toFixed(2)}</span>
                            <span className="text-slate-300 z-10 text-right w-16">{tier.volume}</span>
                            <div
                              className="absolute right-0 top-0 bottom-0 bg-rose-950/40 rounded-r transition-all"
                              style={{ width: `${tier.pct}%` }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="py-1 px-2 bg-slate-900/90 rounded border border-slate-800 flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-400 font-bold">現價</span>
                        <strong className="text-white text-sm">${activePrice.toFixed(2)}</strong>
                        <span className={`font-bold ${isActiveUp ? (isRedUp ? 'text-rose-400' : 'text-emerald-400') : (isRedUp ? 'text-emerald-400' : 'text-rose-400')}`}>
                          {isActiveUp ? '+' : ''}{activeDiff.toFixed(2)}
                        </span>
                      </div>

                      {/* Bids (5 tiers - highest to lowest) */}
                      <div className="space-y-1 font-mono text-xs">
                        {technicalSeries.orderBook.bids.map((tier, idx) => (
                          <div key={`bid-${idx}`} className="relative flex justify-between items-center py-0.5 px-1 rounded hover:bg-slate-900">
                            <span className="text-slate-300 z-10 w-16 text-left">{tier.volume}</span>
                            <span className="font-bold text-emerald-400 z-10">${tier.price.toFixed(2)}</span>
                            <span className="text-slate-600 text-[10px]">--</span>
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-emerald-950/40 rounded-l transition-all"
                              style={{ width: `${tier.pct}%` }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800 pt-1.5 font-mono">
                        <span>買盤總量: <strong className="text-emerald-400">{technicalSeries.orderBook.totalBidVol}</strong></span>
                        <span>賣盤總量: <strong className="text-rose-400">{technicalSeries.orderBook.totalAskVol}</strong></span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PANEL 2: TECHNICAL & AI DIAGNOSIS */}
            {sidebarTab === 'diagnosis' && (
              <div className="space-y-3 animate-fadeIn">
                {technicalSeries && (
                  <>
                    {/* Bullish / Bearish Score Gauge */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">技術多空綜合評分</div>
                        <div className="text-xl font-black font-mono tracking-tight mt-0.5" style={{ color: technicalSeries.diagnosis.signalColor }}>
                          {technicalSeries.diagnosis.overallSignal} ({technicalSeries.diagnosis.score}分)
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-mono font-black text-sm" style={{ borderColor: technicalSeries.diagnosis.signalColor, color: technicalSeries.diagnosis.signalColor }}>
                        {technicalSeries.diagnosis.score}
                      </div>
                    </div>

                    {/* Indicator Diagnostic Checklist */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400 font-medium">均線趨勢</span>
                        <span className="font-bold text-slate-200">{technicalSeries.diagnosis.maTrend}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400 font-medium">KD 狀態</span>
                        <span className="font-bold text-slate-200">{technicalSeries.diagnosis.kdSignal}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400 font-medium">RSI 強弱</span>
                        <span className="font-bold text-slate-200">{technicalSeries.diagnosis.rsiSignal}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400 font-medium">MACD 動能</span>
                        <span className="font-bold text-slate-200">{technicalSeries.diagnosis.macdSignal}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">量能變化</span>
                        <span className="font-bold text-slate-200">{technicalSeries.diagnosis.volumeSignal}</span>
                      </div>
                    </div>

                    {/* Support & Resistance Levels */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-indigo-400" />
                        <span>關鍵支撐與壓力關卡</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-rose-400 font-bold">第 2 壓力位 (R2)</div>
                          <div className="text-sm font-black text-white mt-0.5">${technicalSeries.levels.resistance2.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-rose-300 font-bold">第 1 壓力位 (R1)</div>
                          <div className="text-sm font-black text-white mt-0.5">${technicalSeries.levels.resistance.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-emerald-300 font-bold">第 1 支撐位 (S1)</div>
                          <div className="text-sm font-black text-white mt-0.5">${technicalSeries.levels.support.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-emerald-400 font-bold">第 2 支撐位 (S2)</div>
                          <div className="text-sm font-black text-white mt-0.5">${technicalSeries.levels.support2.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Advice Card */}
                    <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/60 text-xs space-y-1">
                      <div className="font-bold text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>操盤策略建議</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{technicalSeries.diagnosis.keyAdvice}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PANEL 3: MY POSITION & PROFIT SIMULATOR */}
            {sidebarTab === 'position' && (
              <div className="space-y-3 animate-fadeIn">
                {matchedPortfolioItem ? (
                  <>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-300">我的持股部位</div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-900 p-2 rounded-lg">
                          <span className="text-[10px] text-slate-400">持有股數</span>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {matchedPortfolioItem.shares.toLocaleString()} 股
                          </div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg">
                          <span className="text-[10px] text-slate-400">買入均價</span>
                          <div className="text-sm font-bold text-white mt-0.5">
                            ${matchedPortfolioItem.cost.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg">
                          <span className="text-[10px] text-slate-400">目前市值</span>
                          <div className="text-sm font-bold text-white mt-0.5">
                            ${(matchedPortfolioItem.shares * activePrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg">
                          <span className="text-[10px] text-slate-400">未實現損益</span>
                          <div
                            className={`text-sm font-bold mt-0.5 ${
                              activePrice >= matchedPortfolioItem.cost
                                ? isRedUp
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                                : isRedUp
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {activePrice >= matchedPortfolioItem.cost ? '+' : ''}
                            ${((activePrice - matchedPortfolioItem.cost) * matchedPortfolioItem.shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Target Price Profit Calculator */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>目標價出場獲利試算</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 shrink-0 font-mono">若漲至:</span>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                          <input
                            type="number"
                            step="0.1"
                            value={targetSimPrice}
                            onChange={(e) => setTargetSimPrice(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {simPriceNum > 0 && (
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs font-mono">
                          <div className="flex justify-between items-center text-slate-400">
                            <span>預估淨獲利</span>
                            <strong className={`text-sm font-bold ${simProfit >= 0 ? (isRedUp ? 'text-rose-400' : 'text-emerald-400') : (isRedUp ? 'text-emerald-400' : 'text-rose-400')}`}>
                              {simProfit >= 0 ? '+' : ''}${simProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </strong>
                          </div>
                          <div className="flex justify-between items-center text-slate-400">
                            <span>預估報酬率 (ROI)</span>
                            <strong className={`font-bold ${simROI >= 0 ? (isRedUp ? 'text-rose-400' : 'text-emerald-400') : (isRedUp ? 'text-emerald-400' : 'text-rose-400')}`}>
                              {simROI >= 0 ? '+' : ''}{simROI.toFixed(2)}%
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-2">
                    <DollarSign className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-sm font-bold text-slate-300">尚未持有此標的</div>
                    <p className="text-xs text-slate-500">
                      若要將此股票納入投資組合計算損益，請至首頁點選「新增持股」。
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PANEL 4: WATCHLIST & FAST MARKET EXPLORER */}
            {sidebarTab === 'switcher' && (
              <div className="space-y-3 animate-fadeIn">
                {/* In-Panel Search */}
                <div ref={searchContainerRef} className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={handleSearchChange}
                    placeholder="搜尋股票代號或名稱..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {searchInput && (
                    <button
                      onClick={() => {
                        setSearchInput('');
                        setSearchResults([]);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            playClickSound();
                            onSelectChartTarget(item.symbol, item.market, item.name);
                            setSearchInput('');
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-900/40 flex justify-between items-center text-xs transition border-b border-slate-800 last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{item.name}</span>
                            <span className="text-indigo-400 font-mono font-bold">{item.symbol}</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.2 rounded uppercase bg-indigo-950 text-indigo-300 font-bold">
                            {item.market}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-xs">
                  <button
                    onClick={() => {
                      playClickSound();
                      setSwitcherCategory('portfolio');
                    }}
                    className={`flex-1 py-1 rounded font-bold transition text-center ${
                      switcherCategory === 'portfolio'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    持股 ({portfolio.length})
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      setSwitcherCategory('indices');
                    }}
                    className={`flex-1 py-1 rounded font-bold transition text-center ${
                      switcherCategory === 'indices'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    主要指數
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      setSwitcherCategory('hot');
                    }}
                    className={`flex-1 py-1 rounded font-bold transition text-center ${
                      switcherCategory === 'hot'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    焦點熱門
                  </button>
                </div>

                {/* Switcher Item List */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {switcherCategory === 'portfolio' ? (
                    portfolio.length === 0 ? (
                      <div className="text-xs text-slate-500 py-4 text-center">尚未持有任何標的</div>
                    ) : (
                      portfolio.map((item) => {
                        const isSelected = item.symbol.toUpperCase() === selectedChartTarget.symbol.toUpperCase();
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              playClickSound();
                              onSelectChartTarget(item.symbol, item.market === 'us' ? 'us' : 'tse', item.name);
                            }}
                            className={`w-full p-2 rounded-lg text-left transition flex items-center justify-between border ${
                              isSelected
                                ? 'bg-indigo-950/70 border-indigo-600 text-white shadow-xs'
                                : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="font-bold text-xs truncate">{item.name}</div>
                              <div className="text-[10px] font-mono text-indigo-400">{item.symbol}</div>
                            </div>
                            {item.price && (
                              <div className="text-right font-mono">
                                <div className="text-xs font-bold text-white">${item.price.toFixed(2)}</div>
                                <div className={`text-[10px] ${item.price >= (item.prevClose || item.price) ? (isRedUp ? 'text-rose-400' : 'text-emerald-400') : (isRedUp ? 'text-emerald-400' : 'text-rose-400')}`}>
                                  {item.price >= (item.prevClose || item.price) ? '+' : ''}
                                  {(((item.price - (item.prevClose || item.price)) / (item.prevClose || item.price)) * 100).toFixed(2)}%
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })
                    )
                  ) : switcherCategory === 'indices' ? (
                    MARKET_INDICES.map((item) => {
                      const isSelected = item.symbol === selectedChartTarget.symbol;
                      return (
                        <button
                          key={item.symbol}
                          onClick={() => {
                            playClickSound();
                            onSelectChartTarget(item.symbol, item.market, item.name);
                          }}
                          className={`w-full p-2 rounded-lg text-left transition flex items-center justify-between border ${
                            isSelected
                              ? 'bg-indigo-950/70 border-indigo-600 text-white shadow-xs'
                              : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{item.name}</div>
                            <div className="text-[10px] font-mono text-indigo-400">{item.symbol}</div>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            指數
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    HOT_STOCKS.map((item) => {
                      const isSelected = item.symbol.toUpperCase() === selectedChartTarget.symbol.toUpperCase();
                      return (
                        <button
                          key={item.symbol}
                          onClick={() => {
                            playClickSound();
                            onSelectChartTarget(item.symbol, item.market, item.name);
                          }}
                          className={`w-full p-2 rounded-lg text-left transition flex items-center justify-between border ${
                            isSelected
                              ? 'bg-indigo-950/70 border-indigo-600 text-white shadow-xs'
                              : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{item.name}</div>
                            <div className="text-[10px] font-mono text-indigo-400">{item.symbol}</div>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                            {item.market}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
