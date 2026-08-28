import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart2, Search, Zap, Activity, Loader2, Maximize2, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { StockPosition, ChartTarget, MarketType, IntradayData } from '../../types';
import { playClickSound } from '../../utils/audio';
import { apiFetchChartData, apiSearchStock } from '../../utils/apiClient';
import { searchLocalDictionary, lookupStockInfo } from '../../data/stockDictionary';
import { getMarketStatusInfo } from '../../utils/marketHelper';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

interface SingleStockChartProps {
  portfolio: StockPosition[];
  selectedChartTarget: ChartTarget;
  onSelectChartTarget: (symbol: string, market: MarketType, name: string) => void;
  isRedUp: boolean;
  onOpenFullModal?: () => void;
}

function generateFullTradingSession(
  market: MarketType,
  symbol: string,
  ts: number[],
  quotes: number[]
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
      }
      validPrices.push(quotes[i]);
    }
  });

  if (validPrices.length === 0) {
    return { fullLabels: [], fullPrices: [], validPrices: [] };
  }

  let latestAvailableIndex = -1;
  fullLabels.forEach((label, idx) => {
    if (priceMap.has(label)) {
      latestAvailableIndex = idx;
    }
  });

  const fullPrices: (number | null)[] = [];

  if (latestAvailableIndex === -1) {
    for (let i = 0; i < fullLabels.length; i++) {
      if (i < validPrices.length) {
        fullPrices.push(validPrices[i]);
      } else {
        fullPrices.push(null);
      }
    }
    return { fullLabels, fullPrices, validPrices };
  }

  let lastVal: number | null = null;
  for (let i = 0; i < fullLabels.length; i++) {
    const label = fullLabels[i];
    if (priceMap.has(label)) {
      lastVal = priceMap.get(label)!;
      fullPrices.push(lastVal);
    } else if (i <= latestAvailableIndex) {
      fullPrices.push(lastVal);
    } else {
      fullPrices.push(null);
    }
  }

  return { fullLabels, fullPrices, validPrices };
}

