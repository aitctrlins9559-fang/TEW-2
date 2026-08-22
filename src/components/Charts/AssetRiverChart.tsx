import React, { useState, useEffect, useMemo } from 'react';
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
import { Line } from 'react-chartjs-2';
import { StockPosition } from '../../types';
import { formatMoney } from '../../utils/format';
import { Waves, Calendar, Info, Layers, RefreshCw, CheckCircle2 } from 'lucide-react';
import { playClickSound } from '../../utils/audio';
import { apiFetchChartData } from '../../utils/apiClient';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AssetRiverChartProps {
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
  isRedUp: boolean;
}

// Preset color palette for stacked layers in the river chart
const PALETTE = [
  { border: '#0284c7', bg: 'rgba(2, 132, 199, 0.45)' },   // Sky Blue
  { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.45)' },   // Indigo
  { border: '#059669', bg: 'rgba(5, 150, 105, 0.45)' },   // Emerald
  { border: '#d97706', bg: 'rgba(217, 119, 6, 0.45)' },   // Amber
  { border: '#e11d48', bg: 'rgba(225, 29, 72, 0.45)' },    // Rose
  { border: '#9333ea', bg: 'rgba(147, 51, 234, 0.45)' },  // Purple
  { border: '#0d9488', bg: 'rgba(13, 148, 136, 0.45)' },   // Teal
  { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.45)' },   // Orange
];

