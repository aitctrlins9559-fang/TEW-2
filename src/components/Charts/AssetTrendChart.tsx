import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatMoney } from '../../utils/format';
import { TrendingUp, TrendingDown } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AssetTrendChartProps {
  labels: string[];
  data: number[];
  currentVal?: number;
  isPrivacy: boolean;
  isRedUp: boolean;
}

export const AssetTrendChart: React.FC<AssetTrendChartProps> = ({
  labels,
  data,
  currentVal,
  isPrivacy,
  isRedUp,
}) => {
  const displayVal = currentVal ?? (data.length > 0 ? data[data.length - 1] : 0);
  const isTrendUp = data.length > 0 ? data[data.length - 1] >= data[0] : true;
  const trendColorRgb = isTrendUp
    ? isRedUp
      ? '#e11d48'
      : '#059669'
    : isRedUp
    ? '#059669'
    : '#e11d48';

  const startVal = data.length > 0 ? data[0] : 0;
  const endVal = data.length > 0 ? data[data.length - 1] : 0;
  const diff = endVal - startVal;
  const diffPct = startVal > 0 ? (diff / startVal) * 100 : 0;

  const chartData = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          data,
          borderColor: trendColorRgb,
          borderWidth: 3,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointHitRadius: 30,
          pointBackgroundColor: '#ffffff',
          pointBorderWidth: 2.5,
          pointHoverBackgroundColor: trendColorRgb,
          pointHoverBorderColor: '#ffffff',
          backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { bottom: number; top: number } } }) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(79, 70, 229, 0.05)';
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(241, 245, 249, 0)');
            gradient.addColorStop(1, isTrendUp ? 'rgba(5, 150, 105, 0.15)' : 'rgba(225, 29, 72, 0.15)');
            return gradient;
          },
        },
      ],
    };
  }, [labels, data, trendColorRgb, isTrendUp]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, axis: 'x' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#38bdf8',
          bodyColor: '#f8fafc',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items: Array<{ label: string }>) => `時間: ${items[0]?.label || ''}`,
            label: (item: { raw: unknown; dataIndex: number; dataset: { data: unknown[] } }) => {
              if (isPrivacy) return [`總市值: **** NT$`, `較前日: ****`];
              const val = Number(item.raw) || 0;
              const prev = item.dataIndex > 0 ? Number(item.dataset.data[item.dataIndex - 1]) : val;
              const d = val - prev;
              return [
                `總市值: $${Math.round(val).toLocaleString()} NT$`,
                `較前日: ${d >= 0 ? '+' : '-'}$${Math.abs(Math.round(d)).toLocaleString()}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#64748b',
            font: { size: 10, weight: 'bold' as const },
            maxTicksLimit: 6,
            autoSkip: true,
            maxRotation: 0,
            padding: 6,
            callback: function (val: any) {
              const label = this.getLabelForValue(val as number) || '';
              if (typeof label === 'string') {
                const clean = label.replace(' (現價)', '');
                if (clean.includes('/')) {
                  const parts = clean.split('/');
                  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
                }
                return clean;
              }
              return label;
            },
          },
        },
        y: {
          position: 'right' as const,
          grid: { color: 'rgba(0,0,0,0.06)', borderDash: [4, 4] },
          ticks: {
            color: '#334155',
            font: { size: 11, family: 'monospace', weight: 'bold' as const },
            maxTicksLimit: 5,
            padding: 8,
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
    <div className="p-2.5 sm:p-4 space-y-3 relative w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <div className="text-[9px] text-indigo-600 font-extrabold tracking-widest uppercase mb-0.5">
            TOTAL ASSET TREND
          </div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            全資產總市值走勢
          </h2>
        </div>
        <div className="text-left sm:text-right min-w-0">
          <div className="flex flex-wrap sm:justify-end items-baseline gap-1.5 min-w-0">
            <span className="text-base sm:text-xl font-black text-slate-900 font-mono tabular-nums leading-none tracking-tight">
              {formatMoney(displayVal, isPrivacy)}
            </span>
            <span
              className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border tabular-nums ${
                diff >= 0
                  ? (isRedUp ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200')
                  : (isRedUp ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200')
              }`}
            >
              {isPrivacy
                ? '--'
                : `${diff >= 0 ? '+' : ''}$${Math.abs(Math.round(diff)).toLocaleString()} (${diff >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas - Wide Panoramic Ratio */}
      <div className="h-[220px] sm:h-[280px] lg:h-[320px] relative w-full pt-1">
        <Line data={chartData} options={options} />
      </div>

      <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider font-mono border-t border-slate-100 pt-1.5 font-bold flex-wrap gap-1">
        <span className="truncate">起始: {labels.length > 0 ? labels[0].replace(' (現價)', '') : '--'}</span>
        <span className="hidden xs:inline">資料以 TWD 估算</span>
        <span className="truncate">最新: {labels.length > 0 ? labels[labels.length - 1].replace(' (現價)', '') : '--'}</span>
      </div>
    </div>
  );
};
