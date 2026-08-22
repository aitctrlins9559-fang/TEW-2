import React from 'react';
import { Wallet, Coins, Zap, TrendingUp, Sparkles, Target, Calendar, ShieldCheck } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { playClickSound } from '../utils/audio';

interface KpiCardsProps {
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
  onOpenTodayPLModal: () => void;
  annualDividendIncome?: number;
  isExAdjustedMode?: boolean;
  onToggleExAdjustedMode?: () => void;
  totalPendingStockValueTWD?: number;
  totalPendingStockShares?: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
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
  annualDividendIncome = 0,
  isExAdjustedMode = true,
  onToggleExAdjustedMode,
  totalPendingStockValueTWD = 0,
  totalPendingStockShares = 0,
}) => {
  const getUpColor = () => (isRedUp ? 'text-rose-600' : 'text-emerald-600');
  const getDownColor = () => (isRedUp ? 'text-emerald-600' : 'text-rose-600');

  const todayPLClass = todayPL >= 0 ? getUpColor() : getDownColor();
  const totalProfitClass = totalProfit === null ? 'text-slate-400' : totalProfit >= 0 ? getUpColor() : getDownColor();

  const monthlyAvgDividend = Math.round(annualDividendIncome / 12);

  // Goal Progress (e.g. Monthly target $30,000 TWD)
  const monthlyGoal = 30000;
  const goalProgressPct = Math.min(100, Math.round((monthlyAvgDividend / monthlyGoal) * 100));

  return (
    <div className="flex flex-col gap-3.5">
      {/* Hero Asset Overview Banner - Nordic Luminous Pure White Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
        {/* Soft decorative luminous ambient light circles */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-slate-700 tracking-wider flex items-center gap-2 uppercase">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/15">
                <Wallet className="w-4 h-4 stroke-[2.5]" />
              </div>
              總資產淨估值 (TWD)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {onToggleExAdjustedMode && (
                <button
                  onClick={() => {
                    playClickSound();
                    onToggleExAdjustedMode();
                  }}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all duration-200 shadow-2xs flex items-center gap-1.5 btn-interact ${
                    isExAdjustedMode
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={
                    isExAdjustedMode
                      ? '已開啟除權息還原：配股價格下降時自動將待撥股數算入總資產估值，避免產生虛跌損益'
                      : '切換為標準市場盤價算表'
                  }
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isExAdjustedMode ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{isExAdjustedMode ? '除權息還原算表 ON' : '標準盤價'}</span>
                </button>
              )}
              <span className="text-xs font-bold px-3.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-100 shadow-2xs">
                總部位 {totalCount} 檔 ({twCount} 台股 / {usCount} 美股)
              </span>
            </div>
          </div>

          {/* Hero Numbers Row */}
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <div className="text-3xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {formatMoney(totalValue, isPrivacy)}
            </div>

            {/* Total Return Badge */}
            <div className={`text-sm sm:text-base font-black font-mono tabular-nums px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center gap-2 ${totalProfitClass}`}>
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              <span>
                {totalProfit === null
                  ? '--'
                  : `${totalProfit >= 0 ? '+' : ''}${formatMoney(totalProfit, isPrivacy)} (${totalROI !== null ? (totalROI >= 0 ? '+' : '') + totalROI.toFixed(2) + '%' : ''})`}
              </span>
            </div>
          </div>

          {/* Ex-Rights Protection Notice Banner */}
          {isExAdjustedMode && totalPendingStockShares > 0 && (
            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl px-3.5 py-2 flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                除權息還原保護中：已自動將待撥配股 +{totalPendingStockShares.toLocaleString()} 股 (${formatMoney(totalPendingStockValueTWD, isPrivacy)} TWD) 納入持股估值，真實反映實際資產淨值。
              </span>
              <span className="text-[10px] font-mono font-black text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200/60 shadow-2xs shrink-0">
                已平準除權跌幅
              </span>
            </div>
          )}

          {/* Dividend Passive Income Target Progress Tracker */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-800">
                <Target className="w-4 h-4 text-emerald-600" />
                月領 NT$ 30,000 被動現金流目標
              </span>
              <span className="font-mono text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-100 font-bold">
                月均 {formatMoney(monthlyAvgDividend, isPrivacy)} (進度 {goalProgressPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Sub-Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Cost Base */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 transition">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>建倉總成本</span>
            <Coins className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 mt-2 font-mono tabular-nums truncate">
            {formatMoney(totalCost, isPrivacy)}
          </div>
        </div>

        {/* Intraday P&L (Clickable) */}
        <div
          onClick={onOpenTodayPLModal}
          className="bg-white hover:bg-amber-50/50 p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] cursor-pointer flex flex-col justify-between transition active:scale-[0.98]"
          title="點擊查看今日盤中部位貢獻排行"
        >
          <div className="text-xs text-amber-900 font-black flex items-center justify-between">
            <span>今日盤中估損益</span>
            <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
          </div>
          <div className={`text-base sm:text-xl font-black mt-2 font-mono tabular-nums truncate ${todayPLClass}`}>
            {todayPL >= 0 ? '+' : ''}
            {formatMoney(todayPL, isPrivacy)}
          </div>
          <div className="text-[10px] text-amber-800 font-bold mt-1.5 flex items-center justify-between">
            <span>開啟即時貢獻榜 📊</span>
          </div>
        </div>

        {/* Annual Dividend Income */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="text-xs text-emerald-900 font-black flex items-center justify-between">
            <span>預估年領股息</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-xl font-black text-emerald-800 mt-2 font-mono tabular-nums truncate">
            {formatMoney(annualDividendIncome, isPrivacy)}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold mt-1.5">
            月均 {formatMoney(monthlyAvgDividend, isPrivacy)}
          </div>
        </div>

        {/* Unrealized Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 transition">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>未實現總損益</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className={`text-base sm:text-xl font-black mt-2 font-mono tabular-nums truncate ${totalProfitClass}`}>
            {totalProfit === null ? '--' : `${totalProfit >= 0 ? '+' : ''}${formatMoney(totalProfit, isPrivacy)}`}
          </div>
          <div className={`text-[10px] font-bold mt-1.5 tabular-nums ${totalProfitClass}`}>
            {totalROI === null ? '試算中' : `報酬率 ${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(2)}%`}
          </div>
        </div>
      </div>
    </div>
  );
};
