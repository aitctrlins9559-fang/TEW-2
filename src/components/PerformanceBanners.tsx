import React from 'react';
import { TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { StockPosition } from '../types';
import { formatMoney } from '../utils/format';

interface PerformanceBannersProps {
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
  isRedUp: boolean;
  onSelectStock?: (symbol: string, market: 'tse' | 'otc' | 'us', name: string) => void;
}

export const PerformanceBanners: React.FC<PerformanceBannersProps> = ({
  portfolio,
  usdTwdRate,
  isPrivacy,
  isRedUp,
  onSelectStock,
}) => {
  const getUpColor = () => (isRedUp ? 'text-rose-600' : 'text-emerald-600');
  const getDownColor = () => (isRedUp ? 'text-emerald-600' : 'text-rose-600');

  const stats = portfolio.map((item) => {
    const fx = item.market === 'us' ? usdTwdRate : 1;
    const costTWD = item.shares * item.cost * (item.market === 'us' ? item.buyRate : 1);
    const valueTWD = item.price ? item.shares * item.price * fx : null;
    const profitTWD = valueTWD !== null ? valueTWD - costTWD : null;
    const roi = costTWD > 0 && profitTWD !== null ? (profitTWD / costTWD) * 100 : null;

    return {
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      profit: profitTWD,
      roi,
    };
  });

  const winners = stats
    .filter((s) => s.profit !== null && s.profit > 0)
    .sort((a, b) => (b.profit || 0) - (a.profit || 0));

  const losers = stats
    .filter((s) => s.profit !== null && s.profit < 0)
    .sort((a, b) => (a.profit || 0) - (b.profit || 0));

  const mvp = winners.length > 0 ? winners[0] : null;
  const lvp = losers.length > 0 ? losers[0] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* Top Performer */}
      <div
        onClick={() => {
          if (mvp && onSelectStock) {
            onSelectStock(mvp.symbol, mvp.market, mvp.name);
          }
        }}
        className={`glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex justify-between items-center border-l-4 ${
          isRedUp ? 'border-l-rose-500 bg-gradient-to-r from-rose-50/50 via-white to-white' : 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/50 via-white to-white'
        } transition-all duration-300 hover-card ${
          mvp && onSelectStock ? 'cursor-pointer hover:border-indigo-300' : ''
        }`}
      >
        <div className="space-y-1">
          <div
            className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${
              isRedUp ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> 績效領頭羊 (Top Performer)
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {mvp ? `${mvp.symbol} ${mvp.name}` : '目前無獲利標的'}
          </div>
          {mvp && (
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <span>貢獻最高未實現正收益</span>
              <span className="text-indigo-600 font-bold">(點擊看詳情)</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight tabular-nums ${getUpColor()}`}>
            {mvp && mvp.profit !== null && mvp.roi !== null
              ? `+${formatMoney(mvp.profit, isPrivacy)}`
              : '$0'}
          </div>
          <div className={`text-xs font-mono font-bold ${getUpColor()}`}>
            {mvp && mvp.roi !== null ? `+${mvp.roi.toFixed(1)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Risk Alert / Worst Performer */}
      <div
        onClick={() => {
          if (lvp && onSelectStock) {
            onSelectStock(lvp.symbol, lvp.market, lvp.name);
          }
        }}
        className={`glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex justify-between items-center border-l-4 ${
          isRedUp ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/50 via-white to-white' : 'border-l-rose-500 bg-gradient-to-r from-rose-50/50 via-white to-white'
        } transition-all duration-300 hover-card ${
          lvp && onSelectStock ? 'cursor-pointer hover:border-indigo-300' : ''
        }`}
      >
        <div className="space-y-1">
          <div
            className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${
              isRedUp ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {lvp ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {lvp ? '風險觀察標的 (Risk Highlight)' : '資產健康度優良'}
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {lvp ? `${lvp.symbol} ${lvp.name}` : '無累積虧損部位'}
          </div>
          {lvp ? (
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <span>建議評估止損或佈局調整</span>
              <span className="text-rose-600 font-bold">(點擊看詳情)</span>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-700 font-medium">
              全數持股均處於平盤或盈餘狀態
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight tabular-nums ${getDownColor()}`}>
            {lvp && lvp.profit !== null && lvp.roi !== null
              ? `${formatMoney(lvp.profit, isPrivacy)}`
              : '$0'}
          </div>
          <div className={`text-xs font-mono font-bold ${getDownColor()}`}>
            {lvp && lvp.roi !== null ? `${lvp.roi.toFixed(1)}%` : '0%'}
          </div>
        </div>
      </div>
    </div>
  );
};
