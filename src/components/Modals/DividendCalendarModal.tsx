import React from 'react';
import { X, Calendar } from 'lucide-react';
import { StockPosition } from '../../types';
import { DividendCalendar } from '../DividendCalendar';
import { playClickSound } from '../../utils/audio';

interface DividendCalendarModalProps {
  isOpen: boolean;
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
  onClose: () => void;
  onUpdateStock?: (updatedStock: StockPosition) => void;
}

export const DividendCalendarModal: React.FC<DividendCalendarModalProps> = ({
  isOpen,
  portfolio,
  usdTwdRate,
  isPrivacy,
  onClose,
  onUpdateStock,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] w-full h-[100dvh] bg-slate-900 flex flex-col text-slate-100 overflow-hidden overscroll-none animate-fadeIn select-none modal-backdrop">
      {/* Modal Header */}
      <div className="bg-slate-950/90 border-b border-white/10 px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-2 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white leading-tight">
              領息戰報與股息日曆
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">除息除權行事曆 ｜ 複利試算 ｜ 目標進度追蹤</p>
          </div>
        </div>
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 transition btn-interact shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-3 sm:p-5 overflow-y-auto flex-1 overscroll-contain modal-content-scroll max-w-7xl mx-auto w-full">
        <DividendCalendar
          portfolio={portfolio}
          usdTwdRate={usdTwdRate}
          isPrivacy={isPrivacy}
          onUpdateStock={onUpdateStock}
        />
      </div>
    </div>
  );
};
