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
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 relative">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              全資產視覺圖表
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {formatMoney(currentVal, isPrivacy)}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">總市值歷史走勢、資產配置與權重分析</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-4 sm:flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 text-xs w-full sm:w-auto">
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('trend');
            }}
            className={`px-1.5 sm:px-3 py-1 rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
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
            className={`px-1.5 sm:px-3 py-1 rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
              activeTab === 'river'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">水流</span>
            <span className="hidden sm:inline">河流圖</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveTab('pie');
            }}
            className={`px-1.5 sm:px-3 py-1 rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
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
            className={`px-1.5 sm:px-3 py-1 rounded-lg font-bold transition text-[10px] sm:text-xs text-center ${
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
        <div className="pt-2">
          {activeTab === 'both' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" /> 資產價值歷史趨勢
                </h3>
                <AssetTrendChart labels={labels} data={data} isPrivacy={isPrivacy} isRedUp={isRedUp} />
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" /> 持股權重配比
                </h3>
                <AllocationPieChart portfolio={portfolio} usdTwdRate={usdTwdRate} isPrivacy={isPrivacy} />
              </div>
            </div>
          ) : activeTab === 'trend' ? (
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-2xs">
              <AssetTrendChart labels={labels} data={data} isPrivacy={isPrivacy} isRedUp={isRedUp} />
            </div>
          ) : activeTab === 'river' ? (
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-2xs">
              <AssetRiverChart portfolio={portfolio} usdTwdRate={usdTwdRate} isPrivacy={isPrivacy} />
            </div>
          ) : (
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-2xs">
              <AllocationPieChart portfolio={portfolio} usdTwdRate={usdTwdRate} isPrivacy={isPrivacy} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
