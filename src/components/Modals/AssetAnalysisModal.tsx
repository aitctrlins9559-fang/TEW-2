import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import { StockPosition } from '../../types';
import { AssetTrendChart } from '../Charts/AssetTrendChart';
import { AllocationPieChart } from '../Charts/AllocationPieChart';
import { AssetRiverChart } from '../Charts/AssetRiverChart';
import { playClickSound } from '../../utils/audio';

interface AssetAnalysisModalProps {
  isOpen: boolean;
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
  isRedUp: boolean;
  labels: string[];
  data: number[];
  currentVal: number;
  onClose: () => void;
}

export const AssetAnalysisModal: React.FC<AssetAnalysisModalProps> = ({
  isOpen,
  portfolio,
  usdTwdRate,
  isPrivacy,
  isRedUp,
  labels,
  data,
  currentVal,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn overscroll-none modal-backdrop"
    >
      <div
        className="w-full max-w-6xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85dvh] sm:max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 font-black text-lg text-slate-900">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span>資產總市值走勢、長期河流圖與比重配置</span>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 overscroll-contain modal-content-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <AssetTrendChart
              labels={labels}
              data={data}
              currentVal={currentVal}
              isPrivacy={isPrivacy}
              isRedUp={isRedUp}
            />
            <AllocationPieChart
              portfolio={portfolio}
              usdTwdRate={usdTwdRate}
              isPrivacy={isPrivacy}
            />
          </div>

          {/* Long-Term Asset River Chart */}
          <AssetRiverChart
            portfolio={portfolio}
            usdTwdRate={usdTwdRate}
            isPrivacy={isPrivacy}
            isRedUp={isRedUp}
          />
        </div>
      </div>
    </div>
  );
};
