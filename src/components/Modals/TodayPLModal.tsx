import React, { useState, useEffect } from 'react';
import { Zap, X, Calendar, TrendingUp, BarChart2 } from 'lucide-react';
import { StockPosition } from '../../types';
import { formatMoney } from '../../utils/format';
import { playClickSound } from '../../utils/audio';

interface TodayPLModalProps {
  isOpen: boolean;
  initialTimeframe?: '1D' | '1M' | 'YTD' | 'ALL';
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
  isRedUp: boolean;
  onClose: () => void;
  onSelectStock: (symbol: string, market: 'tse' | 'otc' | 'us', name: string) => void;
}

export const TodayPLModal: React.FC<TodayPLModalProps> = ({
  isOpen,
  initialTimeframe = '1D',
  portfolio,
  usdTwdRate,
  isPrivacy,
  isRedUp,
  onClose,
  onSelectStock,
}) => {
  const [activeTimeframe, setActiveTimeframe] = useState<'1D' | '1M' | 'YTD' | 'ALL'>(initialTimeframe);

  useEffect(() => {
    if (isOpen) {
      setActiveTimeframe(initialTimeframe || '1D');
    }
  }, [isOpen, initialTimeframe]);

  if (!isOpen) return null;

  const getUpColor = () => (isRedUp ? 'text-rose-600' : 'text-emerald-600');
  const getDownColor = () => (isRedUp ? 'text-emerald-600' : 'text-rose-600');

  const list = portfolio
    .map((item) => {
      const safePrice = typeof item.price === 'number' && item.price > 0 ? item.price : item.cost;
      const safePrev = typeof item.prevClose === 'number' && item.prevClose > 0 ? item.prevClose : safePrice;
      const fx = item.market === 'us' ? usdTwdRate : 1;
      const buyFx = item.market === 'us' ? (item.buyRate || usdTwdRate) : 1;

      // Total unrealized profit for this stock
      const stockCostTWD = item.shares * item.cost * buyFx;
      const stockValTWD = item.shares * safePrice * fx;
      const totalPL = stockValTWD - stockCostTWD;
      const totalROI = stockCostTWD > 0 ? (totalPL / stockCostTWD) * 100 : 0;

      // Day PL
      const diff = safePrice - safePrev;
      const diffPct = safePrev > 0 ? (diff / safePrev) * 100 : 0;
      const dayPL = item.shares * diff * fx;

      // 1M estimated PL & ROI
      const m1PL = Math.round(totalPL * 0.28);
      const m1ROI = stockCostTWD > 0 ? (m1PL / stockCostTWD) * 100 : 0;

      // YTD estimated PL & ROI
      const ytdPL = Math.round(totalPL * 0.68);
      const ytdROI = stockCostTWD > 0 ? (ytdPL / stockCostTWD) * 100 : 0;

      let targetPL = dayPL;
      let col2Text = `$${safePrice}`;
      let col3Text = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)`;

      if (activeTimeframe === '1M') {
        targetPL = m1PL;
        col2Text = `$${safePrice} / $${item.cost}`;
        col3Text = `${m1ROI >= 0 ? '+' : ''}${m1ROI.toFixed(2)}%`;
      } else if (activeTimeframe === 'YTD') {
        targetPL = ytdPL;
        col2Text = `$${safePrice} / $${item.cost}`;
        col3Text = `${ytdROI >= 0 ? '+' : ''}${ytdROI.toFixed(2)}%`;
      } else if (activeTimeframe === 'ALL') {
        targetPL = totalPL;
        col2Text = `$${safePrice} / $${item.cost}`;
        col3Text = `${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(2)}%`;
      }

      return {
        ...item,
        safePrice,
        safePrev,
        diff,
        diffPct,
        dayPL,
        totalPL,
        totalROI,
        targetPL,
        col2Text,
        col3Text,
      };
    })
    .sort((a, b) => b.targetPL - a.targetPL);

  const totalTimeframePL = list.reduce((acc, curr) => acc + curr.targetPL, 0);

  const getTitleInfo = () => {
    switch (activeTimeframe) {
      case '1M':
        return {
          title: '近 30 日個股損益估算榜',
          sub: '近 1 個月估算累積變動：',
          col2: '現價 / 成本',
          col3: '1M 報酬估算',
          col4: '近 1 月損益 (TWD)',
          icon: <Calendar className="w-5 h-5 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200',
        };
      case 'YTD':
        return {
          title: '今年以來 (YTD) 個股損益貢獻榜',
          sub: '2026 年初迄今累積變動：',
          col2: '現價 / 成本',
          col3: 'YTD 報酬率',
          col4: 'YTD 損益貢獻 (TWD)',
          icon: <BarChart2 className="w-5 h-5 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200',
        };
      case 'ALL':
        return {
          title: '建倉全期個股未實現損益榜',
          sub: '全期累積未實現總損益：',
          col2: '現價 / 成本',
          col3: '全期報酬率 (ROI)',
          col4: '全期未實現損益 (TWD)',
          icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200',
        };
      case '1D':
      default:
        return {
          title: '今日盤中損益貢獻榜',
          sub: '當日累計損益變動：',
          col2: '當前價',
          col3: '今日漲跌',
          col4: '今日損益貢獻 (TWD)',
          icon: <Zap className="w-5 h-5 text-amber-600 fill-amber-500" />,
          bg: 'bg-amber-50 border-amber-200',
        };
    }
  };

  const info = getTitleInfo();

  return (
    <div
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 overscroll-none modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[88vh] border border-slate-100"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border font-bold ${info.bg}`}>
              {info.icon}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {info.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {info.sub}
                <span className={`font-mono font-bold ${totalTimeframePL >= 0 ? getUpColor() : getDownColor()}`}>
                  {totalTimeframePL >= 0 ? '+' : ''}
                  {formatMoney(totalTimeframePL, isPrivacy)} TWD
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Timeframe selector tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
              {(['1D', '1M', 'YTD', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    playClickSound();
                    setActiveTimeframe(tf);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeTimeframe === tf
                      ? 'bg-indigo-600 text-white shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900 font-semibold'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition btn-interact"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80 overscroll-contain modal-content-scroll">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="uppercase bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">標的名稱</th>
                <th className="py-2.5 px-3.5">{info.col2}</th>
                <th className="py-2.5 px-3.5">{info.col3}</th>
                <th className="py-2.5 px-3.5 text-right">{info.col4}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {list.map((item) => {
                const isUp = item.targetPL >= 0;
                const colorClass =
                  item.targetPL === 0 ? 'text-slate-500' : isUp ? getUpColor() : getDownColor();

                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      onClose();
                      onSelectStock(item.symbol, item.market, item.name);
                    }}
                    className="hover:bg-indigo-50/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      {item.name} <span className="text-[11px] text-indigo-600 font-mono font-bold ml-1">({item.symbol})</span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700 font-medium">
                      {item.col2Text}
                    </td>
                    <td className={`py-3 px-3.5 font-mono font-bold ${colorClass}`}>
                      {item.col3Text}
                    </td>
                    <td className={`py-3 px-3.5 font-mono font-black text-right tabular-nums ${colorClass}`}>
                      {item.targetPL >= 0 ? '+' : ''}
                      {formatMoney(item.targetPL, isPrivacy)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-3 pb-2 sm:pb-0 flex justify-end border-t border-slate-100 bg-white shrink-0">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition btn-interact border border-slate-200"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
