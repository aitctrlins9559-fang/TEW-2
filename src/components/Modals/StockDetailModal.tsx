import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
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
  Percent,
  Calculator,
  PieChart,
  Calendar,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StockPosition } from '../../types';
import { formatMoney } from '../../utils/format';
import { playClickSound, playSuccessSound } from '../../utils/audio';
import { getStockDividendInfo } from '../../utils/dividendHelper';
import { calculateTransactionCost, DISCOUNT_OPTIONS } from '../../utils/costHelper';
import { useScrollLock } from '../../utils/scrollLock';

interface StockDetailModalProps {
  isOpen: boolean;
  stock: StockPosition | null;
  portfolio?: StockPosition[];
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
  portfolio = [],
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
  useScrollLock(isOpen);

  // States for confirm dialogs (prevent accidental clicks on dividend/cost adjustments)
  const [confirmPendingShares, setConfirmPendingShares] = useState<boolean>(false);
  const [confirmDeductCost, setConfirmDeductCost] = useState<boolean>(false);
  const [isAdjustmentPanelOpen, setIsAdjustmentPanelOpen] = useState<boolean>(false);
  const [showToolHelp, setShowToolHelp] = useState<boolean>(false);

  // Interactive Target Price Simulation state
  const [simTargetMultiplier, setSimTargetMultiplier] = useState<number>(1.1); // +10% default
  const [customSimPrice, setCustomSimPrice] = useState<string>('');

  if (!isOpen || !stock) return null;

  const isUS = stock.market === 'us';
  const buyFx = isUS ? stock.buyRate || usdTwdRate : 1;
  const marketFx = isUS ? usdTwdRate : 1;
  const safePrice = typeof stock.price === 'number' && stock.price > 0 ? stock.price : null;

  const costTWD = stock.shares * stock.cost * buyFx;
  const marketValTWD = safePrice === null ? null : stock.shares * safePrice * marketFx;
  const profitTWD = marketValTWD === null ? null : marketValTWD - costTWD;
  const roi = costTWD > 0 && profitTWD !== null ? (profitTWD / costTWD) * 100 : null;

  // Calculate Transaction Cost breakdown using global brokerDiscount
  const costDetails = calculateTransactionCost(stock, usdTwdRate, brokerDiscount);

  // Calculate Total Portfolio Value to derive position weight %
  const totalPortfolioValTWD = useMemo(() => {
    if (!portfolio || portfolio.length === 0) return marketValTWD || costTWD || 1;
    return portfolio.reduce((acc, s) => {
      const p = typeof s.price === 'number' && s.price > 0 ? s.price : s.cost;
      const fx = s.market === 'us' ? usdTwdRate : 1;
      return acc + s.shares * p * fx;
    }, 0);
  }, [portfolio, usdTwdRate, marketValTWD, costTWD]);

  const weightPct = totalPortfolioValTWD > 0 && marketValTWD !== null
    ? Math.min(100, Math.max(0, (marketValTWD / totalPortfolioValTWD) * 100))
    : 0;

  // Calculate Break-Even Selling Price (損益兩平保本價)
  const breakEvenPrice = useMemo(() => {
    if (stock.shares <= 0) return stock.cost;
    if (isUS) return stock.cost; // US stocks typically free of commissions/taxes
    const taxRate = costDetails.isETF ? 0.001 : 0.003;
    const commRate = 0.001425 * brokerDiscount;
    const denom = stock.shares * (1 - commRate - taxRate);
    if (denom <= 0) return stock.cost;
    const be = (costDetails.buyValueTWD + costDetails.buyCommissionTWD + 20) / denom;
    return Math.max(0.01, Number(be.toFixed(2)));
  }, [stock, isUS, costDetails, brokerDiscount]);

  // Day Range calculation
  const dayRange = useMemo(() => {
    if (!stock.dayLow || !stock.dayHigh || !safePrice || stock.dayHigh <= stock.dayLow) {
      return null;
    }
    const pct = Math.max(0, Math.min(100, ((safePrice - stock.dayLow) / (stock.dayHigh - stock.dayLow)) * 100));
    return {
      low: stock.dayLow,
      high: stock.dayHigh,
      pct,
    };
  }, [stock.dayLow, stock.dayHigh, safePrice]);

