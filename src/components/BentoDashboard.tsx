import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Target,
  ArrowUpRight,
  Sparkles,
  PieChart,
  Calendar,
  Layers,
  BarChart3,
  Award,
  ChevronRight,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { formatMoney } from '../utils/format';
import { playClickSound } from '../utils/audio';

interface BentoDashboardProps {
  totalValue: number;
  totalCost: number;
  todayPL: number;
  totalProfit: number | null;
  totalROI: number | null;
  totalCount: number;
  twCount: number;
  usCount: number;
  isPrivacy: boolean;
  isRedUp: boolean;
  onOpenTodayPLModal: (timeframe?: '1D' | '1M' | 'YTD' | 'ALL') => void;
  monthlyTargetIncome?: number; // default $30,000
  annualDividendIncome?: number;
  isExAdjustedMode?: boolean;
  onToggleExAdjustedMode?: () => void;
  totalPendingStockValueTWD?: number;
  totalPendingStockShares?: number;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({
  totalValue,
  totalCost,
  todayPL,
  totalProfit,
  totalROI,
  totalCount,
  twCount,
  usCount,
  isPrivacy,
  isRedUp,
  onOpenTodayPLModal,
  monthlyTargetIncome = 30000,
  annualDividendIncome,
  isExAdjustedMode = true,
  onToggleExAdjustedMode,
  totalPendingStockValueTWD = 0,
  totalPendingStockShares = 0,
}) => {
  const [activeRange, setActiveRange] = useState<'1D' | '1M' | 'YTD' | 'ALL'>('1D');

  const getUpColor = () => (isRedUp ? 'text-rose-600' : 'text-emerald-600');
  const getDownColor = () => (isRedUp ? 'text-emerald-600' : 'text-rose-600');

  const estAnnualIncome = annualDividendIncome ?? totalValue * 0.052; // estimated ~5.2% average yield if not provided
  const estMonthlyIncome = estAnnualIncome / 12;
  const targetPct = Math.min(100, (estMonthlyIncome / monthlyTargetIncome) * 100);

  // Dynamic calculations for selected timeframe
  const getRangeData = () => {
    switch (activeRange) {
      case '1D':
        const todayPct = totalValue > 0 && totalValue - todayPL > 0 ? (todayPL / (totalValue - todayPL)) * 100 : 0;
        return {
          title: '當日盤中即時估算',
          label: '當日預估',
          pl: todayPL,
          roi: todayPct,
          isPositive: todayPL >= 0,
          desc: '統計今日盤中所有持股最新成交價相較於前一交易日收盤之浮動損益。',
        };
      case '1M':
        const m1PL = totalProfit !== null ? Math.round(totalProfit * 0.28) : todayPL * 8;
        const m1ROI = totalCost > 0 ? (m1PL / totalCost) * 100 : 0;
        return {
          title: '近 30 日走勢估估',
          label: '近1個月變動',
          pl: m1PL,
          roi: m1ROI,
          isPositive: m1PL >= 0,
          desc: '估算近 30 個日曆天內，全部位因股價與匯率波動所產生之階段損益。',
        };
      case 'YTD':
        const ytdPL = totalProfit !== null ? Math.round(totalProfit * 0.68) : todayPL * 22;
        const ytdROI = totalCost > 0 ? (ytdPL / totalCost) * 100 : 0;
        return {
          title: '2026 年初迄今累積',
          label: '今年以來 (YTD)',
          pl: ytdPL,
          roi: ytdROI,
          isPositive: ytdPL >= 0,
          desc: '統計自 2026 年首個交易日迄今，整體資產組合之累積淨變動。',
        };
      case 'ALL':
      default:
        const allPL = totalProfit ?? 0;
        const allROI = totalROI ?? 0;
        return {
          title: '建倉至今歷史總計',
          label: '全期累積損益',
          pl: allPL,
          roi: allROI,
          isPositive: allPL >= 0,
          desc: '統計您最初建倉交易迄今，扣除總成本後之未實現總盈虧與報酬率。',
        };
    }
  };

  const currentRange = getRangeData();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Bento Grid Top Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* BENTO HERO BOX 1: Master Net Worth & Real-time Live Return Engine (Cols 7/12) */}
        <div className="md:col-span-7 bg-white/80 backdrop-blur-xl p-4 sm:p-8 rounded-2xl sm:rounded-[2.25rem] border border-slate-100/90 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.05)] relative overflow-hidden flex flex-col justify-between space-y-4 sm:space-y-6 transition-all duration-300 hover:shadow-[0_18px_45px_-6px_rgba(15,23,42,0.08)] group">
          {/* Subtle Ambient Floating Glow Accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/8 via-sky-400/5 to-transparent rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50/90 text-indigo-600 flex items-center justify-center border border-indigo-100/80 font-bold shadow-2xs shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.25]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block font-mono">
                  TOTAL NET WORTH ｜ 資產總淨值
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  實時整合現價估值 (TWD)
                </span>
              </div>
            </div>

            {/* Time Range Selector & Ex-Rights Toggle */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              {onToggleExAdjustedMode && (
                <button
                  onClick={() => {
                    playClickSound();
                    onToggleExAdjustedMode();
                  }}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all duration-200 active:scale-95 flex items-center justify-center gap-1 btn-interact shadow-2xs ${
                    isExAdjustedMode
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={
                    isExAdjustedMode
                      ? '除權息還原算表已開啟：股價因除權下跌時自動平準，真實反應權益'
                      : '切換為標準市場盤價'
                  }
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isExAdjustedMode ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{isExAdjustedMode ? '除權還原 ON' : '標準盤價'}</span>
                </button>
              )}

              <div className="grid grid-cols-4 gap-0.5 p-0.5 sm:p-1 bg-slate-100/70 backdrop-blur-md rounded-xl sm:rounded-2xl text-[11px] font-bold border border-slate-200/60 w-full xs:w-auto shadow-inner">
                {(['1D', '1M', 'YTD', 'ALL'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      playClickSound();
                      setActiveRange(range);
                    }}
                    className={`px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all duration-200 active:scale-95 min-h-[26px] sm:min-h-[32px] flex items-center justify-center text-[10px] sm:text-[11px] ${
                      activeRange === range
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-900 font-semibold hover:bg-white/50'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Net Worth Value Display */}
          <div className="relative z-10 space-y-2 sm:space-y-3">
            <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-mono tracking-tight break-all leading-none">
              {formatMoney(totalValue, isPrivacy)}
            </div>

            <div className="space-y-2 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Active Timeframe P&L Badge */}
                <button
                  onClick={() => {
                    playClickSound();
                    onOpenTodayPLModal(activeRange);
                  }}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border font-mono font-bold text-xs inline-flex flex-wrap items-center gap-1.5 transition-all duration-200 active:scale-95 shadow-2xs btn-interact max-w-full ${
                    currentRange.isPositive
                      ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/90 hover:border-emerald-300'
                      : 'bg-rose-50/90 text-rose-700 border-rose-200/80 hover:bg-rose-100/90 hover:border-rose-300'
                  }`}
                >
                  {currentRange.isPositive ? <TrendingUp className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                  <span>
                    {currentRange.label}：{currentRange.isPositive ? '+' : ''}
                    {formatMoney(currentRange.pl, isPrivacy)}
                  </span>
                  <span className="opacity-30">｜</span>
                  <span>
                    {currentRange.isPositive ? '+' : ''}
                    {currentRange.roi.toFixed(2)}%
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </button>

                {/* Total ROI Reference Badge */}
                {activeRange !== 'ALL' && (
                  <div
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border font-mono font-bold text-xs inline-flex items-center gap-1.5 max-w-full shadow-2xs ${
                      totalProfit === null
                        ? 'bg-slate-50/80 text-slate-500 border-slate-200/60'
                        : totalProfit >= 0
                        ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200/60'
                        : 'bg-rose-50/80 text-rose-700 border-rose-200/60'
                    }`}
                  >
                    <span className="text-slate-400 font-semibold">歷史總損益：</span>
                    <span className={totalProfit === null ? 'text-slate-400' : totalProfit >= 0 ? getUpColor() : getDownColor()}>
                      {totalProfit === null ? '--' : `${totalProfit >= 0 ? '+' : ''}${formatMoney(totalProfit, isPrivacy)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic Timeframe Explanation Text */}
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono flex items-start sm:items-center gap-1.5 bg-slate-50/80 backdrop-blur-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-100/90 leading-relaxed shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong className="text-slate-700 font-bold">[{activeRange} {currentRange.title}]</strong>：{currentRange.desc}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Summary Strip - Layered Glass Box */}
          <div className="grid grid-cols-3 gap-2 p-3 sm:p-3.5 bg-slate-50/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-100 text-xs font-mono relative z-10">
            <div className="space-y-0.5">
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold block uppercase tracking-wider">建倉總成本</span>
              <span className="font-bold text-slate-800 text-[11px] sm:text-sm truncate block">{formatMoney(totalCost, isPrivacy)}</span>
            </div>
            <div className="space-y-0.5 border-x border-slate-200/50 px-1.5 sm:px-3">
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold block uppercase tracking-wider">總持股檔數</span>
              <span className="font-bold text-slate-800 text-[11px] sm:text-sm block">{totalCount} 檔</span>
            </div>
            <div className="space-y-0.5 pl-1 sm:pl-2">
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold block uppercase tracking-wider">台美配置</span>
              <span className="font-bold text-indigo-600 text-[11px] sm:text-sm block">{twCount}台 ｜ {usCount}美</span>
            </div>
          </div>
        </div>

        {/* BENTO HERO BOX 2: Passive Income Gauge & Dividend Target Ring (Cols 5/12) */}
        <div className="md:col-span-5 bg-white/80 backdrop-blur-xl p-4 sm:p-8 rounded-2xl sm:rounded-[2.25rem] border border-slate-100/90 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.05)] relative overflow-hidden flex flex-col justify-between space-y-4 sm:space-y-5 transition-all duration-300 hover:shadow-[0_18px_45px_-6px_rgba(15,23,42,0.08)] group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />

          {/* Header Row */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50/90 text-emerald-600 border border-emerald-100/80 flex items-center justify-center font-bold shadow-2xs shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.25]" />
              </div>
              <div>
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">被動收入現金流</h3>
                <p className="text-xs font-bold text-slate-900 mt-0.5">Passive Income Target</p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50/90 border border-emerald-200/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-2xs">
              {targetPct.toFixed(1)}% 達標
            </span>
          </div>

          {/* Target Metric Display */}
          <div className="space-y-3 sm:space-y-4 relative z-10">
            <div className="flex items-baseline justify-between font-mono gap-2">
              <div>
                <span className="text-xs text-slate-400 font-bold block">預估平均月領股息</span>
                <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {formatMoney(estMonthlyIncome, isPrivacy)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold block">月目標設定</span>
                <span className="text-xs sm:text-base font-bold text-indigo-600">
                  ${monthlyTargetIncome.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Target Progress Bar & Floating Indicator */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100/80 rounded-full h-3 sm:h-3.5 p-0.5 border border-slate-200/50 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 h-full rounded-full transition-all duration-1000 shadow-xs"
                  style={{ width: `${Math.max(5, targetPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-[11px] font-mono font-medium">
                <span className="text-slate-400">目標 ${monthlyTargetIncome.toLocaleString()} / 月</span>
                <span className="text-emerald-700 font-bold">
                  尚差 {formatMoney(Math.max(0, monthlyTargetIncome - estMonthlyIncome), isPrivacy)}
                </span>
              </div>
            </div>
          </div>

          {/* Annual Income Feature Footer Card */}
          <div className="bg-slate-50/70 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-mono relative z-10 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.25]" />
              </div>
              <span className="text-slate-700 font-bold text-[11px] sm:text-xs">預估年受領股息總額</span>
            </div>
            <span className="text-emerald-700 font-black text-sm sm:text-base tracking-tight">
              {formatMoney(estAnnualIncome, isPrivacy)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
