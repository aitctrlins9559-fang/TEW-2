import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  BarChart2,
  History,
  Edit3,
  Trash2,
  DollarSign,
  Sparkles,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Receipt,
  Calculator,
  Percent,
} from 'lucide-react';
import { StockPosition } from '../../types';
import { formatMoney } from '../../utils/format';
import { playClickSound } from '../../utils/audio';
import { getStockDividendInfo } from '../../utils/dividendHelper';
import { calculateTransactionCost, DISCOUNT_OPTIONS } from '../../utils/costHelper';

interface StockDetailModalProps {
  isOpen: boolean;
  stock: StockPosition | null;
  usdTwdRate: number;
  isPrivacy: boolean;
  isRedUp: boolean;
  officialEvents?: Record<string, { exDate: string; amount: number; stockDps?: number }>;
  brokerDiscount?: number;
  onClose: () => void;
  onOpenChart: (symbol: string, market: 'tse' | 'otc' | 'us', name: string) => void;
  onOpenTxHistory: (stockId: string) => void;
  onOpenEditModal: (stockId: string) => void;
  onDeleteStock: (stockId: string) => void;
  onApplyPendingStockShares?: (stockId: string) => void;
  onDeductCashDividendCost?: (stockId: string, dps?: number) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  isOpen,
  stock,
  usdTwdRate,
  isPrivacy,
  isRedUp,
  officialEvents,
  brokerDiscount = 0.28,
  onClose,
  onOpenChart,
  onOpenTxHistory,
  onOpenEditModal,
  onDeleteStock,
  onApplyPendingStockShares,
  onDeductCashDividendCost,
}) => {
  const [currentDiscount, setCurrentDiscount] = useState<number>(brokerDiscount);

  if (!isOpen || !stock) return null;

  const isUS = stock.market === 'us';
  const buyFx = isUS ? stock.buyRate || usdTwdRate : 1;
  const marketFx = isUS ? usdTwdRate : 1;
  const safePrice = typeof stock.price === 'number' && stock.price > 0 ? stock.price : null;

  const costTWD = stock.shares * stock.cost * buyFx;
  const marketValTWD = safePrice === null ? null : stock.shares * safePrice * marketFx;
  const profitTWD = marketValTWD === null ? null : marketValTWD - costTWD;
  const roi = costTWD > 0 && profitTWD !== null ? (profitTWD / costTWD) * 100 : null;

  // Calculate Transaction Cost breakdown
  const costDetails = calculateTransactionCost(stock, usdTwdRate, currentDiscount);

  const getUpColor = () => (isRedUp ? 'text-rose-600' : 'text-emerald-600');
  const getDownColor = () => (isRedUp ? 'text-emerald-600' : 'text-rose-600');

  const profitColorClass =
    profitTWD === null ? 'text-slate-400' : profitTWD >= 0 ? getUpColor() : getDownColor();

  const netProfitColorClass =
    costDetails.netProfitTWD >= 0 ? getUpColor() : getDownColor();

  const divInfo = getStockDividendInfo(stock, usdTwdRate, officialEvents?.[stock.symbol.toUpperCase()]);
  const txCount = Array.isArray(stock.transactions) ? stock.transactions.length : 1;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn h-[100dvh]">
      <div className="w-full max-w-xl bg-white border-0 sm:border sm:border-slate-100 rounded-none sm:rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.15)] overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[88vh]">
        {/* Top Sticky Navigation Bar */}
        <div className="bg-white border-b border-slate-100 px-3.5 py-2.5 sm:px-4 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="flex items-center gap-1 sm:gap-1.5 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg sm:rounded-xl border border-slate-100 text-xs font-bold transition btn-interact shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            <span>返回清單</span>
          </button>

          <div className="flex flex-col items-center min-w-0">
            <div className="flex items-center gap-1.5 max-w-full">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 truncate">{stock.name}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                {stock.market.toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">{stock.symbol}</span>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-1.5 rounded-lg sm:rounded-xl border border-slate-200 transition btn-interact shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
          {/* Price & Real-time Hero Banner */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs text-slate-900">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-[11px] text-slate-500 block font-sans font-bold">最新市場成交價</span>
                <div className="text-3xl font-black font-mono text-slate-900 tabular-nums tracking-tight">
                  {safePrice === null ? '--' : isUS ? `$${safePrice} USD` : `$${safePrice}`}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block font-sans font-bold">持股總報酬率</span>
                <div className={`text-2xl font-black font-mono tabular-nums ${profitColorClass}`}>
                  {roi === null ? '--' : `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`}
                </div>
              </div>
            </div>

            {(stock.dayHigh || stock.dayLow) && (
              <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-mono text-slate-600">
                <span>今日最低: ${stock.dayLow || '--'}</span>
                <span>今日最高: ${stock.dayHigh || '--'}</span>
              </div>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Market Value */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-sans block flex items-center gap-1.5 font-bold">
                <DollarSign className="w-4 h-4 text-indigo-600" /> 持有總市值 (NT$)
              </span>
              <div className="text-lg font-bold font-mono text-slate-900">
                {marketValTWD === null ? '--' : formatMoney(marketValTWD, isPrivacy)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono border-t border-slate-200 pt-1 mt-1">
                買入總成本: <span className="text-slate-800 font-bold">${formatMoney(costTWD, isPrivacy)}</span>
              </div>
            </div>

            {/* Profit & Loss */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-sans block flex items-center gap-1.5 font-bold">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> 未實現損益 (NT$)
              </span>
              <div className={`text-lg font-bold font-mono ${profitColorClass}`}>
                {profitTWD === null
                  ? '--'
                  : `${profitTWD >= 0 ? '+' : ''}${formatMoney(profitTWD, isPrivacy)}`}
              </div>
            </div>

            {/* Shares & Cost */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-sans block flex items-center gap-1.5 font-bold">
                <Layers className="w-4 h-4 text-indigo-600" /> 持有股數與均價
              </span>
              <div className="text-slate-900 font-mono font-bold text-sm">
                {stock.shares.toLocaleString()} 股 (${stock.cost})
              </div>
              {isUS && (
                <div className="text-[10px] text-slate-500 font-mono">
                  買入匯率: {buyFx.toFixed(2)}
                </div>
              )}
            </div>

            {/* Dividends */}
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-emerald-900 font-sans flex items-center gap-1 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> 預估除權息
                </span>
                {divInfo.isOfficial ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    官方公告
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    前次估算
                  </span>
                )}
              </div>
              <div className="text-emerald-900 font-mono font-bold text-sm">
                現金股息: ${formatMoney(divInfo.annualIncomeTWD, isPrivacy)} /年
              </div>
              <div className="text-[11px] text-emerald-800 font-mono font-bold">
                單次預估: ${formatMoney(divInfo.singlePayoutTWD, isPrivacy)} NT$
              </div>
              {divInfo.stockDps > 0 && (
                <div className="text-[11px] text-purple-900 font-mono font-bold pt-1 border-t border-emerald-200/60 flex items-center justify-between">
                  <span>股票股利: {divInfo.stockDps} 元/股</span>
                  <span className="text-purple-800">+{divInfo.pendingStockShares} 股待撥</span>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Cost Breakdown Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-slate-50 to-slate-50 p-4 sm:p-5 rounded-2xl space-y-3 shadow-2xs border border-indigo-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black flex items-center gap-2 text-indigo-900">
                <Receipt className="w-4 h-4 text-indigo-600" />
                預估交易成本與淨損益精算
              </span>
              {!isUS && (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] font-mono font-bold shadow-2xs">
                  <span className="text-slate-500 font-sans">券商折扣:</span>
                  <select
                    value={currentDiscount}
                    onChange={(e) => {
                      playClickSound();
                      setCurrentDiscount(parseFloat(e.target.value));
                    }}
                    className="bg-transparent text-indigo-700 font-bold outline-none cursor-pointer rounded px-1 py-0.5 text-xs font-mono"
                  >
                    {DISCOUNT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isUS ? (
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                💡 美股海外券商普遍免收買賣手續費與證券交易稅（淨損益等於毛損益）。
              </div>
            ) : (
              <div className="space-y-3">
                {/* 4 Cost items grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-sans block font-bold">買入手續費</span>
                    <span className="text-slate-900 font-bold">${costDetails.buyCommissionTWD.toLocaleString()} NT$</span>
                    <span className="text-[9px] text-slate-400 block font-sans">底價20元 / 0.1425%</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-sans block font-bold">賣出手續費 (預估)</span>
                    <span className="text-slate-900 font-bold">${costDetails.sellCommissionTWD.toLocaleString()} NT$</span>
                    <span className="text-[9px] text-slate-400 block font-sans">現價估算</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-sans block font-bold">證券交易稅</span>
                    <span className="text-slate-900 font-bold">${costDetails.sellTaxTWD.toLocaleString()} NT$</span>
                    <span className="text-[9px] text-emerald-600 block font-sans font-bold">
                      {costDetails.isETF ? 'ETF 稅率 0.1%' : '股票 稅率 0.3%'}
                    </span>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <span className="text-[10px] text-amber-800 font-sans block font-bold">交易成本總計</span>
                    <span className="text-amber-900 font-bold text-sm">${costDetails.totalCostTWD.toLocaleString()} NT$</span>
                    <span className="text-[9px] text-amber-700/80 block font-sans">手續費+證交稅</span>
                  </div>
                </div>

                {/* Net P&L comparison bar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">帳面毛損益 (未扣成本)</span>
                    <span className="font-mono font-bold text-slate-800">
                      {profitTWD === null ? '--' : `${profitTWD >= 0 ? '+' : ''}${formatMoney(profitTWD, isPrivacy)}`}
                      {roi !== null && <span className="text-[11px] text-slate-500 ml-1">({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)</span>}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-indigo-700 block font-bold">扣除成本後淨損益 (淨利)</span>
                    <span className={`font-mono font-black text-sm ${netProfitColorClass}`}>
                      {costDetails.netProfitTWD >= 0 ? '+' : ''}${formatMoney(costDetails.netProfitTWD, isPrivacy)}
                      <span className="text-[11px] ml-1">({costDetails.netRoiPct >= 0 ? '+' : ''}${costDetails.netRoiPct.toFixed(2)}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ex-Rights / Ex-Dividend Special Management Section */}
          {(divInfo.pendingStockShares > 0 || divInfo.annualDividendPerShare > 0) && (
            <div className="bg-gradient-to-br from-emerald-50/80 to-indigo-50/80 border border-emerald-200/80 p-4 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  除權息平準與配股入帳管理
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  除權息防護中
                </span>
              </div>

              {divInfo.pendingStockShares > 0 && (
                <div className="space-y-2 bg-white/80 p-3 rounded-xl border border-emerald-100">
                  <div className="text-xs text-slate-700 flex justify-between items-center font-bold">
                    <span>待撥股票股利: <strong className="text-emerald-700">+{divInfo.pendingStockShares} 股</strong></span>
                    <span className="font-mono text-emerald-800 text-[11px]">市值約 ${formatMoney(divInfo.pendingStockValueTWD, isPrivacy)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    除權日股價因配股下降時，系統已自動將待撥股數納入資產淨值算表，避免產生假損益跌幅。若您的券商已撥入股票，請點擊下方直接入帳。
                  </p>
                  {onApplyPendingStockShares && (
                    <button
                      onClick={() => {
                        playClickSound();
                        onClose();
                        onApplyPendingStockShares(stock.id);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs btn-interact"
                    >
                      <CheckCircle2 className="w-4 h-4" /> 一鍵將 +{divInfo.pendingStockShares} 股配股撥入持股總數
                    </button>
                  )}
                </div>
              )}

              {divInfo.singleDividendPerShare > 0 && onDeductCashDividendCost && (
                <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-700">
                    <div className="font-bold">現金股利扣抵持股成本</div>
                    <div className="text-[10px] text-slate-500">每股配息 ${divInfo.singleDividendPerShare.toFixed(2)} 元 (每張可領 ${(divInfo.singleDividendPerShare * 1000).toFixed(0)})</div>
                  </div>
                  <button
                    onClick={() => {
                      playClickSound();
                      onClose();
                      onDeductCashDividendCost(stock.id, divInfo.singleDividendPerShare);
                    }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-1.5 px-3 rounded-xl text-xs transition flex items-center gap-1 btn-interact shrink-0"
                  >
                    <Coins className="w-3.5 h-3.5 text-indigo-600" /> 扣抵成本
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-3.5 pb-6 sm:pb-3 space-y-2 border-t border-slate-100 bg-white shrink-0">
          <button
            onClick={() => {
              playClickSound();
              onClose();
              onOpenChart(stock.symbol, stock.market === 'us' ? 'us' : 'tse', stock.name);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 btn-interact shadow-sm"
          >
            <BarChart2 className="w-4 h-4" /> 檢視即時分時 K 線圖
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                playClickSound();
                onClose();
                onOpenTxHistory(stock.id);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 btn-interact"
            >
              <History className="w-3.5 h-3.5 text-slate-500" /> 歷程({txCount})
            </button>

            <button
              onClick={() => {
                playClickSound();
                onClose();
                onOpenEditModal(stock.id);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 btn-interact"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> 編輯
            </button>

            <button
              onClick={() => {
                onClose();
                onDeleteStock(stock.id);
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 btn-interact"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> 刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