  const getUpColor = () => (isRedUp ? 'text-rose-600' : 'text-emerald-600');
  const getDownColor = () => (isRedUp ? 'text-emerald-600' : 'text-rose-600');

  const isProfitPos = profitTWD !== null && profitTWD >= 0;
  const isNetProfitPos = costDetails.netProfitTWD >= 0;

  const profitColorClass = profitTWD === null ? 'text-slate-400' : isProfitPos ? getUpColor() : getDownColor();
  const netProfitColorClass = isNetProfitPos ? getUpColor() : getDownColor();

  const divInfo = getStockDividendInfo(stock, usdTwdRate, officialEvents?.[stock.symbol.toUpperCase()]);
  const txCount = Array.isArray(stock.transactions) && stock.transactions.length > 0
    ? stock.transactions.length
    : 1;

  const discountLabel =
    DISCOUNT_OPTIONS.find((o) => Math.abs(o.value - brokerDiscount) < 0.001)?.label.split(' ')[0] ||
    `${(brokerDiscount * 10).toFixed(1)}折`;

  // Yield on Cost (成本殖利率)
  const yieldOnCostPct = stock.cost > 0 && divInfo.annualDividendPerShare > 0
    ? (divInfo.annualDividendPerShare / stock.cost) * 100
    : 0;

  // Adjusted Cost per Share after received dividends
  const receivedDivs = stock.receivedDividends || 0;
  const effectiveCostPerShare = stock.shares > 0
    ? Math.max(0, (costTWD - receivedDivs) / (stock.shares * buyFx))
    : stock.cost;

  // Target Simulation calculations
  const baseSimPrice = safePrice || stock.cost;
  const targetSimPrice = customSimPrice && Number(customSimPrice) > 0
    ? Number(customSimPrice)
    : Number((baseSimPrice * simTargetMultiplier).toFixed(2));

  const targetSimValTWD = stock.shares * targetSimPrice * marketFx;
  const targetSimGrossProfitTWD = targetSimValTWD - costTWD;
  const targetSimSellTaxTWD = isUS ? 0 : Math.round(targetSimValTWD * (costDetails.isETF ? 0.001 : 0.003));
  const targetSimSellCommTWD = isUS ? 0 : Math.max(20, Math.round(targetSimValTWD * 0.001425 * brokerDiscount));
  const targetSimNetProfitTWD = targetSimGrossProfitTWD - (costDetails.buyCommissionTWD + targetSimSellCommTWD + targetSimSellTaxTWD);
  const targetSimRoiPct = costTWD > 0 ? (targetSimNetProfitTWD / costTWD) * 100 : 0;
  const diffFromCurrentValTWD = marketValTWD !== null ? targetSimValTWD - marketValTWD : 0;

  const hasExAdjustmentOptions =
    (divInfo.pendingStockShares > 0 && !!onApplyPendingStockShares) ||
    (divInfo.hasExDatePassed && divInfo.singleDividendPerShare > 0 && !!onDeductCashDividendCost) ||
    ((stock.dividendDeductions?.length || 0) > 0);

  return (
    <div className="fixed inset-0 z-[90] w-full h-[100dvh] bg-slate-100/95 flex flex-col text-slate-900 overflow-hidden overscroll-none animate-fadeIn select-none modal-backdrop">
      {/* Top Compact Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="flex items-center gap-1 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 text-xs font-bold transition btn-interact shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs">返回</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <h2 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
              {stock.name}
            </h2>
            <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
              {stock.symbol}
            </span>
            <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0 uppercase">
              {isUS ? '美股' : stock.market === 'otc' ? '上櫃' : '上市'}
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0 hidden xs:inline">
              權重 {weightPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Quick actions on header */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              onOpenChart(stock.symbol, isUS ? 'us' : 'tse', stock.name);
            }}
            className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-lg text-xs font-bold transition btn-interact"
            title="開啟即時分時 K 線圖"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>K線圖</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
            title="關閉"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content Body - Balanced Multi-Column Panoramic Space Utilization */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 max-w-6xl mx-auto w-full overscroll-contain modal-content-scroll">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-start">
          
          {/* ================= LEFT COLUMN: Core Pricing, HUD, Costs Breakdown (7/12 cols) ================= */}
          <div className="lg:col-span-7 space-y-2 sm:space-y-2.5">
            
