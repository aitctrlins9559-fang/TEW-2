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
    <div className="bg-white p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-1.5 sm:space-y-2.5 relative w-full">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-100 pb-1.5 sm:pb-2 px-0.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1 sm:p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
              <span>全資產走勢</span>
              <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {formatMoney(currentVal, isPrivacy)}
              </span>
            </h2>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-4 sm:flex items-center gap-0.5 p-0.5 bg-slate-50 rounded-lg border border-slate-100 text-xs w-full sm:w-auto">
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('trend');
            }}
            className={`px-1 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-bold transition text-[10px] sm:text-xs text-center ${
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
            className={`px-1 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-bold transition text-[10px] sm:text-xs text-center ${
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
            className={`px-1 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-bold transition text-[10px] sm:text-xs text-center ${
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
            className={`px-1 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-bold transition text-[10px] sm:text-xs text-center ${
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-2.5 w-full">
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 w-full overflow-hidden">
                <AssetTrendChart labels={labels} data={data} isPrivacy={isPrivacy} isRedUp={isRedUp} />
              </div>

              <div className="bg-slate-50/50 p-1.5 sm:p-2.5 rounded-xl border border-slate-100 w-full">
                <h3 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
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
            <div className="bg-slate-50/50 p-1.5 sm:p-2.5 rounded-xl border border-slate-100 w-full">
              <AllocationPieChart portfolio={portfolio} usdTwdRate={usdTwdRate} isPrivacy={isPrivacy} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