export const SingleStockChart: React.FC<SingleStockChartProps> = ({
  portfolio,
  selectedChartTarget,
  onSelectChartTarget,
  isRedUp,
  onOpenFullModal,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [intradayData, setIntradayData] = useState<IntradayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const matchedPortfolioItem = portfolio.find(
    (p) => p.symbol === selectedChartTarget.symbol && p.market === selectedChartTarget.market
  );

  const fetchIntradayData = useCallback(
    async (target: ChartTarget) => {
      if (!target.symbol) return;
      if (!intradayData || intradayData.symbol !== target.symbol) {
        setLoading(true);
      }
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

        const json = await apiFetchChartData(s, '1d', '5m');

        if (!json || !json.success || !json.meta) {
          throw new Error('暫無即時分時行情數據');
        }

        const meta = json.meta;
        const ts: number[] = json.timestamp || [];
        const quotes: number[] = json.quotes || [];

        const { fullLabels, fullPrices, validPrices } = generateFullTradingSession(
          target.market,
          target.symbol,
          ts,
          quotes
        );

        if (validPrices.length === 0) {
          throw new Error('暫無盤中分時走勢數據');
        }

        const prevClose = meta.chartPreviousClose || meta.previousClose || validPrices[0];
        let latestPrice = validPrices[validPrices.length - 1];
        if (matchedPortfolioItem?.price && matchedPortfolioItem.price > 0) {
          latestPrice = matchedPortfolioItem.price;
        }

        const highPrice = Math.max(...validPrices);
        const lowPrice = Math.min(...validPrices);

        const limitUpPrice = prevClose * 1.1;
        const limitDownPrice = prevClose * 0.9;
        const amplitudePct = prevClose > 0 ? ((highPrice - lowPrice) / prevClose) * 100 : 0;

        const rangeSpan = highPrice - lowPrice;
        const rangePct = rangeSpan > 0 ? ((latestPrice - lowPrice) / rangeSpan) * 100 : 50;

        const openPrice = meta.regularMarketOpen || meta.open || validPrices[0] || prevClose;
        const totalVolume = meta.regularMarketVolume || meta.volume || 0;
        const estimatedVolume = totalVolume > 0 ? Math.round(totalVolume * 1.15) : 0;

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
    if (selectedChartTarget.symbol) {
      setSearchInput(selectedChartTarget.symbol);
      fetchIntradayData(selectedChartTarget);
    }
  }, [selectedChartTarget, fetchIntradayData]);

  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; market: MarketType }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchInputChange = (val: string) => {
    setSearchInput(val);
    if (!val.trim()) {
      setShowResults(false);
      setSearchResults([]);
      return;
    }

    setShowResults(true);

    const instantLocal = searchLocalDictionary(val, 8);
    if (instantLocal.length > 0) {
      setSearchResults(instantLocal);
    }

    setIsSearching(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await apiSearchStock(val);
        if (Array.isArray(results) && results.length > 0) {
          setSearchResults(results.slice(0, 8));
        }
      } catch {
        // keep local results
      } finally {
        setIsSearching(false);
      }
    }, 150);
  };

  const selectSearchItem = (symbol: string, market: MarketType, name: string) => {
    playClickSound();
    setSearchInput(`${symbol} | ${name}`);
    setShowResults(false);
    onSelectChartTarget(symbol, market, name);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0 && showResults) {
      const first = searchResults[0];
      selectSearchItem(first.symbol, first.market, first.name);
      return;
    }

    const query = searchInput.trim().toUpperCase();
    if (!query) return;

    const matchedInPortfolio = portfolio.find((p) => p.symbol === query);
    if (matchedInPortfolio) {
      selectSearchItem(query, matchedInPortfolio.market, matchedInPortfolio.name);
    } else {
      const info = lookupStockInfo(query);
      if (info) {
        selectSearchItem(info.symbol, info.market, info.name);
      } else {
        const isNum = /^\d{4,6}$/.test(query);
        selectSearchItem(query, isNum ? 'tse' : 'us', query);
      }
    }
  };

  const getUpColor = useCallback(() => (isRedUp ? '#e11d48' : '#059669'), [isRedUp]);
  const getDownColor = useCallback(() => (isRedUp ? '#059669' : '#e11d48'), [isRedUp]);

  const chartData = useMemo(() => {
    if (!intradayData) return null;
    const diff = intradayData.latestPrice - intradayData.prevClose;
    const lineColor = diff >= 0 ? getUpColor() : getDownColor();

    const lastValidIdx = intradayData.prices.findLastIndex((p) => p !== null && p !== undefined);

    return {
      labels: intradayData.labels,
      datasets: [
        {
          label: `${intradayData.name} 即時分時價`,
          data: intradayData.prices,
          borderColor: lineColor,
          borderWidth: 2.75,
          fill: true,
          spanGaps: false,
          tension: 0.15,
          pointRadius: (ctx: { dataIndex: number }) => (ctx.dataIndex === lastValidIdx ? 6 : 0),
          pointBackgroundColor: lineColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2.5,
          pointHoverRadius: 8,
          pointHitRadius: 28,
          backgroundColor: (context: {
            chart: { ctx: CanvasRenderingContext2D; chartArea?: { bottom: number; top: number } };
          }) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'transparent';
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(241, 245, 249, 0)');
            gradient.addColorStop(1, diff >= 0 ? 'rgba(5, 150, 105, 0.18)' : 'rgba(225, 29, 72, 0.18)');
            return gradient;
          },
        },
      ],
    };
  }, [intradayData, getUpColor, getDownColor]);

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
          displayColors: false,
          callbacks: {
            title: (items: Array<{ label: string }>) => `時間: ${items[0]?.label || ''}`,
            label: (item: { raw: unknown }) => {
              const p = Number(item.raw) || 0;
              const d = p - prevClose;
              const dPct = prevClose > 0 ? (d / prevClose) * 100 : 0;
              return [
                `價位: $${p.toFixed(2)} ${intradayData.market === 'us' ? 'USD' : 'NT$'}`,
                `變動: ${d >= 0 ? '+' : ''}${d.toFixed(2)} (${d >= 0 ? '+' : ''}${dPct.toFixed(2)}%)`,
              ];
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
          ticks: { color: '#64748b', maxTicksLimit: 8, font: { family: 'sans-serif', size: 11, weight: 'bold' as const } },
        },
        y: {
          min: intradayData.market === 'us' ? undefined : intradayData.limitDownPrice,
          max: intradayData.market === 'us' ? undefined : intradayData.limitUpPrice,
          grid: { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
          ticks: {
            color: '#334155',
            font: { family: 'monospace', size: 11, weight: 'bold' as const },
            callback: (val: string | number) => `$${Number(val).toFixed(1)}`,
          },
        },
      },
    };
  }, [intradayData]);

  const diff = intradayData ? intradayData.latestPrice - intradayData.prevClose : 0;
  const diffPct =
    intradayData && intradayData.prevClose > 0 ? (diff / intradayData.prevClose) * 100 : 0;

  return (
    <div
      id="singleStockChartCard"
      className="glass-card p-2.5 sm:p-6 rounded-xl sm:rounded-3xl space-y-3 sm:space-y-4 border border-slate-200/90 shadow-sm bg-white w-full"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3 border-b border-slate-100 pb-2.5 sm:pb-3.5">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2 tracking-tight">
            <div className="p-1.5 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
              <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span>即時分時走勢</span>
            <span className="text-[9px] sm:text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 sm:px-2 py-0.2 rounded-full flex items-center gap-1 font-bold">
              <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 animate-pulse" /> 盤中現價
            </span>
          </h2>
          {onOpenFullModal && (
            <button
              onClick={() => {
                playClickSound();
                onOpenFullModal();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg sm:rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[11px] sm:text-xs font-bold transition shrink-0 btn-interact"
              title="開啟滿版看盤"
            >
              <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>滿版看盤</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Portfolio Select */}
          <select
            value={
              portfolio.some((p) => p.symbol === selectedChartTarget.symbol)
                ? `${selectedChartTarget.symbol}_${selectedChartTarget.market}`
                : ''
            }
            onChange={(e) => {
              playClickSound();
              const val = e.target.value;
              if (!val) return;
              const item = portfolio.find((p) => `${p.symbol}_${p.market}` === val);
              if (item) {
                onSelectChartTarget(item.symbol, item.market, item.name);
              }
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none cursor-pointer hover:border-indigo-300 transition w-full sm:w-auto"
          >
            <option value="">從持股快速選擇...</option>
            {portfolio.map((item) => (
              <option key={item.id} value={`${item.symbol}_${item.market}`}>
                {item.symbol} {item.name}
              </option>
            ))}
          </select>

          {/* Search Input with Smart Autocomplete Dropdown */}
          <div className="relative w-full sm:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <input
                type="text"
                placeholder="搜尋 (2330 / 鴻海 / NVDA)"
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => {
                  if (searchInput.trim()) setShowResults(true);
                }}
                className="glass-input rounded-lg sm:rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none w-full sm:w-56 font-medium pr-7 focus:border-indigo-500"
              />
              <button type="submit" className="absolute right-2 text-slate-400 hover:text-indigo-600 p-0.5">
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            </form>

            {/* Auto-complete Dropdown */}
            {showResults && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-full sm:w-72 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    無相符股票標的，可按 Enter 直接查詢
                  </div>
                ) : (
                  searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSearchItem(item.symbol, item.market, item.name)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs transition"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-bold text-slate-900 truncate">{item.name}</span>
                        <span className="text-indigo-600 font-mono font-bold shrink-0">{item.symbol}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase bg-slate-100 text-slate-600 shrink-0">
                        {item.market === 'us' ? '美股' : item.market === 'otc' ? '上櫃' : '上市'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Realtime Price Banner */}
      {intradayData && (
        <div className="bg-slate-50 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 w-full">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {intradayData.name}
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                {intradayData.symbol}
              </span>
              <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-slate-200/80 text-slate-700 uppercase">
                {intradayData.market === 'us' ? '美股' : intradayData.market === 'otc' ? '上櫃' : '上市'}
              </span>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1.5 font-mono flex-wrap">
              <span>昨收: <strong className="text-slate-800">${intradayData.prevClose.toFixed(2)}</strong></span>
              <span>•</span>
              <span>最高: <strong className="text-rose-600">${intradayData.highPrice.toFixed(2)}</strong></span>
              <span>•</span>
              <span>最低: <strong className="text-emerald-600">${intradayData.lowPrice.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <div className="text-right">
              <div className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-bold uppercase mb-0.5">
                {intradayData.isMarketOpen ? '盤中即時現價' : `${intradayData.tradingDateStr || ''} 收盤價`}
              </div>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-slate-900">
                ${intradayData.latestPrice.toFixed(2)}
              </div>
            </div>

            <div
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border font-mono font-bold flex flex-col items-center justify-center shrink-0 ${
                diff > 0
                  ? isRedUp
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : diff < 0
                  ? isRedUp
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <div className="text-xs sm:text-sm font-black flex items-center gap-0.5">
                {diff > 0 ? '+' : ''}
                {diff.toFixed(2)}
              </div>
              <div className="text-[9px] sm:text-[10px] font-semibold">
                {diffPct > 0 ? '+' : ''}
                {diffPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Core Metric Tiles */}
      {intradayData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs w-full">
          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium text-[10px] sm:text-[11px] mb-0.5">昨日收盤</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono tabular-nums">
              ${intradayData.prevClose.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium text-[10px] sm:text-[11px] mb-0.5">當日最高</div>
            <div className="text-xs sm:text-sm font-bold text-rose-600 font-mono tabular-nums">
              ${intradayData.highPrice.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium text-[10px] sm:text-[11px] mb-0.5">當日最低</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 font-mono tabular-nums">
              ${intradayData.lowPrice.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium text-[10px] sm:text-[11px] mb-0.5">當日振幅</div>
            <div className="text-xs sm:text-sm font-bold text-amber-600 font-mono tabular-nums">
              {intradayData.amplitudePct.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Line Chart Canvas (Wide Responsive Aspect Ratio) */}
      <div className="bg-slate-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 h-[240px] sm:h-[300px] lg:h-[340px] min-h-[220px] relative w-full pt-1">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-indigo-600 font-mono text-xs">
            即時分時數據連線中...
          </div>
        ) : errorMsg ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-xs">
            {errorMsg}
          </div>
        ) : chartData ? (
          <Line data={chartData} options={options} />
        ) : null}
      </div>

      <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-wider uppercase tabular-nums border-t border-slate-100 pt-2">
        <span className="truncate">標的: {intradayData ? `${intradayData.name} (${intradayData.symbol})` : '--'}</span>
        <span className="shrink-0 ml-1">
          {intradayData
            ? `${intradayData.isMarketOpen ? '盤中' : '收盤'}: $${intradayData.latestPrice.toFixed(2)} ${
                intradayData.market === 'us' ? 'USD' : 'NT$'
              }`
            : '請選擇監控標的'}
        </span>
      </div>
    </div>
  );
};
