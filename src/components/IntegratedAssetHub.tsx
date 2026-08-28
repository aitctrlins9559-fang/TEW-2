import React, { useState } from 'react';
import { TrendingUp, PieChart, LayoutGrid, ChevronDown, ChevronUp, Waves } from 'lucide-react';
import { StockPosition } from '../types';
import { AssetTrendChart } from './Charts/AssetTrendChart';
import { AllocationPieChart } from './Charts/AllocationPieChart';
import { AssetRiverChart } from './Charts/AssetRiverChart';
import { formatMoney } from '../utils/format';
import { playClickSound } from '../utils/audio';

interface IntegratedAssetHubProps {
  labels: string[];
  data: number[];
  currentVal: number;
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
  isRedUp: boolean;
}

export const IntegratedAssetHub: React.FC<IntegratedAssetHubProps> = ({
  labels,
  data,
  currentVal,
  portfolio,
  usdTwdRate,
  isPrivacy,
  isRedUp,
}) => {
  const [activeTab, setActiveTab] = useState<'trend' | 'river' | 'pie' | 'both'>('both');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="bg-white p-2 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2.5 sm:space-y-4 relative w-full">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-100 pb-2.5 sm:pb-3.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
              <span>全資產走勢</span>
              <span className="text-[11px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {formatMoney(currentVal, isPrivacy)}
              </span>
            </h2>
            <p className="text-[9px] sm:text-[11px] text-slate-500 font-medium truncate">總市值歷史趨勢、河流圖與資產配置分析</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-4 sm:flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100 text-xs w-full sm:w-auto">
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('trend');
            }}
            className={`px-1 sm:px-3 py-1 sm:py-1 rounded-md sm:rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
              activeTab === 'trend'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">走勢</span>
            <span className="hidden sm:inline">即時走勢</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveTab('river');
            }}
            className={`px-1 sm:px-3 py-1 sm:py-1 rounded-md sm:rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
              activeTab === 'river'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">河流</span>
            <span className="hidden sm:inline">河流圖</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveTab('pie');
            }}
            className={`px-1 sm:px-3 py-1 sm:py-1 rounded-md sm:rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
              activeTab === 'pie'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">占比</span>
            <span className="hidden sm:inline">資產占比</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveTab('both');
            }}
            className={`px-1 sm:px-3 py-1 sm:py-1 rounded-md sm:rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
              activeTab === 'both'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">全景</span>
            <span className="hidden sm:inline">雙排全景</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Containers */}
      {isExpanded && (
        <div className="pt-0.5 w-full">
          {activeTab === 'both' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3.5 w-full">
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 w-full overflow-hidden">
                <AssetTrendChart labels={labels} data={data} isPrivacy={isPrivacy} isRedUp={isRedUp} />
              </div>

              <div className="bg-slate-50/50 p-2.5 sm:p-4 rounded-xl border border-slate-100 w-full">
                <h3 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-emerald-600" /> 持股權重配比
                </h3>
                <AllocationPieChart portfolio={portfolio} usdTwdRate={usdTwdRate} isPrivacy={isPrivacy} />
              </div>
            </div>
          ) : activeTab === 'trend' ? (
            <div className="bg-slate-50/50 rounded-xl border border-slate-100 w-full overflow-hidden">
              <AssetTrendChart labels={labels} data={data} isPrivacy={isPrivacy} isRedUp={isRedUp} />
            </div>
          ) : activeTab === 'river' ? (
            <div className="bg-slate-50/50 rounded-xl border border-slate-100 w-full overflow-hidden">
              <AssetRiverChart portfolio={portfolio} usdTwdRate={usdTwdRate} isPrivacy={isPrivacy} />
            </div>
          ) : (
            <div className="bg-slate-50/50 p-2.5 sm:p-4 rounded-xl border border-slate-100 w-full">
              <AllocationPieChart portfolio={portfolio} usdTwdRate={usdTwdRate} isPrivacy={isPrivacy} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
