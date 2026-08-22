import React, { useState } from 'react';
import { Sparkles, RefreshCw, Compass, ShieldAlert } from 'lucide-react';
import { getLunarCalendarInfo, LunarInfo } from '../utils/lunar';
import { playClickSound } from '../utils/audio';

export const LunarFortuneCard: React.FC = () => {
  const [lunarInfo, setLunarInfo] = useState<LunarInfo>(getLunarCalendarInfo());

  const handleRefresh = () => {
    playClickSound();
    setLunarInfo(getLunarCalendarInfo());
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-3 bg-white">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>每日黃曆與操盤心法</span>
          <span className="text-[11px] text-slate-400 font-mono font-normal ml-1">
            {lunarInfo.dateStr}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 btn-interact shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> 換一心法
        </button>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Lunar Date Tag */}
        <div className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 font-bold">
          ☯️ {lunarInfo.lunarText} ｜ {lunarInfo.ganZhiText}
        </div>

        {/* Yi / Ji */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-start gap-1.5">
            <span className="text-emerald-700 font-bold shrink-0">【宜】</span>
            <span className="text-slate-700 font-medium">{lunarInfo.yiList}</span>
          </div>
          <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-start gap-1.5">
            <span className="text-rose-700 font-bold shrink-0">【忌】</span>
            <span className="text-slate-700 font-medium">{lunarInfo.jiList}</span>
          </div>
        </div>

        {/* Mindset Mantra */}
        <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/60 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-amber-900 font-medium">
            <span className="flex items-center gap-1 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              沖煞：<strong>{lunarInfo.chong}</strong>
            </span>
            <span className="flex items-center gap-1 font-mono">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              財神：<strong>{lunarInfo.cai}</strong>
            </span>
          </div>
          <div className="text-amber-900 font-bold text-xs pt-1 flex items-start gap-1">
            <span className="shrink-0 text-amber-600">💡 操盤心法：</span>
            <span>{lunarInfo.tradingMindset}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
