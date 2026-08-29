import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  Sun,
  Moon,
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

interface CustomSelectOption<T extends string> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string> {
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (val: T) => void;
  isLight: boolean;
  ariaLabel: string;
}

function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  isLight,
  ariaLabel,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const currentOption = options.find((o) => o.value === value) || options[0];

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width, 92),
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleScroll() {
      setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <div className="relative shrink-0 z-30">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        className={`px-2 h-[22px] rounded text-[11px] sm:text-xs font-semibold transition border flex items-center justify-between gap-1 cursor-pointer shrink-0 leading-none ${
          isLight
            ? 'bg-white text-slate-800 border-slate-300 shadow-2xs hover:bg-slate-50 hover:border-slate-400'
            : 'bg-slate-950 text-slate-200 border-slate-700 hover:bg-slate-900 hover:border-slate-600'
        }`}
      >
        <span className="truncate">{currentOption?.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-150 shrink-0 ${open ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            minWidth: `${coords.width}px`,
          }}
          className={`z-[99999] py-1 rounded-md shadow-xl border font-sans animate-fadeIn ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 shadow-slate-400/30'
              : 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/90'
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                playClickSound();
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] sm:text-xs flex items-center justify-between transition cursor-pointer ${
                opt.value === value
                  ? isLight
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : 'bg-indigo-950/70 text-indigo-300 font-bold'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-700'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 ml-1.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

  // Theme Mode ('light' matching main page vs 'dark' pro terminal)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('stock_chart_theme') as 'dark' | 'light') || 'light';
  });
  const isLight = theme === 'light';

  const toggleTheme = () => {
    playClickSound();
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('stock_chart_theme', next);
      return next;
    });
  };

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
          interval = '1m';
          break;
        case '5D':
          range = '5d';
          interval = '5m';
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
      const isTick = chartStyle === 'tick';

      datasets.push({
        type: 'line' as const,
        label: isTick ? `${selectedChartTarget.name} 即時走勢 (Tick)` : `${selectedChartTarget.name} 走勢`,
        data: closes,
        borderColor: lineColor,
        borderWidth: isTick ? 1.5 : 1.4,
        fill: chartStyle === 'area' || isTick,
        tension: isTick ? 0.05 : 0.1,
        stepped: false,
        pointRadius: (ctx: { dataIndex: number }) => (ctx.dataIndex === closes.length - 1 ? (isTick ? 4.5 : 4) : 0),
        pointBackgroundColor: lineColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5,
        yAxisID: 'y',
        order: 2,
        backgroundColor: (context: {
          chart: { ctx: CanvasRenderingContext2D; chartArea?: { bottom: number; top: number } };
        }) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea || (chartStyle !== 'area' && !isTick)) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
          const alpha = isTick ? '0.12' : '0.18';
          gradient.addColorStop(1, isUpTrend ? (isRedUp ? `rgba(225, 29, 72, ${alpha})` : `rgba(5, 150, 105, ${alpha})`) : (isRedUp ? `rgba(5, 150, 105, ${alpha})` : `rgba(225, 29, 72, ${alpha})`));
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
          borderColor: isLight ? '#64748b' : '#94a3b8',
          borderWidth: 1.2,
          borderDash: [4, 4],
          label: {
            content: `昨收 $${pClose.toFixed(2)}`,
            display: true,
            position: 'end' as const,
            backgroundColor: isLight ? 'rgba(241, 245, 249, 0.95)' : 'rgba(15, 23, 42, 0.85)',
            color: isLight ? '#1e293b' : '#cbd5e1',
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
          grid: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: isLight ? '#64748b' : '#94a3b8',
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
          grid: { color: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)', borderDash: [2, 2] },
          ticks: {
            color: isLight ? '#334155' : '#cbd5e1',
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
    isLight,
    showPrevClose,
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
          grid: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)' },
          ticks: {
            color: isLight ? '#64748b' : '#94a3b8',
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
  }, [subIndicator, candles, volumeMax, isLight]);

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
    <div className={`fixed inset-0 z-[96] w-full h-[100dvh] max-h-screen flex flex-col overflow-hidden overscroll-none select-none modal-backdrop ${
      isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* LAYER 1: 最上方整合顯示股票資訊 (Top Header + Stock Quotation Grid - NO BUTTONS) */}
      <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} border-b flex flex-col shrink-0 shadow-xs z-20`}>
        {/* 1A. Top Command Bar Header */}
        <div className="px-2 py-0.5 flex items-center justify-between gap-1 shrink-0 h-8 sm:h-9">
          {/* Left: Return + Stock Identity + Live Price */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded border text-xs font-bold transition btn-interact shrink-0 ${
                isLight
                  ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
              title="返回上一層"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
            </button>

            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className={`text-[11px] sm:text-xs font-mono font-black px-1.5 py-0.5 rounded shrink-0 border ${
                isLight
                  ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                  : 'text-indigo-300 bg-indigo-950/90 border-indigo-700/60'
              }`}>
                {selectedChartTarget.symbol}
              </span>
              <h1 className={`text-xs sm:text-sm font-bold tracking-tight truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[180px] shrink-0 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {selectedChartTarget.name || selectedChartTarget.symbol}
              </h1>
              <span className={`text-[9px] font-bold px-1 py-0.2 rounded border uppercase shrink-0 hidden sm:inline ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {selectedChartTarget.market === 'us' ? '美股' : selectedChartTarget.market === 'otc' ? '上櫃' : '上市'}
              </span>
            </div>


          </div>

          {/* Right: Compact Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">

            {portfolioList.length > 1 && (
              <div className={`hidden sm:flex items-center rounded p-0.5 shrink-0 border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
              }`}>
                <button
                  onClick={handlePrevStock}
                  className={`p-0.5 rounded transition ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-700 text-slate-300'}`}
                  title="上一檔持股"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className={`text-[10px] font-mono px-1 font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {currentPortfolioIndex >= 0 ? `${currentPortfolioIndex + 1}/${portfolioList.length}` : '切換'}
                </span>
                <button
                  onClick={handleNextStock}
                  className={`p-0.5 rounded transition ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-700 text-slate-300'}`}
                  title="下一檔持股"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Theme Toggle Button (Light/Dark Switch) */}
            <button
              onClick={toggleTheme}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded border transition shrink-0 ${
                isLight
                  ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  : 'text-amber-300 hover:text-amber-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
              title={isLight ? '切換為暗黑專業操盤模式' : '切換為主頁亮色模式'}
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                playClickSound();
                fetchChartDataForTimeframe(selectedChartTarget, timeframe);
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded border transition shrink-0 ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700'
              }`}
              title="手動重新整理"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            </button>

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded border transition shrink-0 ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700'
              }`}
              title="關閉操盤終端"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1B. Intraday Real-time Large Quote & Technical Info Panel (No Buttons - Pure Stock Info) */}
        <div className={`px-3 py-1.5 sm:py-2 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          {/* Left Price Block */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>即時成交價</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight tabular-nums ${
                  isActiveUp
                    ? isRedUp ? 'text-rose-600' : 'text-emerald-600'
                    : isRedUp ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  ${activePrice.toFixed(2)}
                </span>
                <span className={`text-[11px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                  isActiveUp
                    ? isRedUp
                      ? 'text-rose-700 bg-rose-50 border border-rose-200/50 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-800/30'
                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200/50 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/30'
                    : isRedUp
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/50 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/30'
                    : 'text-rose-700 bg-rose-50 border border-rose-200/50 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-800/30'
                }`}>
                  {isActiveUp ? '▲' : '▼'}{activeDiff >= 0 ? '+' : ''}{activeDiff.toFixed(2)} ({isActiveUp ? '+' : ''}{activeDiffPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Right Statistics Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-1 flex-1 max-w-4xl font-mono">
            <div className="flex flex-col">
              <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>開盤</span>
              <span className={`text-xs sm:text-[13px] font-bold tabular-nums ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                ${currentCandle ? currentCandle.open.toFixed(2) : '--'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>最高</span>
              <span className={`text-xs sm:text-[13px] font-black tabular-nums ${isRedUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                ${currentCandle ? currentCandle.high.toFixed(2) : '--'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>最低</span>
              <span className={`text-xs sm:text-[13px] font-black tabular-nums ${isRedUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${currentCandle ? currentCandle.low.toFixed(2) : '--'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>昨收</span>
              <span className={`text-xs sm:text-[13px] font-bold tabular-nums ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                ${activePrevClose.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>成交量</span>
              <span className="text-xs sm:text-[13px] font-black text-indigo-500 dark:text-indigo-400 tabular-nums">
                {currentCandle ? formatVolumeShort(currentCandle.volume, selectedChartTarget.market) : '--'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>更新時間</span>
              <span className={`text-xs sm:text-[13px] font-medium tabular-nums ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {currentCandle ? currentCandle.timeStr : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LAYER 2A: MOBILE INTERACTIVE TAB BUTTONS (Always Visible Navigation Bar: K線 / 五檔 / 診斷 / 部位 / 選股) */}
      <div className={`lg:hidden border-b px-1 py-1 flex items-center justify-between gap-1 text-[10px] shrink-0 z-20 ${
        isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('chart');
          }}
          className={`flex-1 py-0.5 rounded font-bold transition text-center text-[10px] flex items-center justify-center gap-0.5 h-[22px] ${
            mobileTab === 'chart'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Activity className="w-2.5 h-2.5" />
          <span>K線</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('orderbook');
            setSidebarTab('orderbook');
          }}
          className={`flex-1 py-0.5 rounded font-bold transition text-center text-[10px] flex items-center justify-center gap-0.5 h-[22px] ${
            mobileTab === 'orderbook'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <BarChart2 className="w-2.5 h-2.5" />
          <span>五檔</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('diagnosis');
            setSidebarTab('diagnosis');
          }}
          className={`flex-1 py-0.5 rounded font-bold transition text-center text-[10px] flex items-center justify-center gap-0.5 h-[22px] ${
            mobileTab === 'diagnosis'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Compass className="w-2.5 h-2.5" />
          <span>診斷</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('position');
            setSidebarTab('position');
          }}
          className={`flex-1 py-0.5 rounded font-bold transition text-center text-[10px] flex items-center justify-center gap-0.5 h-[22px] ${
            mobileTab === 'position'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <DollarSign className="w-2.5 h-2.5" />
          <span>部位</span>
        </button>
        <button
          onClick={() => {
            playClickSound();
            setMobileTab('switcher');
            setSidebarTab('switcher');
          }}
          className={`flex-1 py-0.5 rounded font-bold transition text-center text-[10px] flex items-center justify-center gap-0.5 h-[22px] ${
            mobileTab === 'switcher'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Search className="w-2.5 h-2.5" />
          <span>選股</span>
        </button>
      </div>

      {/* MAIN WORKBENCH BODY: Split View Grid for Desktop */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden min-h-0">
        {/* LEFT / MAIN STAGE: CHART & TECHNICAL TOOLS (8 or 9 cols on Desktop) */}
        <div className={`lg:col-span-8 xl:col-span-9 flex-col border-b lg:border-b-0 lg:border-r overflow-hidden flex-1 min-h-0 ${
          isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
        } ${mobileTab === 'chart' ? 'flex' : 'hidden lg:flex'}`}>

          {/* LAYER 2: INTERACTIVE BUTTONS & INDICATOR NUMERICAL DATA (2. 互動按鈕, 數字資訊) */}
          <div className={`${isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'} flex flex-col shrink-0 z-10`}>

            {/* 2B. Timeframe Switcher Buttons (分時 / 5日 / 日K / 季K / 半年 / 週K / 月K) */}
            <div className={`px-1 py-0.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} flex items-center justify-center`}>
              <div className={`flex items-center p-0.5 rounded border font-mono w-full max-w-lg ${
                isLight ? 'bg-slate-200/50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                {(['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'] as ChartTimeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      playClickSound();
                      setTimeframe(tf);
                    }}
                    className={`flex-1 py-0.5 h-[20px] rounded font-bold transition text-[10px] sm:text-xs text-center flex items-center justify-center leading-none ${
                      timeframe === tf
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tf === '1D' ? '分時' : tf === '5D' ? '5日' : tf === '1M' ? '日K' : tf === '3M' ? '季K' : tf === '6M' ? '半年' : tf === '1Y' ? '週K' : '月K'}
                  </button>
                ))}
              </div>
            </div>

            {/* 2C. Indicator Control Buttons & Selectors (K線, 均線, 布林, 昨收, VWAP, 量能) */}
            <div className={`px-1.5 sm:px-3 py-0.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} flex items-center justify-between gap-1 overflow-x-auto no-scrollbar`}>
              <div className="flex items-center gap-1 shrink-0">
                {/* Chart Style Selector */}
                <CustomSelect
                  value={chartStyle}
                  options={[
                    { value: 'candlestick', label: 'K線' },
                    { value: 'tick', label: '即時 Tick' },
                    { value: 'area', label: '面積圖' },
                    { value: 'line', label: '折線圖' },
                  ]}
                  onChange={(val) => setChartStyle(val)}
                  isLight={isLight}
                  ariaLabel="切換圖表模式"
                />

                {/* Overlays: MA, Bollinger, PrevClose, VWAP */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      playClickSound();
                      setShowMA(!showMA);
                    }}
                    className={`px-1.5 h-[20px] rounded text-[10px] sm:text-[11px] font-medium transition border flex items-center gap-1 ${
                      showMA
                        ? isLight
                          ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                          : 'bg-amber-950/70 border-amber-600/70 text-amber-300 font-bold'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="切換均線"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${showMA ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    均線
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      setShowBollinger(!showBollinger);
                    }}
                    className={`px-1.5 h-[20px] rounded text-[10px] sm:text-[11px] font-medium transition border flex items-center gap-1 ${
                      showBollinger
                        ? isLight
                          ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                          : 'bg-blue-950/70 border-blue-600/70 text-blue-300 font-bold'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="切換布林通道"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${showBollinger ? 'bg-blue-500' : 'bg-slate-400'}`} />
                    布林
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      setShowPrevClose(!showPrevClose);
                    }}
                    className={`px-1.5 h-[20px] rounded text-[10px] sm:text-[11px] font-medium transition border flex items-center gap-1 ${
                      showPrevClose
                        ? isLight
                          ? 'bg-slate-200 border-slate-300 text-slate-800 font-bold'
                          : 'bg-slate-800 border-slate-600 text-slate-200 font-bold'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title="切換昨收參考線"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${showPrevClose ? 'bg-slate-600' : 'bg-slate-400'}`} />
                    昨收
                  </button>

                  {(timeframe === '1D' || timeframe === '5D') && (
                    <button
                      onClick={() => {
                        playClickSound();
                        setShowVWAP(!showVWAP);
                      }}
                      className={`px-1.5 h-[20px] rounded text-[10px] sm:text-[11px] font-medium transition border flex items-center gap-1 ${
                        showVWAP
                          ? isLight
                            ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold'
                            : 'bg-orange-950/70 border-orange-600/70 text-orange-300 font-bold'
                          : isLight
                          ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title="VWAP"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showVWAP ? 'bg-orange-500' : 'bg-slate-400'}`} />
                      VWAP
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-chart Indicator Dropdown */}
              <CustomSelect
                value={subIndicator}
                options={[
                  { value: 'volume', label: '量能' },
                  { value: 'kd', label: 'KD' },
                  { value: 'rsi', label: 'RSI' },
                  { value: 'macd', label: 'MACD' },
                  { value: 'none', label: '關閉副圖' },
                ]}
                onChange={(val) => setSubIndicator(val)}
                isLight={isLight}
                ariaLabel="選擇副圖指標"
              />
            </div>

            {/* 2D. Indicator Figures Ribbon (MA, BOLL, VWAP 數字資訊) */}
            {(showMA || showBollinger || (showVWAP && (timeframe === '1D' || timeframe === '5D'))) && activeSubValues && (
              <div className={`px-3 py-1 border-b flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] font-mono font-bold select-none shrink-0 ${
                isLight ? 'bg-slate-50/60 border-slate-200 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}>
                {showMA && (
                  <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-slate-800">
                    <span className="text-amber-500 text-[9px] font-black uppercase tracking-wider">MA</span>
                    <span className="text-amber-500">5MA: {activeSubValues.ma5 ? activeSubValues.ma5.toFixed(2) : '--'}</span>
                    <span className="text-cyan-500">10MA: {activeSubValues.ma10 ? activeSubValues.ma10.toFixed(2) : '--'}</span>
                    <span className="text-purple-500">20MA: {activeSubValues.ma20 ? activeSubValues.ma20.toFixed(2) : '--'}</span>
                    {activeSubValues.ma60 && (
                      <span className="text-orange-500">60MA: {activeSubValues.ma60.toFixed(2)}</span>
                    )}
                  </div>
                )}
                {showBollinger && (
                  <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-slate-800">
                    <span className="text-blue-500 text-[9px] font-black uppercase tracking-wider">BOLL</span>
                    <span className="text-blue-400">上軌: {activeSubValues.bbUpper ? activeSubValues.bbUpper.toFixed(2) : '--'}</span>
                    <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>中軌: {activeSubValues.bbMid ? activeSubValues.bbMid.toFixed(2) : '--'}</span>
                    <span className="text-blue-400">下軌: {activeSubValues.bbLower ? activeSubValues.bbLower.toFixed(2) : '--'}</span>
                  </div>
                )}
                {showVWAP && activeSubValues?.vwap && (timeframe === '1D' || timeframe === '5D') && (
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 text-[9px] font-black uppercase tracking-wider">VWAP</span>
                    <span className="text-orange-500">{activeSubValues.vwap.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* INTERACTIVE CHART CANVAS CONTAINER - FLEX-1 AUTO STRETCH TO FILL FULL VERTICAL SPACE */}
          <div className="flex-1 min-h-[250px] w-full flex flex-col p-0.5 sm:p-1 relative overflow-hidden">
            {loading && !mainChartData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-indigo-500 font-mono text-xs gap-3">
                <Activity className="w-6 h-6 animate-spin text-indigo-500" />
                <span>載入行情與深度技術指標中...</span>
              </div>
            ) : errorMsg && !mainChartData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-rose-500 font-mono text-xs gap-2">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
                <span>{errorMsg}</span>
                <button
                  onClick={() => fetchChartDataForTimeframe(selectedChartTarget, timeframe)}
                  className={`mt-2 px-3 py-1 border rounded-lg ${
                    isLight
                      ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  重試
                </button>
              </div>
            ) : mainChartData ? (
              <div className="flex-1 flex flex-col w-full h-full min-h-0 relative">
                {loading && (
                  <div className={`absolute top-2 right-2 z-20 text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 backdrop-blur-xs shadow-md border ${
                    isLight
                      ? 'bg-white/90 text-indigo-700 border-indigo-200'
                      : 'bg-slate-900/85 text-indigo-400 border-indigo-500/30'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
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
                  <div className={`w-full flex-[35] sm:flex-[30] min-h-[90px] sm:min-h-[110px] border-t flex flex-col min-h-0 relative mt-0.5 ${
                    isLight ? 'border-slate-200' : 'border-slate-800'
                  }`}>
                    {/* Non-overlapping Slim Subchart Header Strip */}
                    <div className={`w-full px-2 py-0.5 text-[10px] font-mono font-bold flex items-center justify-between border-b shrink-0 no-scrollbar overflow-x-auto ${
                      isLight
                        ? 'bg-slate-50 text-slate-700 border-slate-200'
                        : 'bg-slate-950/90 text-slate-300 border-slate-800/60'
                    }`}>
                      <div className="flex items-center gap-2 shrink-0">
                        {subIndicator === 'volume' && (
                          <>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>成交量:</span>
                            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{activeSubValues?.vol?.toLocaleString() || 0} 股</span>
                            {activeSubValues?.volMa5 !== null && activeSubValues?.volMa5 !== undefined && (
                              <span className={`${isLight ? 'text-amber-700' : 'text-amber-400'} ml-1`}>5MA: {Math.round(activeSubValues.volMa5).toLocaleString()}</span>
                            )}
                            {activeSubValues?.volMa20 !== null && activeSubValues?.volMa20 !== undefined && (
                              <span className={`${isLight ? 'text-purple-700' : 'text-purple-400'} ml-1`}>20MA: {Math.round(activeSubValues.volMa20).toLocaleString()}</span>
                            )}
                          </>
                        )}
                        {subIndicator === 'kd' && (
                          <>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>KD(9,3,3)</span>
                            <span className={isLight ? 'text-amber-700' : 'text-amber-400'}>K: {activeSubValues?.k !== undefined && activeSubValues?.k !== null ? activeSubValues.k.toFixed(1) : '--'}</span>
                            <span className={isLight ? 'text-indigo-700' : 'text-indigo-400'}>D: {activeSubValues?.d !== undefined && activeSubValues?.d !== null ? activeSubValues.d.toFixed(1) : '--'}</span>
                          </>
                        )}
                        {subIndicator === 'rsi' && (
                          <>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>RSI(14):</span>
                            <span className={activeSubValues?.rsi && activeSubValues.rsi >= 70 ? (isLight ? 'text-rose-600 font-bold' : 'text-rose-400 font-bold') : activeSubValues?.rsi && activeSubValues.rsi <= 30 ? (isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400 font-bold') : (isLight ? 'text-pink-700 font-bold' : 'text-pink-400 font-bold')}>
                              {activeSubValues?.rsi !== undefined && activeSubValues?.rsi !== null ? activeSubValues.rsi.toFixed(1) : '--'}
                            </span>
                          </>
                        )}
                        {subIndicator === 'macd' && (
                          <>
                            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>MACD(12,26,9)</span>
                            <span className={isLight ? 'text-amber-700' : 'text-amber-400'}>DIF: {activeSubValues?.dif !== undefined && activeSubValues?.dif !== null ? (activeSubValues.dif >= 0 ? `+${activeSubValues.dif.toFixed(2)}` : activeSubValues.dif.toFixed(2)) : '--'}</span>
                            <span className={isLight ? 'text-blue-700' : 'text-blue-400'}>DEM: {activeSubValues?.dem !== undefined && activeSubValues?.dem !== null ? (activeSubValues.dem >= 0 ? `+${activeSubValues.dem.toFixed(2)}` : activeSubValues.dem.toFixed(2)) : '--'}</span>
                            <span className={activeSubValues?.osc !== undefined && activeSubValues?.osc !== null && activeSubValues.osc >= 0 ? (isLight ? 'text-rose-600 font-bold' : 'text-rose-400 font-bold') : (isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400 font-bold')}>
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
        <div className={`lg:col-span-4 xl:col-span-3 flex-col border-t lg:border-t-0 overflow-hidden flex-1 ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        } ${mobileTab !== 'chart' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Sidecar Tab Switcher (Desktop only to prevent duplicate tabs on mobile) */}
          <div className={`hidden lg:flex px-2 py-1.5 border-b items-center justify-between gap-1 text-xs ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <button
              onClick={() => {
                playClickSound();
                setSidebarTab('orderbook');
                setMobileTab('orderbook');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center text-[11px] sm:text-xs flex items-center justify-center gap-1 ${
                sidebarTab === 'orderbook'
                  ? isLight
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                    : 'bg-slate-800 text-indigo-300 border border-slate-700 shadow-xs'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800'
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
                  ? isLight
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs'
                    : 'bg-slate-800 text-amber-300 border border-slate-700 shadow-xs'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800'
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
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                    : 'bg-slate-800 text-emerald-300 border border-slate-700 shadow-xs'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800'
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
                  ? isLight
                    ? 'bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs'
                    : 'bg-slate-800 text-purple-300 border border-slate-700 shadow-xs'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800'
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
                    <div className={`p-2.5 rounded-xl border space-y-1.5 ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          <ArrowUpRight className="w-3.5 h-3.5" /> 外盤買進 {technicalSeries.orderBook.outerDrivePct}%
                        </span>
                        <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                          內盤賣出 {technicalSeries.orderBook.innerDrivePct}% <ArrowDownRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden flex ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
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

                    {/* 5-Tier Bid / Ask Depth Table (Side-by-Side: Left Buy, Right Sell) */}
                    <div className={`p-2.5 rounded-xl border space-y-2 ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                    }`}>
                      {/* Explanatory Header Badges */}
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800 font-sans">
                        <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          買盤 (委買進)
                        </span>
                        <span className="text-slate-400 text-[10px] font-medium">五檔撮合隊伍</span>
                        <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          賣盤 (委賣出)
                        </span>
                      </div>

                      {/* Column Title Row */}
                      <div className={`grid grid-cols-4 text-center text-xs font-bold py-1 px-2 rounded ${
                        isLight ? 'bg-slate-100/80 text-slate-600' : 'bg-slate-900 text-slate-400'
                      }`}>
                        <span className="text-left">買量 (張)</span>
                        <span className="text-right pr-2">買價</span>
                        <span className="text-left pl-2 border-l border-slate-300 dark:border-slate-700">賣價</span>
                        <span className="text-right">賣量 (張)</span>
                      </div>

                      {/* 5-Tier Side-by-Side Rows */}
                      <div className="space-y-1 font-mono text-xs">
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const bid = technicalSeries.orderBook.bids[idx];
                          const ask = technicalSeries.orderBook.asks[technicalSeries.orderBook.asks.length - 1 - idx];
                          if (!bid || !ask) return null;

                          return (
                            <div
                              key={`order-tier-${idx}`}
                              className={`relative grid grid-cols-4 items-center py-1.5 px-2 rounded transition ${
                                isLight ? 'hover:bg-slate-100/70' : 'hover:bg-slate-900/80'
                              }`}
                            >
                              {/* 買量 (Bid Vol) + Depth Bar */}
                              <div className="relative flex items-center justify-start z-10 font-semibold pr-1">
                                <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                                  {bid.volume}
                                </span>
                                <div
                                  className={`absolute left-0 top-0 bottom-0 rounded-l transition-all -z-10 ${
                                    isLight ? 'bg-emerald-100/80' : 'bg-emerald-950/50'
                                  }`}
                                  style={{ width: `${bid.pct}%` }}
                                />
                              </div>

                              {/* 買價 (Bid Price) */}
                              <div className="text-right pr-2 z-10 font-bold text-emerald-600 dark:text-emerald-400">
                                ${bid.price.toFixed(2)}
                              </div>

                              {/* 賣價 (Ask Price) */}
                              <div className="text-left pl-2 z-10 font-bold text-rose-600 dark:text-rose-400 border-l border-slate-200 dark:border-slate-800">
                                ${ask.price.toFixed(2)}
                              </div>

                              {/* 賣量 (Ask Vol) + Depth Bar */}
                              <div className="relative flex items-center justify-end z-10 font-semibold pl-1">
                                <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                                  {ask.volume}
                                </span>
                                <div
                                  className={`absolute right-0 top-0 bottom-0 rounded-r transition-all -z-10 ${
                                    isLight ? 'bg-rose-100/80' : 'bg-rose-950/50'
                                  }`}
                                  style={{ width: `${ask.pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Current Price Banner */}
                      <div className={`py-1.5 px-3 rounded-lg border flex justify-between items-center text-xs font-mono shadow-2xs ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className={`font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>最新成交價</span>
                        </div>
                        <strong className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          ${activePrice.toFixed(2)}
                        </strong>
                        <span className={`font-bold text-xs ${
                          isActiveUp
                            ? (isRedUp ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-600' : 'text-emerald-400'))
                            : (isRedUp ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400'))
                        }`}>
                          {isActiveUp ? '+' : ''}{activeDiff.toFixed(2)}
                        </span>
                      </div>

                      <div className={`flex justify-between items-center text-[11px] border-t pt-2 font-mono ${
                        isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-800'
                      }`}>
                        <span>買盤掛單總量: <strong className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{technicalSeries.orderBook.totalBidVol} 張</strong></span>
                        <span>賣盤掛單總量: <strong className={isLight ? 'text-rose-700' : 'text-rose-400'}>{technicalSeries.orderBook.totalAskVol} 張</strong></span>
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
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div>
                        <div className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>技術多空綜合評分</div>
                        <div className="text-xl font-black font-mono tracking-tight mt-0.5" style={{ color: technicalSeries.diagnosis.signalColor }}>
                          {technicalSeries.diagnosis.overallSignal} ({technicalSeries.diagnosis.score}分)
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-mono font-black text-sm" style={{ borderColor: technicalSeries.diagnosis.signalColor, color: technicalSeries.diagnosis.signalColor }}>
                        {technicalSeries.diagnosis.score}
                      </div>
                    </div>

                    {/* Indicator Diagnostic Checklist */}
                    <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className={`flex justify-between items-center border-b pb-1.5 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
                        <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>均線趨勢</span>
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{technicalSeries.diagnosis.maTrend}</span>
                      </div>
                      <div className={`flex justify-between items-center border-b pb-1.5 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
                        <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>KD 狀態</span>
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{technicalSeries.diagnosis.kdSignal}</span>
                      </div>
                      <div className={`flex justify-between items-center border-b pb-1.5 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
                        <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>RSI 強弱</span>
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{technicalSeries.diagnosis.rsiSignal}</span>
                      </div>
                      <div className={`flex justify-between items-center border-b pb-1.5 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
                        <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>MACD 動能</span>
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{technicalSeries.diagnosis.macdSignal}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>量能變化</span>
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{technicalSeries.diagnosis.volumeSignal}</span>
                      </div>
                    </div>

                    {/* Support & Resistance Levels */}
                    <div className={`p-3 rounded-xl border space-y-2 ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                        <Target className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                        <span>關鍵支撐與壓力關卡</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className={`p-2 rounded-lg border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className={`text-[10px] font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>第 2 壓力位 (R2)</div>
                          <div className={`text-sm font-black mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>${technicalSeries.levels.resistance2.toFixed(2)}</div>
                        </div>
                        <div className={`p-2 rounded-lg border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className={`text-[10px] font-bold ${isLight ? 'text-rose-500' : 'text-rose-300'}`}>第 1 壓力位 (R1)</div>
                          <div className={`text-sm font-black mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>${technicalSeries.levels.resistance.toFixed(2)}</div>
                        </div>
                        <div className={`p-2 rounded-lg border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className={`text-[10px] font-bold ${isLight ? 'text-emerald-500' : 'text-emerald-300'}`}>第 1 支撐位 (S1)</div>
                          <div className={`text-sm font-black mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>${technicalSeries.levels.support.toFixed(2)}</div>
                        </div>
                        <div className={`p-2 rounded-lg border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className={`text-[10px] font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>第 2 支撐位 (S2)</div>
                          <div className={`text-sm font-black mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>${technicalSeries.levels.support2.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Advice Card */}
                    <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                      isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-950/40 border-indigo-800/60'
                    }`}>
                      <div className={`font-bold flex items-center gap-1 ${isLight ? 'text-indigo-800' : 'text-indigo-300'}`}>
                        <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                        <span>操盤策略建議</span>
                      </div>
                      <p className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{technicalSeries.diagnosis.keyAdvice}</p>
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
                    <div className={`p-3 rounded-xl border space-y-2 ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>我的持股部位</div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>持有股數</span>
                          <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {matchedPortfolioItem.shares.toLocaleString()} 股
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>買入均價</span>
                          <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            ${matchedPortfolioItem.cost.toFixed(2)}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>目前市值</span>
                          <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            ${(matchedPortfolioItem.shares * activePrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>未實現損益</span>
                          <div
                            className={`text-sm font-bold mt-0.5 ${
                              activePrice >= matchedPortfolioItem.cost
                                ? isRedUp
                                  ? isLight ? 'text-rose-600' : 'text-rose-400'
                                  : isLight ? 'text-emerald-600' : 'text-emerald-400'
                                : isRedUp
                                ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                                : isLight ? 'text-rose-600' : 'text-rose-400'
                            }`}
                          >
                            {activePrice >= matchedPortfolioItem.cost ? '+' : ''}
                            ${((activePrice - matchedPortfolioItem.cost) * matchedPortfolioItem.shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Target Price Profit Calculator */}
                    <div className={`p-3 rounded-xl border space-y-2 ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                        <DollarSign className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        <span>目標價出場獲利試算</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs shrink-0 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>若漲至:</span>
                        <div className="relative flex-1">
                          <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            value={targetSimPrice}
                            onChange={(e) => setTargetSimPrice(e.target.value)}
                            className={`w-full border rounded-lg pl-6 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500 ${
                              isLight
                                ? 'bg-slate-50 border-slate-300 text-slate-900'
                                : 'bg-slate-900 border-slate-700 text-white'
                            }`}
                          />
                        </div>
                      </div>

                      {simPriceNum > 0 && (
                        <div className={`p-2.5 rounded-lg border space-y-1 text-xs font-mono ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className={`flex justify-between items-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <span>預估淨獲利</span>
                            <strong className={`text-sm font-bold ${
                              simProfit >= 0
                                ? isRedUp ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-600' : 'text-emerald-400')
                                : isRedUp ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                            }`}>
                              {simProfit >= 0 ? '+' : ''}${simProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </strong>
                          </div>
                          <div className={`flex justify-between items-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <span>預估報酬率 (ROI)</span>
                            <strong className={`font-bold ${
                              simROI >= 0
                                ? isRedUp ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-600' : 'text-emerald-400')
                                : isRedUp ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                            }`}>
                              {simROI >= 0 ? '+' : ''}{simROI.toFixed(2)}%
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={`p-6 rounded-xl border text-center space-y-2 ${
                    isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <DollarSign className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>尚未持有此標的</div>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
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
                  <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    inputMode="search"
                    value={searchInput}
                    onChange={handleSearchChange}
                    placeholder="搜尋股票代號或名稱..."
                    className={`w-full border rounded-lg pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-2xs'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    }`}
                  />
                  {searchInput && (
                    <button
                      onClick={() => {
                        setSearchInput('');
                        setSearchResults([]);
                      }}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-white'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {searchResults.length > 0 && (
                    <div className={`absolute top-full mt-1 left-0 right-0 border rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
                    }`}>
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            playClickSound();
                            onSelectChartTarget(item.symbol, item.market, item.name);
                            setSearchInput('');
                            setSearchResults([]);
                          }}
                          className={`w-full text-left px-3 py-2 flex justify-between items-center text-xs transition border-b last:border-b-0 ${
                            isLight
                              ? 'hover:bg-indigo-50 border-slate-100 text-slate-900'
                              : 'hover:bg-indigo-900/40 border-slate-800 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.name}</span>
                            <span className={`font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{item.symbol}</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                            isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-950 text-indigo-300'
                          }`}>
                            {item.market}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className={`flex items-center p-0.5 rounded-lg border font-mono text-xs ${
                  isLight ? 'bg-slate-200/70 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <button
                    onClick={() => {
                      playClickSound();
                      setSwitcherCategory('portfolio');
                    }}
                    className={`flex-1 py-1 rounded font-bold transition text-center ${
                      switcherCategory === 'portfolio'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
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
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
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
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
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
                                ? isLight
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-xs'
                                  : 'bg-indigo-950/70 border-indigo-600 text-white shadow-xs'
                                : isLight
                                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="font-bold text-xs truncate">{item.name}</div>
                              <div className={`text-[10px] font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{item.symbol}</div>
                            </div>
                            {item.price && (
                              <div className="text-right font-mono">
                                <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>${item.price.toFixed(2)}</div>
                                <div className={`text-[10px] font-bold ${
                                  item.price >= (item.prevClose || item.price)
                                    ? isRedUp ? (isLight ? 'text-rose-600' : 'text-rose-400') : (isLight ? 'text-emerald-600' : 'text-emerald-400')
                                    : isRedUp ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
                                }`}>
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
                              ? isLight
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-xs'
                                : 'bg-indigo-950/70 border-indigo-600 text-white shadow-xs'
                              : isLight
                              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                              : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{item.name}</div>
                            <div className={`text-[10px] font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{item.symbol}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                          }`}>
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
                              ? isLight
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-xs'
                                : 'bg-indigo-950/70 border-indigo-600 text-white shadow-xs'
                              : isLight
                              ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                              : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{item.name}</div>
                            <div className={`text-[10px] font-mono font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{item.symbol}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                          }`}>
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
