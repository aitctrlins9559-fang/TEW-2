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
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85dvh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5 font-black text-lg text-white">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <span>領息戰報與股息日曆</span>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <DividendCalendar
            portfolio={portfolio}
            usdTwdRate={usdTwdRate}
            isPrivacy={isPrivacy}
            onUpdateStock={onUpdateStock}
          />
        </div>
      </div>
    </div>
  );
};
