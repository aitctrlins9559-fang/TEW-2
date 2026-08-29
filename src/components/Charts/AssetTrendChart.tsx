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
      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#38bdf8',
          bodyColor: '#f8fafc',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 8,
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
            font: { size: 9, weight: 'bold' as const },
            maxTicksLimit: 6,
            autoSkip: true,
            maxRotation: 0,
            padding: 2,
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
      <div className="flex justify-between items-center gap-2 border-b border-slate-100 pb-1.5 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-slate-800 tracking-tight shrink-0">
            全資產總市值走勢
          </span>
          <span className="text-[9px] text-slate-400 font-mono hidden xs:inline">
            (TWD)
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-slate-900 font-mono tabular-nums leading-none">
              {formatMoney(displayVal, isPrivacy)}
            </span>
            <span
              className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded border tabular-nums ${
                diff >= 0
                  ? (isRedUp ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200')
                  : (isRedUp ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200')
              }`}
            >
              {isPrivacy
                ? '--'
                : `${diff >= 0 ? '+' : ''}${diffPct.toFixed(2)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas - Wide Edge-to-Edge Ratio */}
      <div className="h-[200px] xs:h-[220px] sm:h-[260px] lg:h-[290px] relative w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
