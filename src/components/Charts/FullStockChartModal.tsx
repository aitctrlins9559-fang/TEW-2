import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  BarChart2,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Search,
  PieChart,
  BarChart,
  Sliders,
  Sparkles,
  Info,
  DollarSign,
  Percent,
  Layers,
  Flame,
  Volume2,
  ArrowLeft,
  Clock,
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
import { StockPosition, ChartTarget, MarketType, IntradayData } from '../../types';
import { playClickSound } from '../../utils/audio';
import { apiFetchChartData, apiSearchStock } from '../../utils/apiClient';
import { searchLocalDictionary } from '../../data/stockDictionary';
import { getMarketStatusInfo } from '../../utils/marketHelper';

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

interface FullStockChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: StockPosition[];
  selectedChartTarget: ChartTarget;
  onSelectChartTarget: (symbol: string, market: MarketType, name: string) => void;
  isRedUp: boolean;
  onOpenAICopilot?: () => void;
}

// Quick Switcher Preset Categories
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

function generateFullTradingSession(
  market: MarketType,
  symbol: string,
  ts: number[],
  quotes: number[],
  rawVolumes: number[] = []
) {
  const isUS = market === 'us' || symbol === '^DJI' || symbol === '^GSPC' || symbol === '^IXIC';
  const isJP = symbol === '^N225';
  const isKR = symbol === '^KS11';

  let timeZone = 'Asia/Taipei';
  let startMins = 9 * 60; // 09:00
  let endMins = 13 * 60 + 30; // 13:30

  if (isUS) {
    timeZone = 'America/New_York';
    startMins = 9 * 60 + 30; // 09:30
    endMins = 16 * 60; // 16:00
  } else if (isJP) {
    timeZone = 'Asia/Tokyo';
    startMins = 9 * 60; // 09:00
    endMins = 15 * 60; // 15:00
  } else if (isKR) {
    timeZone = 'Asia/Seoul';
    startMins = 9 * 60; // 09:00
    endMins = 15 * 60 + 30; // 15:30
  }

  const fullLabels: string[] = [];
  for (let m = startMins; m <= endMins; m += 5) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    fullLabels.push(`${hh}:${mm}`);
  }

  const priceMap = new Map<string, number>();
  const volumeMap = new Map<string, number>();
  const validPrices: number[] = [];

  ts.forEach((t, i) => {
    if (typeof quotes[i] === 'number' && quotes[i] > 0) {
      const d = new Date(t * 1000);
      let timeStr = '';
      try {
        timeStr = d.toLocaleTimeString('en-GB', {
          timeZone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        timeStr = `${hh}:${mm}`;
      }

      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hh = Number(parts[0]);
        const mm = Number(parts[1]);
        const roundedMm = Math.floor(mm / 5) * 5;
        const key = `${String(hh).padStart(2, '0')}:${String(roundedMm).padStart(2, '0')}`;
        priceMap.set(key, quotes[i]);
        if (typeof rawVolumes[i] === 'number') {
          volumeMap.set(key, rawVolumes[i]);
        }
      }
      validPrices.push(quotes[i]);
    }
  });

  if (validPrices.length === 0) {
    return { fullLabels: [], fullPrices: [], validPrices: [], fullVolumes: [] };
  }

  let latestAvailableIndex = -1;
  fullLabels.forEach((label, idx) => {
    if (priceMap.has(label)) {
      latestAvailableIndex = idx;
    }
  });

  const fullPrices: (number | null)[] = [];
  const fullVolumes: number[] = [];

  if (latestAvailableIndex === -1) {
    for (let i = 0; i < fullLabels.length; i++) {
      if (i < validPrices.length) {
        fullPrices.push(validPrices[i]);
        fullVolumes.push(rawVolumes[i] || 0);
      } else {
        fullPrices.push(null);
        fullVolumes.push(0);
      }
    }
    return { fullLabels, fullPrices, validPrices, fullVolumes };
  }

  let lastVal: number | null = null;
  for (let i = 0; i < fullLabels.length; i++) {
    const label = fullLabels[i];
    if (priceMap.has(label)) {
      lastVal = priceMap.get(label)!;
      fullPrices.push(lastVal);
      fullVolumes.push(volumeMap.get(label) || 0);
    } else if (i <= latestAvailableIndex) {
      fullPrices.push(lastVal);
      fullVolumes.push(0);
    } else {
      fullPrices.push(null);
      fullVolumes.push(0);
    }
  }

  return { fullLabels, fullPrices, validPrices, fullVolumes };
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
  const [intradayData, setIntradayData] = useState<IntradayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Indicators toggles
  const [showVWAP, setShowVWAP] = useState(true);
  const [showMA5, setShowMA5] = useState(false);
  const [showVolumeBars, setShowVolumeBars] = useState(true);

  // Quick Switcher search & category tabs
  const [switcherTab, setSwitcherTab] = useState<'portfolio' | 'indices' | 'hot'>('portfolio');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ symbol: string; name: string; market: MarketType }>
  >([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchQueryRef = useRef<string>('');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Match current target with portfolio item
  const matchedPortfolioItem = useMemo(() => {
    return portfolio.find(
      (p) => p.symbol === selectedChartTarget.symbol && p.market === selectedChartTarget.market
    );
  }, [portfolio, selectedChartTarget]);

  // Handle Search Input in Modal
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    lastSearchQueryRef.current = val;

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
      const currentQ = val;
      try {
        const res = await apiSearchStock(currentQ);
        if (lastSearchQueryRef.current === currentQ) {
          if (Array.isArray(res)) {
            setSearchResults(res.slice(0, 10));
          }
        }
      } catch {
        // Keep local matches if any
      }
    }, 120);
  };

  // Fetch Intraday Data
  const fetchIntradayData = useCallback(
    async (target: ChartTarget) => {
      if (!target.symbol) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        const s =
          target.symbol.startsWith('^')
            ? target.symbol
            : target.market === 'tse'
            ? `${target.symbol}.TW`
            : target.market === 'otc'
            ? `${target.symbol}.TWO`
            : target.symbol;

        const currentPrice = matchedPortfolioItem?.price && matchedPortfolioItem.price > 0 ? matchedPortfolioItem.price : undefined;
        const json = await apiFetchChartData(s, '1d', '5m', currentPrice);

        if (!json || !json.success || !json.meta) {
          throw new Error('暫無即時分時行情數據');
        }

        const meta = json.meta;
        const ts: number[] = json.timestamp || [];
        const quotes: number[] = json.quotes || [];
        const rawVolumes: number[] = json.volumes || [];

        const { fullLabels, fullPrices, validPrices, fullVolumes } = generateFullTradingSession(
          target.market,
          target.symbol,
          ts,
          quotes,
          rawVolumes
        );

        if (validPrices.length === 0) {
          throw new Error('暫無盤中分時走勢數據');
        }

        const prevClose = meta.chartPreviousClose || meta.previousClose || validPrices[0];
        let latestPrice = validPrices[validPrices.length - 1];
        if (matchedPortfolioItem?.price && matchedPortfolioItem.price > 0) {
          latestPrice = matchedPortfolioItem.price;
        }

        const openPrice = meta.regularMarketOpen || meta.open || validPrices[0] || prevClose;
        const highPrice = Math.max(...validPrices);
        const lowPrice = Math.min(...validPrices);

        let totalVolume = meta.regularMarketVolume || meta.volume || 0;
        if (totalVolume === 0 && fullVolumes.length > 0) {
          totalVolume = fullVolumes.reduce((a, b) => a + b, 0);
        }

        // Estimated volume calculation based on current session progress
        const validCount = validPrices.length;
        const totalSessionIntervals = 54; // ~54 5-min blocks in a standard 4.5h trading session
        const sessionProgress = Math.max(0.1, Math.min(1.0, validCount / totalSessionIntervals));
        const estimatedVolume = Math.round(totalVolume / sessionProgress);

        const limitUpPrice = prevClose * 1.1;
        const limitDownPrice = prevClose * 0.9;
        const amplitudePct = prevClose > 0 ? ((highPrice - lowPrice) / prevClose) * 100 : 0;

        const rangeSpan = highPrice - lowPrice;
        const rangePct = rangeSpan > 0 ? ((latestPrice - lowPrice) / rangeSpan) * 100 : 50;

        const lastTs = meta.regularMarketTime || (ts.length > 0 ? ts[ts.length - 1] : undefined);
        const marketStatus = getMarketStatusInfo(target.market, target.symbol, lastTs);

        setIntradayData({
          symbol: target.symbol,
          market: target.market,
          name: target.name || target.symbol,
          prevClose,
          openPrice,
          highPrice,
          lowPrice,
          latestPrice,
          totalVolume,
          estimatedVolume,
          limitUpPrice,
          limitDownPrice,
          amplitudePct,
          rangePct,
          labels: fullLabels,
          prices: fullPrices as number[],
          volumes: fullVolumes,
          tradingDateStr: marketStatus.tradingDateStr,
          isMarketOpen: marketStatus.isMarketOpen,
          marketStatusText: marketStatus.statusText,
        });
      } catch (err) {
        setErrorMsg((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [matchedPortfolioItem]
  );

  useEffect(() => {
    if (isOpen && selectedChartTarget.symbol) {
      fetchIntradayData(selectedChartTarget);
    }
  }, [isOpen, selectedChartTarget, fetchIntradayData]);

  const getUpColor = useCallback(() => (isRedUp ? '#e11d48' : '#059669'), [isRedUp]);
  const getDownColor = useCallback(() => (isRedUp ? '#059669' : '#e11d48'), [isRedUp]);

  // Stepper navigation (< / >)
  const portfolioList = useMemo(() => {
    return portfolio.map((p) => ({ symbol: p.symbol, market: p.market, name: p.name }));
  }, [portfolio]);

  const currentPortfolioIndex = useMemo(() => {
    return portfolioList.findIndex(
      (p) => p.symbol === selectedChartTarget.symbol && p.market === selectedChartTarget.market
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

  // Chart datasets & multi-axis volume bar setup
  const chartData = useMemo(() => {
    if (!intradayData) return null;
    const diff = intradayData.latestPrice - intradayData.prevClose;
    const lineColor = diff >= 0 ? getUpColor() : getDownColor();

    const lastValidIdx = intradayData.prices.findLastIndex((p) => p !== null && p !== undefined);

    // Calculate VWAP (cumulative average)
    const vwapData: (number | null)[] = [];
    let cumSum = 0;
    let count = 0;
    intradayData.prices.forEach((p) => {
      if (p !== null && p !== undefined) {
        cumSum += p;
        count += 1;
        vwapData.push(cumSum / count);
      } else {
        vwapData.push(null);
      }
    });

    // Calculate MA5 (5-point moving average)
    const ma5Data: (number | null)[] = [];
    intradayData.prices.forEach((p, idx) => {
      if (p === null || p === undefined) {
        ma5Data.push(null);
      } else {
        const slice = intradayData.prices
          .slice(Math.max(0, idx - 4), idx + 1)
          .filter((x): x is number => x !== null && x !== undefined);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        ma5Data.push(avg);
      }
    });

    // Color code volume bars based on price direction relative to previous tick
    const volumeColors: string[] = [];
    const volumes = intradayData.volumes || [];
    let prevP = intradayData.prevClose;

    intradayData.prices.forEach((p) => {
      if (p !== null && p !== undefined) {
        if (p >= prevP) {
          volumeColors.push(getUpColor() + '80'); // opacity
        } else {
          volumeColors.push(getDownColor() + '80');
        }
        prevP = p;
      } else {
        volumeColors.push('transparent');
      }
    });

    const datasets: any[] = [
      {
        type: 'line' as const,
        label: `${intradayData.name} 分時價`,
        data: intradayData.prices,
        borderColor: lineColor,
        borderWidth: 2.5,
        fill: true,
        spanGaps: false,
        tension: 0.15,
        pointRadius: (ctx: { dataIndex: number }) => (ctx.dataIndex === lastValidIdx ? 6 : 0),
        pointBackgroundColor: lineColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        pointHitRadius: 20,
        yAxisID: 'y',
        backgroundColor: (context: {
          chart: { ctx: CanvasRenderingContext2D; chartArea?: { bottom: number; top: number } };
        }) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(241, 245, 249, 0)');
          gradient.addColorStop(1, diff >= 0 ? 'rgba(5, 150, 105, 0.15)' : 'rgba(225, 29, 72, 0.15)');
          return gradient;
        },
      },
    ];

    if (showVWAP) {
      datasets.push({
        type: 'line' as const,
        label: '當日 VWAP 均價線',
        data: vwapData,
        borderColor: '#d97706', // Amber 600
        borderWidth: 1.5,
        borderDash: [3, 3],
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
      });
    }

    if (showMA5) {
      datasets.push({
        type: 'line' as const,
        label: 'MA5 均線',
        data: ma5Data,
        borderColor: '#9333ea', // Purple 600
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y',
      });
    }

    if (showVolumeBars && volumes.length > 0) {
      datasets.push({
        type: 'bar' as const,
        label: '分時成交量',
        data: volumes,
        backgroundColor: volumeColors,
        borderWidth: 0,
        barThickness: 'flex',
        yAxisID: 'y1',
      });
    }

    return {
      labels: intradayData.labels,
      datasets,
    };
  }, [intradayData, getUpColor, getDownColor, showVWAP, showMA5, showVolumeBars]);

  const maxVolume = useMemo(() => {
    if (!intradayData || !intradayData.volumes) return 1000;
    return Math.max(...intradayData.volumes, 10);
  }, [intradayData]);

  const options = useMemo(() => {
    if (!intradayData) return {};
    const prevClose = intradayData.prevClose;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#38bdf8',
          bodyColor: '#f8fafc',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            title: (items: Array<{ label: string }>) => `時間: ${items[0]?.label || ''}`,
            label: (item: { raw: unknown; dataset: { label: string; yAxisID?: string } }) => {
              if (item.raw === null || item.raw === undefined) return `${item.dataset.label}: --`;
              const val = Number(item.raw) || 0;
              if (item.dataset.yAxisID === 'y1') {
                if (intradayData.market === 'us') {
                  return `成交量: ${val.toLocaleString()} 股`;
                }
                const lots = Math.round(val / 1000);
                return `成交量: ${val.toLocaleString()} 股 (${lots} 張)`;
              }
              const d = val - prevClose;
              const dPct = prevClose > 0 ? (d / prevClose) * 100 : 0;
              return `${item.dataset.label}: $${val.toFixed(2)} (${d >= 0 ? '+' : ''}${dPct.toFixed(2)}%)`;
            },
          },
        },
        annotation: {
          annotations: {
            prevCloseLine: {
              type: 'line' as const,
              yMin: prevClose,
              yMax: prevClose,
              borderColor: '#94a3b8',
              borderWidth: 1.5,
              borderDash: [4, 4],
              label: {
                content: `昨收 $${prevClose.toFixed(2)}`,
                display: true,
                position: 'start' as const,
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                font: { size: 10, weight: 'bold' as const },
              },
            },
          },
        },
      },
      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 2,
          bottom: 0,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#64748b',
            maxTicksLimit: 6,
            padding: 1,
            font: { family: 'sans-serif', size: 9, weight: 'bold' as const },
          },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          min: intradayData.market === 'us' ? undefined : intradayData.limitDownPrice,
          max: intradayData.market === 'us' ? undefined : intradayData.limitUpPrice,
          grid: { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
          ticks: {
            color: '#334155',
            padding: 1,
            maxTicksLimit: 4,
            font: { family: 'monospace', size: 9, weight: 'bold' as const },
            callback: (val: string | number) => {
              const num = Number(val);
              return num >= 1000 ? `$${Math.round(num)}` : `$${num.toFixed(1)}`;
            },
          },
        },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          display: false, // Hide right volume axis labels to remove right gutter and maximize width
          grid: { display: false },
          max: maxVolume * 3.8, // keeps volume bars confined to bottom 25% of chart height
        },
      },
    };
  }, [intradayData, maxVolume, showVolumeBars]);

  if (!isOpen) return null;

  const diff = intradayData ? intradayData.latestPrice - intradayData.prevClose : 0;
  const diffPct =
    intradayData && intradayData.prevClose > 0 ? (diff / intradayData.prevClose) * 100 : 0;
  const isUp = diff >= 0;

  // Strength status text & indicator
  const strengthPct = intradayData ? Math.min(100, Math.max(0, intradayData.rangePct)) : 50;
  const strengthText =
    strengthPct >= 80
      ? '多強'
      : strengthPct >= 60
      ? '偏強'
      : strengthPct >= 40
      ? '震盪'
      : strengthPct >= 20
      ? '偏弱'
      : '低檔';

  // Format Volume string nicely in compact format
  const formatVolumeShort = (shares: number, market: MarketType) => {
    if (!shares || shares <= 0) return '--';
    if (market === 'us') {
      return shares >= 1000000
        ? `${(shares / 1000000).toFixed(2)}M`
        : `${(shares / 1000).toFixed(1)}K`;
    }
    const lots = Math.round(shares / 1000);
    return lots >= 10000 ? `${(lots / 10000).toFixed(1)}萬張` : `${lots.toLocaleString()}張`;
  };

  return (
    <div className="fixed inset-0 z-[96] w-full h-[100dvh] bg-slate-100 flex flex-col text-slate-900 overflow-hidden overscroll-none animate-fadeIn select-none modal-backdrop">
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Top Professional Control Header Bar */}
        <div className="bg-white border-b border-slate-200/90 px-2 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-1.5 shrink-0 shadow-2xs">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-hidden">
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg border border-slate-200 text-xs font-bold transition btn-interact shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs">返回</span>
            </button>

            <div className="overflow-hidden">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                  {selectedChartTarget.name || selectedChartTarget.symbol}
                </h2>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 sm:px-1.5 py-0.2 rounded shrink-0">
                  {selectedChartTarget.symbol}
                </span>
                <span className="text-[8px] sm:text-[9px] font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0 uppercase">
                  {selectedChartTarget.market === 'us' ? '美股' : selectedChartTarget.market === 'otc' ? '上櫃' : '上市'}
                </span>
                {intradayData && (
                  <span
                    className={`text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded border font-mono flex items-center gap-0.5 shrink-0 ${
                      intradayData.isMarketOpen
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {intradayData.isMarketOpen ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="hidden xs:inline">交易中</span>
                      </>
                    ) : (
                      <>
                        <span>🌙</span>
                        <span>{intradayData.tradingDateStr || ''} 收盤</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Controls & Stock Stepper (< / >) */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenAICopilot && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenAICopilot();
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1 shrink-0 btn-interact"
                title="開啟 AI 戰情操盤顧問"
              >
                <Sparkles className="w-3 h-3 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="hidden sm:inline">AI 戰情</span>
              </button>
            )}

            {portfolioList.length > 1 && (
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={handlePrevStock}
                  className="p-0.5 hover:bg-slate-100 text-slate-600 rounded transition"
                  title="上一檔持股"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[9px] font-mono px-0.5 text-slate-500 font-bold">
                  {currentPortfolioIndex >= 0 ? `${currentPortfolioIndex + 1}/${portfolioList.length}` : '切換'}
                </span>
                <button
                  onClick={handleNextStock}
                  className="p-0.5 hover:bg-slate-100 text-slate-600 rounded transition"
                  title="下一檔持股"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              title="關閉看盤視窗"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-1 sm:p-2 space-y-1 sm:space-y-1.5 overflow-y-auto flex-1 overscroll-contain modal-content-scroll">
          {/* COMPACT AUXILIARY HUD: Essential price + micro stats */}
          {intradayData && (
            <div className="bg-slate-50 border border-slate-200/90 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1 shrink-0 text-xs font-mono">
              {/* Primary Price & Live Indicator */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-2xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                  ${intradayData.latestPrice.toFixed(2)}
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-bold flex items-center gap-0.5 ${
                    isUp
                      ? isRedUp
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                      : isRedUp
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isUp ? '+' : ''}
                  {diff.toFixed(2)} ({isUp ? '+' : ''}
                  {diffPct.toFixed(2)}%)
                </span>
              </div>

              {/* Auxiliary Quick Data Pills */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap text-[10px] text-slate-600 font-sans">
                <span className="flex items-center gap-0.5 bg-white border border-slate-200 px-1 py-0.5 rounded">
                  <span className="text-slate-400 font-medium">量</span>
                  <strong className="text-slate-900 font-mono font-bold">{formatVolumeShort(intradayData.totalVolume, intradayData.market)}</strong>
                  {intradayData.estimatedVolume > 0 && (
                    <span className="text-purple-700 font-mono font-bold">(估 {formatVolumeShort(intradayData.estimatedVolume, intradayData.market)})</span>
                  )}
                </span>
                <span className="flex items-center gap-0.5 bg-white border border-slate-200 px-1 py-0.5 rounded">
                  <span className="text-slate-400 font-medium">昨收</span>
                  <strong className="text-slate-800 font-mono font-bold">${intradayData.prevClose.toFixed(2)}</strong>
                </span>
                <span className="flex items-center gap-0.5 bg-white border border-slate-200 px-1 py-0.5 rounded">
                  <span className="text-slate-400 font-medium">高/低</span>
                  <strong className="text-rose-600 font-mono font-bold">${intradayData.highPrice.toFixed(2)}</strong>
                  <span className="text-slate-300">/</span>
                  <strong className="text-emerald-600 font-mono font-bold">${intradayData.lowPrice.toFixed(2)}</strong>
                </span>
                <span className="hidden xs:flex items-center gap-0.5 bg-white border border-slate-200 px-1 py-0.5 rounded">
                  <span className="text-slate-400 font-medium">振幅</span>
                  <strong className="text-amber-600 font-mono font-bold">{intradayData.amplitudePct.toFixed(2)}%</strong>
                </span>
                <span className="hidden sm:flex items-center gap-0.5 bg-white border border-slate-200 px-1 py-0.5 rounded">
                  <span className="text-slate-400 font-medium">位階</span>
                  <strong className="text-indigo-600 font-mono font-bold">{strengthText}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Maximized Edge-to-Edge Chart Canvas Section */}
          <div className="bg-white p-1 sm:p-1.5 rounded-xl border border-slate-200 shadow-2xs relative flex flex-col justify-center w-full">
            {/* Intraday Technical Overlay Toggles */}
            <div className="flex items-center justify-between gap-1 flex-wrap mb-1 px-0.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    playClickSound();
                    setShowVWAP(!showVWAP);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 border ${
                    showVWAP
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showVWAP ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  VWAP 均價
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setShowMA5(!showMA5);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 border ${
                    showMA5
                      ? 'bg-purple-100 border-purple-300 text-purple-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showMA5 ? 'bg-purple-500' : 'bg-slate-300'}`} />
                  MA5 均線
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setShowVolumeBars(!showVolumeBars);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 border ${
                    showVolumeBars
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showVolumeBars ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                  成交量
                </button>
              </div>

              {/* Status or Time Frame Indicator */}
              <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>1分K即時連線</span>
                {intradayData && (
                  <span className="text-slate-400 hidden xs:inline ml-1">
                    ({intradayData.tradingDateStr})
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center text-indigo-600 font-mono text-xs py-14 gap-2">
                <Activity className="w-5 h-5 animate-spin text-indigo-600" />
                <span>即時行情加載中...</span>
              </div>
            ) : errorMsg ? (
              <div className="text-center text-slate-500 font-mono text-xs py-14">
                {errorMsg}
              </div>
            ) : chartData ? (
              <div className="w-full h-[220px] xs:h-[240px] sm:h-[280px] md:h-[320px] lg:h-[350px] relative">
                <Chart type="line" data={chartData} options={options} />
              </div>
            ) : null}
          </div>

          {/* Quick Switcher at Bottom */}
          <div className="bg-slate-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
              {/* Category Tabs */}
              <div className="flex items-center bg-white p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 text-[11px] sm:text-xs font-mono">
                <button
                  onClick={() => {
                    playClickSound();
                    setSwitcherTab('portfolio');
                  }}
                  className={`px-2.5 py-1 rounded-md sm:rounded-lg font-bold transition flex items-center gap-1 ${
                    switcherTab === 'portfolio'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>持股</span>
                  <span className="bg-indigo-100 text-indigo-800 px-1 py-0.1 rounded text-[9px]">
                    {portfolio.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setSwitcherTab('indices');
                  }}
                  className={`px-2.5 py-1 rounded-md sm:rounded-lg font-bold transition ${
                    switcherTab === 'indices'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>大盤</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setSwitcherTab('hot');
                  }}
                  className={`px-2.5 py-1 rounded-md sm:rounded-lg font-bold transition flex items-center gap-1 ${
                    switcherTab === 'hot'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>熱門</span>
                </button>
              </div>

              {/* In-Modal Search Box */}
              <div ref={searchContainerRef} className="relative flex-1 max-w-full sm:max-w-xs">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchInput.trim() && searchResults.length === 0) {
                      const local = searchLocalDictionary(searchInput, 10);
                      if (local.length > 0) setSearchResults(local);
                    }
                  }}
                  placeholder="搜尋代號/名稱切換..."
                  className="w-full bg-white border border-slate-200 rounded-lg sm:rounded-xl pl-7 pr-7 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchResults([]);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto ring-1 ring-black/5">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          playClickSound();
                          onSelectChartTarget(item.symbol, item.market, item.name);
                          setSearchInput('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 flex justify-between items-center text-xs transition border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="font-bold text-slate-900 truncate">{item.name}</span>
                          <span className="text-indigo-600 font-mono font-bold shrink-0">{item.symbol}</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.2 rounded uppercase bg-indigo-50 text-indigo-700 font-bold shrink-0">
                          {item.market}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Switcher Chips Grid */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5 max-h-20 overflow-y-auto">
              {switcherTab === 'portfolio' ? (
                portfolio.length === 0 ? (
                  <span className="text-xs text-slate-400 font-mono">尚未持有任何標的</span>
                ) : (
                  portfolio.map((item) => {
                    const isSelected = item.symbol === selectedChartTarget.symbol;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          playClickSound();
                          onSelectChartTarget(item.symbol, item.market === 'us' ? 'us' : 'tse', item.name);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-1 border btn-interact ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{item.name}</span>
                        <span className="opacity-75">({item.symbol})</span>
                      </button>
                    );
                  })
                )
              ) : switcherTab === 'indices' ? (
                MARKET_INDICES.map((item) => {
                  const isSelected = item.symbol === selectedChartTarget.symbol;
                  return (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        playClickSound();
                        onSelectChartTarget(item.symbol, item.market, item.name);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-1 border btn-interact ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="opacity-75">({item.symbol})</span>
                    </button>
                  );
                })
              ) : (
                HOT_STOCKS.map((item) => {
                  const isSelected = item.symbol === selectedChartTarget.symbol;
                  return (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        playClickSound();
                        onSelectChartTarget(item.symbol, item.market, item.name);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-1 border btn-interact ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="opacity-75">({item.symbol})</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