export const AssetRiverChart: React.FC<AssetRiverChartProps> = ({
  portfolio,
  usdTwdRate,
  isPrivacy,
}) => {
  const [weeksRange, setWeeksRange] = useState<number>(12);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [realChartData, setRealChartData] = useState<{
    labels: string[];
    datasets: any[];
    totalStartVal: number;
    totalCurrentVal: number;
  }>({
    labels: [],
    datasets: [],
    totalStartVal: 0,
    totalCurrentVal: 0,
  });

  useEffect(() => {
    let isMounted = true;
    if (!portfolio || portfolio.length === 0) {
      setRealChartData({ labels: [], datasets: [], totalStartVal: 0, totalCurrentVal: 0 });
      setIsLoading(false);
      return;
    }

    const fetchRealData = async () => {
      setIsLoading(true);

      let range = '3mo';
      if (weeksRange === 4) range = '1mo';
      else if (weeksRange === 12) range = '3mo';
      else if (weeksRange === 26) range = '6mo';
      else if (weeksRange === 52) range = '1y';

      try {
        const results = await Promise.all(
          portfolio.map(async (stock) => {
            const sym = stock.symbol;
            let querySym = sym.toUpperCase();
            if (stock.market === 'tse' && !querySym.endsWith('.TW')) querySym = `${querySym}.TW`;
            if (stock.market === 'otc' && !querySym.endsWith('.TWO')) querySym = `${querySym}.TWO`;

            const chartRes = await apiFetchChartData(querySym, range, '1wk');
            return {
              stock,
              chartRes,
            };
          })
        );

        if (!isMounted) return;

        const timeMap = new Map<number, string>();
        results.forEach(({ chartRes }) => {
          if (chartRes && Array.isArray(chartRes.timestamp)) {
            chartRes.timestamp.forEach((ts: number) => {
              if (ts && !timeMap.has(ts)) {
                const dt = new Date(ts * 1000);
                const yyyy = dt.getFullYear();
                const mm = String(dt.getMonth() + 1).padStart(2, '0');
                const dd = String(dt.getDate()).padStart(2, '0');
                timeMap.set(ts, `${yyyy}/${mm}/${dd}`);
              }
            });
          }
        });

        const sortedTimestamps = Array.from(timeMap.keys()).sort((a, b) => a - b);
        let dateLabels: string[] = sortedTimestamps.map((ts) => timeMap.get(ts) || '');

        if (sortedTimestamps.length === 0) {
          const today = new Date();
          for (let i = weeksRange; i >= 0; i--) {
            const d = new Date(today.getTime() - i * 7 * 86400 * 1000);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dateLabels.push(`${yyyy}/${mm}/${dd}`);
          }
        }

        let startValSum = 0;
        let currentValSum = 0;

        const datasets = results.map(({ stock, chartRes }, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          const fx = stock.market === 'us' ? usdTwdRate : 1;
          const currentPrice = stock.price && stock.price > 0 ? stock.price : stock.cost;
          const currentVal = stock.shares * currentPrice * fx;
          currentValSum += currentVal;

          const rawTsList: number[] = chartRes?.timestamp || [];
          const rawQuotes: (number | null)[] = chartRes?.quotes || [];

          const tsToPrice = new Map<number, number>();
          rawTsList.forEach((ts, tIdx) => {
            const p = rawQuotes[tIdx];
            if (p && typeof p === 'number' && p > 0) {
              tsToPrice.set(ts, p);
            }
          });

          let lastValidPrice = stock.cost || currentPrice;
          const seriesData: number[] = [];

          if (sortedTimestamps.length > 0) {
            sortedTimestamps.forEach((ts, tsIdx) => {
              const realP = tsToPrice.get(ts);
              if (realP && realP > 0) {
                lastValidPrice = realP;
              }
              const holdingVal = Math.round(stock.shares * lastValidPrice * fx);
              seriesData.push(holdingVal);

              if (tsIdx === 0) {
                startValSum += holdingVal;
              }
            });
          } else {
            for (let i = 0; i < dateLabels.length; i++) {
              seriesData.push(Math.round(currentVal));
            }
            startValSum += currentVal;
          }

          return {
            label: `${stock.name} (${stock.symbol})`,
            data: seriesData,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 1.5,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: color.border,
          };
        });

        setRealChartData({
          labels: dateLabels,
          datasets,
          totalStartVal: startValSum,
          totalCurrentVal: currentValSum,
        });
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRealData();

    return () => {
      isMounted = false;
    };
  }, [portfolio, usdTwdRate, weeksRange]);

  const { labels, datasets, totalStartVal, totalCurrentVal } = realChartData;
  const diffVal = totalCurrentVal - totalStartVal;
  const diffPct = totalStartVal > 0 ? (diffVal / totalStartVal) * 100 : 0;

  const chartData = useMemo(() => {
    return {
      labels,
      datasets,
    };
  }, [labels, datasets]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            color: '#334155',
            font: { size: 10, family: 'sans-serif', weight: 'bold' as const },
            boxWidth: 10,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#38bdf8',
          bodyColor: '#f8fafc',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items: Array<{ label: string }>) => `週次時間: ${items[0]?.label || ''}`,
            label: (item: { dataset: { label?: string }; raw: unknown }) => {
              const val = Number(item.raw) || 0;
              if (isPrivacy) return `${item.dataset.label || ''}: **** NT$`;
              return `${item.dataset.label || ''}: $${Math.round(val).toLocaleString()} NT$`;
            },
            footer: (items: Array<{ raw: unknown }>) => {
              if (isPrivacy) return `當週全資產總計: **** NT$`;
              const total = items.reduce((sum, it) => sum + (Number(it.raw) || 0), 0);
              return `當週全資產總計: $${Math.round(total).toLocaleString()} NT$`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#64748b',
            font: { size: 10, family: 'sans-serif', weight: 'bold' as const },
            maxTicksLimit: 10,
            maxRotation: 0,
            padding: 8,
          },
        },
        y: {
          stacked: true,
          position: 'right' as const,
          grid: { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
          ticks: {
            color: '#334155',
            font: { size: 11, family: 'monospace', weight: 'bold' as const },
            maxTicksLimit: 5,
            padding: 10,
            callback: (value: string | number) => {
              if (isPrivacy) return '****';
              const val = Number(value);
              if (Math.abs(val) >= 10000) {
                const w = val / 10000;
                return w % 1 === 0 ? `${w.toFixed(0)} 萬` : `${w.toFixed(1)} 萬`;
              }
              return `$${Math.round(val).toLocaleString()}`;
            },
          },
        },
      },
    };
  }, [isPrivacy]);

  return (
    <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 border border-slate-200/90 shadow-sm bg-white relative">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-indigo-600 font-extrabold tracking-widest uppercase">
              LONG-TERM ASSET RIVER FLOW
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
              長期資產堆疊河流圖
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold">
                X軸刻度：1 週
              </span>
              {isLoading ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  行情載入中...
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  官方真實歷史行情
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Weeks Time Range Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono">
          {[
            { label: '4週', weeks: 4 },
            { label: '12週', weeks: 12 },
            { label: '26週', weeks: 26 },
            { label: '52週', weeks: 52 },
          ].map((item) => (
            <button
              key={item.weeks}
              onClick={() => {
                playClickSound();
                setWeeksRange(item.weeks);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                weeksRange === item.weeks
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Notice Bar */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-700">
          <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            週次間距：<strong className="text-indigo-700">{weeksRange} 週</strong> | 持股層疊：<strong className="text-emerald-700">{portfolio.length} 檔標的</strong>
          </span>
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-[11px]">區間資產增減：</span>
          <span className={`font-bold ml-1 ${diffVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isPrivacy ? '****' : `${diffVal >= 0 ? '+' : ''}$${Math.abs(Math.round(diffVal)).toLocaleString()} (${diffVal >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[300px] sm:h-[340px] relative w-full pt-1">
        <Line data={chartData} options={options} />
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider font-mono border-t border-slate-100 pt-2 font-bold">
        <span>起始週: {labels[0] || '--'}</span>
        <span className="text-indigo-600">★ 河流圖堆疊展示各持股市值演變</span>
        <span>最新週: {labels[labels.length - 1] || '--'}</span>
      </div>
    </div>
  );
};
