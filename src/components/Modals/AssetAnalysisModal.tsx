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
    <div className="fixed inset-0 z-[90] w-full h-[100dvh] bg-slate-100 flex flex-col text-slate-900 overflow-hidden overscroll-none animate-fadeIn select-none modal-backdrop">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/90 px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-2 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
              資產總市值走勢、長期河流圖與比重配置
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">即時權重佔比、歷史淨值曲線與資金流動水位</p>
          </div>
        </div>
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 transition btn-interact shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain modal-content-scroll max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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
  );
};
