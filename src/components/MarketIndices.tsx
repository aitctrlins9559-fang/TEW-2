import React from 'react';
import { MarketIndex } from '../types';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface MarketIndicesProps {
  indices: MarketIndex[];
  isRedUp: boolean;
  onSelectIndex?: (symbol: string, marketType: 'tw' | 'us', name: string) => void;
}

export const MarketIndices: React.FC<MarketIndicesProps> = ({
  indices,
  isRedUp,
  onSelectIndex,
}) => {
  const getIndex = (symbol: string) => indices.find((i) => i.symbol === symbol);

  const twii = getIndex('^TWII');
  const dji = getIndex('^DJI');
  const gspc = getIndex('^GSPC');
  const ixic = getIndex('^IXIC');

  const getUpClass = () => (isRedUp ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200');
  const getDownClass = () => (isRedUp ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200');

  const renderCard = (
    indexItem: MarketIndex | undefined,
    fallbackSymbol: string,
    name: string,
    marketType: 'tw' | 'us'
  ) => {
    const symbol = indexItem?.symbol || fallbackSymbol;
    const price = indexItem?.price;
    const change = indexItem?.change;
    const changePercent = indexItem?.changePct;

    const isUp = change !== null && change !== undefined && change >= 0;
    const colorClass =
      change === null || change === undefined
        ? 'text-slate-500 bg-slate-100 border-slate-200'
        : isUp
        ? getUpClass()
        : getDownClass();

    return (
      <div
        onClick={() => {
          playClickSound();
          onSelectIndex?.(symbol, marketType, name);
        }}
        className="glass-card hover-card p-2 sm:p-4 rounded-lg sm:rounded-2xl cursor-pointer flex flex-col justify-between border border-slate-200/90 shadow-2xs active:scale-[0.98] transition bg-white w-full"
        title="點擊切換查看該指數即時走勢圖 📈"
      >
        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
          <span className="flex items-center gap-1 sm:gap-1.5 text-slate-800 font-bold text-[10px] sm:text-xs truncate">
            <Activity className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{name.replace('指數', '')}</span>
          </span>
          <span className="font-mono text-[8px] sm:text-[10px] text-slate-400 shrink-0">{symbol}</span>
        </div>

        <div className="flex flex-col xs:flex-row xs:items-baseline justify-between mt-1 sm:mt-2 flex-wrap gap-0.5 sm:gap-1">
          <div className="text-xs sm:text-lg font-black text-slate-900 font-mono tracking-tight tabular-nums truncate">
            {price
              ? price.toLocaleString('zh-TW', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })
              : '--'}
          </div>

          <div
            className={`flex items-center gap-0.5 px-1 sm:px-2 py-0.2 sm:py-0.5 rounded sm:rounded-lg border font-mono font-bold text-[9px] sm:text-xs shrink-0 self-start xs:self-auto ${colorClass}`}
          >
            {change === null || change === undefined ? (
              <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ) : isUp ? (
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
            )}
            <span>
              {changePercent !== null && changePercent !== undefined
                ? `${isUp ? '+' : ''}${changePercent.toFixed(2)}%`
                : '--'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-3.5 w-full">
      {renderCard(twii, '^TWII', '加權指數', 'tw')}
      {renderCard(gspc, '^GSPC', '標普 500', 'us')}
      {renderCard(ixic, '^IXIC', '那斯達克', 'us')}
      {renderCard(dji, '^DJI', '道瓊工業', 'us')}
    </div>
  );
};
