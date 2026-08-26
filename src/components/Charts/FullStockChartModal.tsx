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

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    const instantLocal = searchLocalDictionary(val, 8);
    if (instantLocal.length > 0) {
      setSearchResults(instantLocal);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiSearchStock(val);
        if (Array.isArray(res) && res.length > 0) {
          setSearchResults(res);
        }
      } catch {
        // Keep local matches if any
      }
    }, 150);
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
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { color: '#64748b', maxTicksLimit: 12, font: { family: 'sans-serif', size: 10, weight: 'bold' as const } },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          min: intradayData.market === 'us' ? undefined : intradayData.limitDownPrice,
          max: intradayData.market === 'us' ? undefined : intradayData.limitUpPrice,
          grid: { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
          ticks: {
            color: '#334155',
            font: { family: 'monospace', size: 11, weight: 'bold' as const },
            callback: (val: string | number) => `$${Number(val).toFixed(1)}`,
          },
        },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          display: showVolumeBars,
          grid: { display: false },
          max: maxVolume * 3.8, // keeps volume bars confined to bottom 25% of chart height
          ticks: {
            color: '#64748b',
            font: { family: 'monospace', size: 9, weight: 'bold' as const },
            callback: (val: string | number) => {
              const num = Number(val);
              if (num <= 0) return '';
              if (intradayData.market === 'us') {
                return num >= 1000000 ? `${(num / 1000000).toFixed(1)}M` : `${(num / 1000).toFixed(0)}K`;
              }
              const lots = num / 1000;
              return lots >= 1000 ? `${(lots / 1000).toFixed(1)}k張` : `${Math.round(lots)}張`;
            },
          },
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
      ? '多方強勢拉抬'
      : strengthPct >= 60
      ? '多方偏強'
      : strengthPct >= 40
      ? '高低區間震盪'
      : strengthPct >= 20
      ? '空方偏弱'
      : '極度低檔支撐';

  // Format Volume string nicely (張數 for TW, M/K shares for US)
  const formatVolumeStr = (shares: number, market: MarketType) => {
    if (!shares || shares <= 0) return '--';
    if (market === 'us') {
      return shares >= 1000000
        ? `${(shares / 1000000).toFixed(2)} M 股`
        : `${(shares / 1000).toFixed(1)} K 股`;
    }
    const lots = Math.round(shares / 1000);
    return `${lots.toLocaleString()} 張 (${(shares / 10000).toFixed(1)}萬股)`;
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn h-[100dvh]">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Professional Control Header Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold transition btn-interact shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">返回</span>
            </button>

            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0 font-bold">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                  {selectedChartTarget.name || selectedChartTarget.symbol}
                </h2>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md shrink-0">
                  {selectedChartTarget.symbol}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 uppercase">
                  {selectedChartTarget.market === 'us' ? '美股' : selectedChartTarget.market === 'otc' ? '上櫃' : '上市'}
                </span>
                {intradayData && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono flex items-center gap-1 shrink-0 ${
                      intradayData.isMarketOpen
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {intradayData.isMarketOpen ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        盤中交易中
                      </>
                    ) : (
                      <>
                        <span>🌙</span>
                        <span>{intradayData.tradingDateStr || ''} 收盤價</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Controls & Stock Stepper (< / >) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenAICopilot && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenAICopilot();
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 btn-interact"
                title="開啟 AI 戰情操盤顧問"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="hidden sm:inline">AI 戰情</span>
              </button>
            )}

            {portfolioList.length > 1 && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                <button
                  onClick={handlePrevStock}
                  className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                  title="上一檔持股"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono px-1 text-slate-500 font-bold">
                  {currentPortfolioIndex >= 0 ? `${currentPortfolioIndex + 1}/${portfolioList.length}` : '切換'}
                </span>
                <button
                  onClick={handleNextStock}
                  className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                  title="下一檔持股"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              title="關閉看盤視窗"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          {/* ESSENTIAL CORE BANNER: Price + Volume + Key Action Status */}
          {intradayData && (
            <div className="bg-slate-50 border border-slate-200/90 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              {/* Left: Latest Price & Change */}
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-bold font-mono text-slate-500">
                  {intradayData.isMarketOpen ? (
                    <span className="text-emerald-700 flex items-center gap-1 font-bold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      {intradayData.tradingDateStr} 盤中即時現價
                    </span>
                  ) : (
                    <span className="text-amber-800 font-bold inline-flex items-center gap-1">
                      <span>🌙</span>
                      <span>{intradayData.tradingDateStr || '近期'} 收盤價</span>
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                    ${intradayData.latestPrice.toFixed(2)}
                  </span>
                  <span
                    className={`text-sm sm:text-base font-mono font-bold flex items-center gap-1 ${
                      isUp
                        ? isRedUp
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                        : isRedUp
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isUp ? '+' : ''}
                    {diff.toFixed(2)} ({isUp ? '+' : ''}
                    {diffPct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Right: Essential Volume & Intraday VWAP Highlight Cards */}
              <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
                  <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans font-medium">成交量</span>
                    <strong className="text-slate-900 font-bold">
                      {formatVolumeStr(intradayData.totalVolume, intradayData.market)}
                    </strong>
                  </div>
                </div>

                {intradayData.estimatedVolume > 0 && (
                  <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
                    <Flame className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans font-medium">預估量</span>
                      <strong className="text-purple-700 font-bold">
                        {formatVolumeStr(intradayData.estimatedVolume, intradayData.market)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECONDARY TRADING METRICS & PIVOT CARDS */}
          {intradayData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">開盤價</span>
                <strong className="text-slate-900 font-bold">${intradayData.openPrice.toFixed(2)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">昨日收盤</span>
                <strong className="text-slate-900 font-bold">${intradayData.prevClose.toFixed(2)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">最高價</span>
                <strong className="text-rose-600 font-bold">${intradayData.highPrice.toFixed(2)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">最低價</span>
                <strong className="text-emerald-600 font-bold">${intradayData.lowPrice.toFixed(2)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">當日振幅</span>
                <strong className="text-amber-600 font-bold">{intradayData.amplitudePct.toFixed(2)}%</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block">高低位階</span>
                <strong className="text-indigo-600 font-bold">{strengthText} ({Math.round(strengthPct)}%)</strong>
              </div>
            </div>
          )}

          {/* Chart Canvas Section */}
          <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 relative flex flex-col justify-center min-h-[320px]">
            {/* Intraday Technical Overlay Toggles */}
            <div className="sm:absolute sm:top-3 sm:right-4 z-10 flex items-center gap-1.5 flex-wrap mb-2 sm:mb-0">
              <button
                onClick={() => {
                  playClickSound();
                  setShowVWAP(!showVWAP);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 border ${
                  showVWAP
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showVWAP ? 'bg-amber-500' : 'bg-slate-300'}`} />
                VWAP 均價線
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setShowMA5(!showMA5);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 border ${
                  showMA5
                    ? 'bg-purple-100 border-purple-300 text-purple-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showMA5 ? 'bg-purple-500' : 'bg-slate-300'}`} />
                MA5 均線
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setShowVolumeBars(!showVolumeBars);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 border ${
                  showVolumeBars
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart className="w-3 h-3 text-indigo-600" />
                成交量柱
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center text-indigo-600 font-mono text-xs py-16 gap-2">
                <Activity className="w-6 h-6 animate-spin text-indigo-600" />
                <span>盤中即時行情數據加載中...</span>
              </div>
            ) : errorMsg ? (
              <div className="text-center text-slate-500 font-mono text-xs py-16">
                {errorMsg}
              </div>
            ) : chartData ? (
              <div className="w-full h-[300px] sm:h-[380px] relative pt-2">
                <Chart type="line" data={chartData} options={options} />
              </div>
            ) : null}
          </div>

          {/* Quick Switcher at Bottom */}
          <div className="bg-slate-50 p-3 pb-6 sm:pb-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {/* Category Tabs */}
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-mono">
                <button
                  onClick={() => {
                    playClickSound();
                    setSwitcherTab('portfolio');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    switcherTab === 'portfolio'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>持股</span>
                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded text-[10px]">
                    {portfolio.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setSwitcherTab('indices');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    switcherTab === 'indices'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>大盤指數</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    setSwitcherTab('hot');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                    switcherTab === 'hot'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>熱門標的</span>
                </button>
              </div>

              {/* In-Modal Search Box */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="搜尋代號/名稱切換..."
                  className="w-full glass-input rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition font-mono"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setSearchResults([]);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto">
                    {searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          playClickSound();
                          onSelectChartTarget(item.symbol, item.market, item.name);
                          setSearchInput('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex justify-between items-center text-xs transition border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="font-bold text-slate-900 truncate">{item.name}</span>
                          <span className="text-indigo-600 font-mono font-bold shrink-0">{item.symbol}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-600 shrink-0">
                          {item.market}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Switcher Chips Grid */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 max-h-24 overflow-y-auto">
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
                        className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 border btn-interact ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 border btn-interact ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 border btn-interact ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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