            {/* Core HUD Card: Price, Profit & Value Dashboard */}
            <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-xl shadow-2xs text-slate-900 space-y-2">
              {/* Main Price & P&L Row */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">市場成交現價</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-3xl font-black font-mono text-slate-900 tabular-nums tracking-tight">
                      {safePrice === null ? '--' : isUS ? `$${safePrice} USD` : `$${safePrice}`}
                    </span>
                    {stock.prevClose && safePrice && (
                      <span className={`text-[10px] sm:text-xs font-mono font-bold ${safePrice >= stock.prevClose ? getUpColor() : getDownColor()}`}>
                        {safePrice >= stock.prevClose ? '▲' : '▼'}
                        {Math.abs(safePrice - stock.prevClose).toFixed(2)} (
                        {safePrice >= stock.prevClose ? '+' : ''}
                        {(((safePrice - stock.prevClose) / stock.prevClose) * 100).toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold block">未實現損益 (毛利 / 報酬)</span>
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className={`text-lg sm:text-2xl font-black font-mono tabular-nums ${profitColorClass}`}>
                      {profitTWD === null ? '--' : `${profitTWD >= 0 ? '+' : ''}${formatMoney(profitTWD, isPrivacy)}`}
                    </span>
                    <span className={`text-xs sm:text-sm font-black font-mono px-1 py-0.2 rounded border tabular-nums ${
                      isProfitPos
                        ? isRedUp ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : isRedUp ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                    }`}>
                      {roi === null ? '--' : `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Day High/Low Range Indicator */}
              {dayRange && (
                <div className="bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-200/60 text-[10px] font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-500 font-sans">
                    <span>當日低 ${dayRange.low}</span>
                    <span className="font-bold text-slate-700">當日震盪位階 {dayRange.pct.toFixed(0)}%</span>
                    <span>當日高 ${dayRange.high}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 relative overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${dayRange.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Metrics 4-Box Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
                {/* Box 1: Market Value */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-sans font-bold flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-indigo-600" /> 持有總市值
                  </span>
                  <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">
                    {marketValTWD === null ? '--' : formatMoney(marketValTWD, isPrivacy)}
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans mt-0.5 truncate">
                    成本: {formatMoney(costTWD, isPrivacy)}
                  </div>
                </div>

                {/* Box 2: Net Profit */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-sans font-bold flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-indigo-600" /> 預估精算淨利
                  </span>
                  <div className={`text-xs sm:text-sm font-black mt-0.5 truncate ${netProfitColorClass}`}>
                    {costDetails.netProfitTWD >= 0 ? '+' : ''}{formatMoney(costDetails.netProfitTWD, isPrivacy)}
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans mt-0.5 truncate">
                    淨報酬: {costDetails.netRoiPct >= 0 ? '+' : ''}{costDetails.netRoiPct.toFixed(2)}%
                  </div>
                </div>

                {/* Box 3: Shares & Avg Cost */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-sans font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-600" /> 持股與均價
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {stock.shares.toLocaleString()} 股
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans mt-0.5 truncate">
                    均價: ${stock.cost} {isUS && `(匯率${buyFx.toFixed(1)})`}
                  </div>
                </div>

                {/* Box 4: Dividends */}
                <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/80">
                  <span className="text-[10px] text-emerald-800 font-sans font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-600" /> 預估年股息</span>
                    <span className="text-[8px] px-1 rounded bg-emerald-100 text-emerald-800 font-mono">
                      {divInfo.isOfficial ? '官方' : '估算'}
                    </span>
                  </span>
                  <div className="text-xs sm:text-sm font-black text-emerald-900 mt-0.5 truncate">
                    {formatMoney(divInfo.annualIncomeTWD, isPrivacy)} <span className="text-[9px] font-normal text-emerald-700">/年</span>
                  </div>
                  <div className="text-[9px] text-emerald-700 font-sans mt-0.5 truncate">
                    單次: {formatMoney(divInfo.singlePayoutTWD, isPrivacy)}
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Cost Breakdown & Break-Even Calculation Strip */}
            <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-xl shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-xs font-bold flex items-center gap-1 text-slate-800">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  交易手續費、證交稅與保本價精算
                </span>
                {!isUS ? (
                  <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                    折讓: {discountLabel} · {costDetails.isETF ? 'ETF稅0.1%' : '股票稅0.3%'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">美股券商免買賣手續費與證交稅</span>
                )}
              </div>

              {isUS ? (
                <div className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>💡 美股海外券商普遍免手續費與證交稅（毛損益即等於實質淨損益）。</span>
                  <span className="font-bold font-mono text-slate-800">保本價: ${breakEvenPrice} USD</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px] font-mono">
                  <div className="bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                    <span className="text-[9px] text-slate-500 font-sans block">買入手續費</span>
                    <span className="text-slate-900 font-bold">${costDetails.buyCommissionTWD.toLocaleString()}</span>
                  </div>

                  <div className="bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                    <span className="text-[9px] text-slate-500 font-sans block">預估賣出手續費</span>
                    <span className="text-slate-900 font-bold">${costDetails.sellCommissionTWD.toLocaleString()}</span>
                  </div>

                  <div className="bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                    <span className="text-[9px] text-slate-500 font-sans block">證券交易稅</span>
                    <span className="text-slate-900 font-bold">${costDetails.sellTaxTWD.toLocaleString()}</span>
                  </div>

                  <div className="bg-amber-50/80 px-2 py-1 rounded-md border border-amber-200/80">
                    <span className="text-[9px] text-amber-800 font-sans font-bold block flex items-center justify-between">
                      <span>損益兩平保本價</span>
                      <span className="text-[8px] text-amber-700">含稅費</span>
                    </span>
                    <span className="text-amber-900 font-black text-xs sm:text-sm">${breakEvenPrice} 元</span>
                  </div>
                </div>
              )}
            </div>

            {/* Guarded & Collapsible Ex-Rights & Dividend Cost Adjustment Tool (進階除權息與成本調節) */}
            {hasExAdjustmentOptions && (
              <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
                <div
                  onClick={() => {
                    playClickSound();
                    setIsAdjustmentPanelOpen(!isAdjustmentPanelOpen);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      playClickSound();
                      setIsAdjustmentPanelOpen(!isAdjustmentPanelOpen);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between transition cursor-pointer text-left select-none"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">除權息平準與成本調節工具</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setShowToolHelp(!showToolHelp);
                        if (!isAdjustmentPanelOpen) setIsAdjustmentPanelOpen(true);
                      }}
                      className={`p-0.5 rounded-md transition flex items-center justify-center shrink-0 ${
                        showToolHelp ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60'
                      }`}
                      title={showToolHelp ? "收起功能說明" : "點擊查看調節工具說明"}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-mono text-slate-500 px-1 py-0.2 rounded bg-slate-200/60 hidden sm:inline-block">
                      進階功能
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-[10px] font-sans hidden sm:inline">
                      {isAdjustmentPanelOpen ? '收起管理選項' : '點擊展開管理'}
                    </span>
                    {isAdjustmentPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isAdjustmentPanelOpen && (
                  <div className="p-2.5 sm:p-3 space-y-2 border-t border-slate-100 text-xs bg-slate-50/30">
                    {/* Educational Note explaining the tools (Collapsed by default, toggled via ? icon) */}
                    {showToolHelp && (
                      <div className="bg-indigo-50/85 p-2.5 rounded-lg border border-indigo-100 text-[11px] text-indigo-900 flex items-start justify-between gap-2 animate-fadeIn">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 leading-relaxed">
                            <strong className="font-bold block text-indigo-950">💡 功能用途與防誤觸機制：</strong>
                            <p className="text-slate-600 text-[10px]">
                              <strong>1. 待撥股票股利撥入：</strong>除權後過渡期系統會自動平準市值；待券商帳戶實際撥券入帳後，點擊合併股數。
                            </p>
                            <p className="text-slate-600 text-[10px]">
                              <strong>2. 現金股利扣抵成本：</strong>除息日後，可將領取的現金股息從原始均價中扣除，用以追蹤零成本存股進度。
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowToolHelp(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition shrink-0"
                          title="關閉說明"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Stock Dividend Shares Apply Option with Two-Step Confirmation */}
                    {divInfo.pendingStockShares > 0 && onApplyPendingStockShares && (
                      <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                              <span>待撥股票股利：</span>
                              <strong className="text-emerald-700 font-mono font-black">+{divInfo.pendingStockShares} 股</strong>
                              <span className="text-[10px] text-slate-400 font-mono">(市值約 {formatMoney(divInfo.pendingStockValueTWD, isPrivacy)})</span>
                            </div>
                            <p className="text-[10px] text-slate-500">券商已正式撥券入帳時才需點擊合併。</p>
                          </div>

                          {!confirmPendingShares ? (
                            <button
                              onClick={() => {
                                playClickSound();
                                setConfirmPendingShares(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1 shadow-2xs btn-interact shrink-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> 撥入持股總數
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-200 shrink-0">
                              <span className="text-[10px] font-bold text-amber-900 px-1">確定要併入 +{divInfo.pendingStockShares} 股？</span>
                              <button
                                onClick={() => {
                                  playSuccessSound();
                                  setConfirmPendingShares(false);
                                  onApplyPendingStockShares(stock.id);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] font-bold"
                              >
                                確認
                              </button>
                              <button
                                onClick={() => setConfirmPendingShares(false)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-bold"
                              >
                                取消
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cash Dividend Cost Deduction Option - Only available when ex-date has passed */}
                    {divInfo.hasExDatePassed && divInfo.singleDividendPerShare > 0 && onDeductCashDividendCost && (
                      <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-indigo-200 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <span>現金股利扣抵持股成本</span>
                              <span className="text-[9px] font-mono px-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {divInfo.passedExDateStr ? `已於 ${divInfo.passedExDateStr} 除息` : '今年度已除息'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                (每股 ${divInfo.singleDividendPerShare.toFixed(2)} 元)
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              將買入均價由 ${stock.cost} 調降為 ${(Math.max(0, stock.cost - divInfo.singleDividendPerShare)).toFixed(2)} 元（扣抵後將同步記錄於歷程明細）
                            </p>
                          </div>

                          {!confirmDeductCost ? (
                            <button
                              onClick={() => {
                                playClickSound();
                                setConfirmDeductCost(true);
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-1 px-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1 btn-interact shrink-0"
                            >
                              <Coins className="w-3.5 h-3.5 text-indigo-600" /> 扣抵成本
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-200 shrink-0">
                              <span className="text-[10px] font-bold text-amber-900 px-1">確定要調降均價並寫入紀錄？</span>
                              <button
                                onClick={() => {
                                  playSuccessSound();
                                  setConfirmDeductCost(false);
                                  onDeductCashDividendCost(stock.id, divInfo.singleDividendPerShare);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded text-[11px] font-bold"
                              >
                                確認調降
                              </button>
                              <button
                                onClick={() => setConfirmDeductCost(false)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-bold"
                              >
                                取消
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Historical Deduction Records Preview if present - Capped height with scroll to prevent long pages */}
                    {Array.isArray(stock.dividendDeductions) && stock.dividendDeductions.length > 0 && (
                      <div className="bg-emerald-50/50 p-2 sm:p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            已執行股利折抵紀錄 ({stock.dividendDeductions.length} 筆)
                          </span>
                          <span className="font-mono text-emerald-700">
                            累計扣抵: ${stock.receivedDividends?.toLocaleString() || 0} 元
                          </span>
                        </div>
                        <div className="max-h-24 sm:max-h-28 overflow-y-auto space-y-1 pr-0.5 overscroll-contain modal-content-scroll">
                          {stock.dividendDeductions.map((d, idx) => (
                            <div key={d.id || idx} className="flex justify-between items-center bg-white/80 px-2 py-0.5 rounded border border-emerald-100 text-[10px] text-slate-700 font-mono">
                              <span className="truncate font-sans mr-2">{d.date} · 每股扣抵 ${d.dps} 元</span>
                              <span className="font-bold text-emerald-700 shrink-0">-${d.totalAmount.toLocaleString()} 元</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: Asset Weight, Yields, Target Simulator (5/12 cols) ================= */}
          <div className="lg:col-span-5 space-y-2 sm:space-y-2.5">
            
            {/* Asset Weight & Yield Deep Dive Card */}
            <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                  投資組合佔比與殖利率分析
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                  權重 {weightPct.toFixed(1)}%
                </span>
              </div>

              {/* Weight Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>持股市值佔比</span>
                  <span className="font-bold text-slate-700">{weightPct.toFixed(1)}% of 總資產</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(3, weightPct)}%` }}
                  />
                </div>
              </div>

              {/* Yield metrics 2x2 grid */}
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-500 font-sans block">現價殖利率</span>
                  <span className="text-emerald-700 font-black text-xs sm:text-sm">
                    {divInfo.dividendYieldPct > 0 ? `${divInfo.dividendYieldPct.toFixed(2)}%` : '--'}
                  </span>
                  <span className="text-[8px] text-slate-400 font-sans block">以現價換算</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-500 font-sans block">成本殖利率 (YoC)</span>
                  <span className="text-indigo-700 font-black text-xs sm:text-sm">
                    {yieldOnCostPct > 0 ? `${yieldOnCostPct.toFixed(2)}%` : '--'}
                  </span>
                  <span className="text-[8px] text-slate-400 font-sans block">以買入成本換算</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-500 font-sans block">累計已領股利</span>
                  <span className="text-slate-800 font-bold text-xs">
                    {receivedDivs > 0 ? formatMoney(receivedDivs, isPrivacy) : '$0'}
                  </span>
                  <span className="text-[8px] text-slate-400 font-sans block">歷史配息累積</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  <span className="text-[9px] text-slate-500 font-sans block">扣除股利實質成本</span>
                  <span className="text-slate-800 font-bold text-xs">
                    ${effectiveCostPerShare.toFixed(2)}
                  </span>
                  <span className="text-[8px] text-slate-400 font-sans block">每股零成本門檻</span>
                </div>
              </div>
            </div>

            {/* Target Price & Profit Simulator Card */}
            <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                  目標價獲利試算器
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  現價 ${safePrice || stock.cost}
                </span>
              </div>

              {/* Preset Multiplier Buttons */}
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: '+5%', mult: 1.05 },
                  { label: '+10%', mult: 1.10 },
                  { label: '+15%', mult: 1.15 },
                  { label: '+20%', mult: 1.20 },
                  { label: '+30%', mult: 1.30 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      playClickSound();
                      setSimTargetMultiplier(item.mult);
                      setCustomSimPrice('');
                    }}
                    className={`py-1 rounded text-[10px] font-mono font-bold transition ${
                      !customSimPrice && Math.abs(simTargetMultiplier - item.mult) < 0.001
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Target Price Input & Simulation Result */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-sans">目標出場價：</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-sans text-xs">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      placeholder={targetSimPrice.toString()}
                      value={customSimPrice}
                      onChange={(e) => setCustomSimPrice(e.target.value)}
                      className="w-20 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right font-black text-slate-900 focus:outline-hidden focus:border-indigo-500 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-sans">{isUS ? 'USD' : '元'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-sans">預估實質淨利：</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-black ${targetSimNetProfitTWD >= 0 ? getUpColor() : getDownColor()}`}>
                      {targetSimNetProfitTWD >= 0 ? '+' : ''}{formatMoney(targetSimNetProfitTWD, isPrivacy)}
                    </span>
                    <span className={`text-[10px] font-bold ${targetSimNetProfitTWD >= 0 ? getUpColor() : getDownColor()}`}>
                      ({targetSimRoiPct >= 0 ? '+' : ''}{targetSimRoiPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans">
                  <span>較當前市值增額：</span>
                  <span className="font-mono font-bold text-slate-700">
                    {diffFromCurrentValTWD >= 0 ? '+' : ''}{formatMoney(diffFromCurrentValTWD, isPrivacy)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Ultra Compact Sticky Bottom Action Toolbar */}
      <div className="p-2 sm:p-2.5 bg-white border-t border-slate-200 shrink-0 max-w-6xl mx-auto w-full shadow-2xs">
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => {
              playClickSound();
              onOpenChart(stock.symbol, isUS ? 'us' : 'tse', stock.name);
            }}
            className="col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-1 rounded-lg text-xs transition flex items-center justify-center gap-1 btn-interact shadow-2xs"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>K 線圖</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onOpenTxHistory(stock.id);
            }}
            className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 py-2 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 btn-interact"
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>買賣歷程({txCount})</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              onOpenEditModal(stock.id);
            }}
            className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 py-2 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 btn-interact"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>編輯資料</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onDeleteStock(stock.id);
            }}
            className="col-span-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 btn-interact"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>刪除部位</span>
          </button>
        </div>
      </div>
    </div>
  );
};
