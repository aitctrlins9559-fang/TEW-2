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
      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#64748b',
            font: { size: 9, weight: 'bold' as const },
            maxTicksLimit: 6,
            autoSkip: true,
            maxRotation: 0,
            padding: 2,
            callback: function (val: any) {
              const label = this.getLabelForValue(val as number) || '';
              if (typeof label === 'string' && label.includes('/')) {
                const parts = label.split('/');
                if (parts.length === 3) {
                  return `${parts[1]}/${parts[2]}`;
                }
              }
              return label;
            },
          },
        },
        y: {
          stacked: true,
          position: 'right' as const,
          grid: { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
          ticks: {
            color: '#334155',
            font: { size: 9, family: 'monospace', weight: 'bold' as const },
            maxTicksLimit: 4,
            padding: 1,
            callback: (value: string | number) => {
              if (isPrivacy) return '****';
              const val = Number(value);
              if (Math.abs(val) >= 10000) {
                const w = val / 10000;
                return `${w.toFixed(0)}萬`;
              }
              return `$${Math.round(val)}`;
            },
          },
        },
      },
    };
  }, [isPrivacy]);

  return (
    <div className="p-1.5 sm:p-2.5 space-y-1.5 relative w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-slate-100 pb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold shrink-0">
            <Waves className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              長期資產堆疊河流圖
              {isLoading ? (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5 font-bold">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  載入中...
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 font-bold">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  即時行情
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Weeks Time Range Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
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
              className={`px-1.5 py-0.5 rounded font-bold transition text-[10px] ${
                weeksRange === item.weeks
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Notice Bar */}
      <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80 flex items-center justify-between gap-1 text-[10px] font-mono">
        <div className="flex items-center gap-1 text-slate-700">
          <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
          <span>
            <strong className="text-indigo-700">{weeksRange}週</strong> | 持股 <strong className="text-emerald-700">{portfolio.length}檔</strong>
          </span>
        </div>
        <div className="text-right">
          <span className="text-slate-500">區間:</span>
          <span className={`font-bold ml-1 ${diffVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isPrivacy ? '****' : `${diffVal >= 0 ? '+' : ''}${diffPct.toFixed(2)}%`}
          </span>
        </div>
      </div>

      {/* Chart Canvas - Wide Edge-to-Edge Ratio */}
      <div className="h-[200px] xs:h-[220px] sm:h-[260px] lg:h-[290px] relative w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
