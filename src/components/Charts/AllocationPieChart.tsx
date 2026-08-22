import React, { useState, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { PieChart, ShieldCheck, LayoutGrid, List } from 'lucide-react';
import { StockPosition } from '../../types';
import { playClickSound } from '../../utils/audio';

ChartJS.register(ArcElement, DoughnutController, Tooltip, Legend);

interface AllocationPieChartProps {
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
}

export const AllocationPieChart: React.FC<AllocationPieChartProps> = ({
  portfolio,
  usdTwdRate,
  isPrivacy,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'stacked'>('split');
  const isEmpty = portfolio.length === 0;

  const labels = isEmpty ? ['尚未建倉'] : portfolio.map((p) => `${p.name} (${p.symbol})`);
  const rawValues = isEmpty
    ? [1]
    : portfolio.map((p) =>
        p.price && p.price > 0 ? p.shares * p.price * (p.market === 'us' ? usdTwdRate : 1) : 0
      );

  const baseColors = [
    '#4f46e5', // indigo-600
    '#0284c7', // sky-600
    '#059669', // emerald-600
    '#e11d48', // rose-600
    '#d97706', // amber-600
    '#9333ea', // purple-600
    '#ea580c', // orange-600
    '#db2777', // pink-600
    '#0d9488', // teal-600
    '#7c3aed', // violet-600
    '#ca8a04', // yellow-600
    '#c026d3', // fuchsia-600
  ];

  const bgColors = isEmpty ? ['#e2e8f0'] : labels.map((_, i) => baseColors[i % baseColors.length]);

  const chartData = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          data: rawValues,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: isEmpty ? 0 : 6,
        },
      ],
    };
  }, [labels, rawValues, bgColors, isEmpty]);

  const totalValue = rawValues.reduce((a, b) => a + b, 0);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '74%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#38bdf8',
          bodyColor: '#f8fafc',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          callbacks: {
            label: (context: { raw: unknown; chart: ChartJS }) => {
              if (isEmpty) return ' 市值: $0 NT$ (0%)';
              const dataset = context.chart.data.datasets[0];
              const currentTotal = (dataset.data as number[]).reduce((a, b) => a + b, 0);
              const val = Number(context.raw) || 0;
              const pct = currentTotal > 0 ? ((val / currentTotal) * 100).toFixed(1) + '%' : '0%';
              return isPrivacy
                ? ` 市值: **** NT$ (${pct})`
                : ` 市值: $${Math.round(val).toLocaleString()} NT$ (${pct})`;
            },
          },
        },
      },
    };
  }, [isEmpty, isPrivacy]);

  return (
    <div className="lg:col-span-2 glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 flex flex-col border border-slate-200/90 shadow-sm bg-white">
      {/* Header with View Mode Selector */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <PieChart className="w-4 h-4" />
          </div>
          個股資產配置占比
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-mono hidden sm:flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 權重分佈
          </span>
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center gap-0.5">
            <button
              onClick={() => {
                playClickSound();
                setViewMode('split');
              }}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'split'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="並排顯示"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                playClickSound();
                setViewMode('stacked');
              }}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'stacked'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="上下列表全覽"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center flex-grow py-1">
          {/* Doughnut Canvas */}
          <div className="sm:col-span-5 relative h-[200px] w-full flex items-center justify-center">
            <Doughnut data={chartData} options={options} />

            {/* Absolute Center Content with Scaled Font */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                資產總額
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 tracking-tight tabular-nums truncate max-w-[120px]">
                {isPrivacy ? '****' : `$${Math.round(totalValue).toLocaleString()}`}
              </span>
              <span className="text-[10px] font-mono text-indigo-600 font-bold mt-0.5">
                {isEmpty ? '無持股' : `共 ${portfolio.length} 筆`}
              </span>
            </div>
          </div>

          {/* Legend List */}
          <div className="sm:col-span-7 space-y-1.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
            {isEmpty ? (
              <div className="text-slate-400 text-xs text-center py-8">目前尚無持股部位</div>
            ) : (
              portfolio.map((item, idx) => {
                const val =
                  item.price && item.price > 0
                    ? item.shares * item.price * (item.market === 'us' ? usdTwdRate : 1)
                    : 0;
                const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
                const color = baseColors[idx % baseColors.length];

                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition border border-slate-200/80 gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="font-bold text-slate-900 text-xs truncate"
                        title={`${item.name} (${item.symbol})`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold shrink-0">
                        {item.symbol}
                      </span>
                    </div>

                    <div className="text-right shrink-0 font-mono flex items-center gap-2">
                      <span className="font-bold text-indigo-600 text-xs tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium tabular-nums">
                        {isPrivacy ? '****' : `$${Math.round(val).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Stacked View: Doughnut on top, Full-width Stock List below */
        <div className="space-y-4 flex-grow py-1">
          <div className="relative h-[190px] w-full flex items-center justify-center">
            <Doughnut data={chartData} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                資產總額
              </span>
              <span className="text-base font-black font-mono text-slate-900 tracking-tight tabular-nums">
                {isPrivacy ? '****' : `$${Math.round(totalValue).toLocaleString()}`}
              </span>
              <span className="text-[10px] font-mono text-indigo-600 font-bold mt-0.5">
                {isEmpty ? '無持股' : `共 ${portfolio.length} 筆標的部位`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {isEmpty ? (
              <div className="col-span-2 text-slate-400 text-xs text-center py-6">
                目前尚無持股部位
              </div>
            ) : (
              portfolio.map((item, idx) => {
                const val =
                  item.price && item.price > 0
                    ? item.shares * item.price * (item.market === 'us' ? usdTwdRate : 1)
                    : 0;
                const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
                const color = baseColors[idx % baseColors.length];

                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl transition border border-slate-200/80 gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono font-bold">
                          {item.symbol} ｜ {item.market.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className="font-bold text-indigo-600 text-xs tabular-nums">
                        {pct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium tabular-nums">
                        {isPrivacy ? '****' : `$${Math.round(val).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
