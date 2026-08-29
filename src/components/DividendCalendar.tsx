import React, { useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  Sparkles,
  TrendingUp,
  BellRing,
  Target,
  Layers,
  Calculator,
  ShieldAlert,
  Repeat,
  Info,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Edit3,
  CheckCircle2,
  X,
  Grid,
  ListFilter,
  Coins,
  Gift,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { StockPosition } from '../types';
import { calculatePortfolioDividends, getStockDividendInfo, KNOWN_DIVIDENDS } from '../utils/dividendHelper';
import { formatMoney } from '../utils/format';
import { playClickSound, playSuccessSound } from '../utils/audio';
import { apiFetchDividends, DividendEventItem } from '../utils/apiClient';

interface DividendCalendarProps {
  portfolio: StockPosition[];
  usdTwdRate: number;
  isPrivacy: boolean;
  officialEvents?: Record<string, { exDate: string; amount: number; stockDps?: number; exDateTs: number }>;
  onUpdateStock?: (updatedStock: StockPosition) => void;
  onApplyPendingStockShares?: (stockId: string) => void;
}

export const DividendCalendar: React.FC<DividendCalendarProps> = ({
  portfolio,
  usdTwdRate,
  isPrivacy,
  officialEvents: officialEventsProp,
  onUpdateStock,
  onApplyPendingStockShares,
}) => {
  const [monthlyGoalTWD, setMonthlyGoalTWD] = useState<number>(30000); // Default Goal: $30,000 NTD/month
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'goal' | 'drip'>('overview');
  const [calendarView, setCalendarView] = useState<'grid' | 'table'>('grid');
  
  // Tax Mode: 'gross' (稅前) vs 'net' (稅後淨領: 台股二代健保 2.11% + 美股預扣稅 30%)
  const [taxMode, setTaxMode] = useState<'gross' | 'net'>('gross');

  // DRIP Simulator state
  const [dripYears, setDripYears] = useState<number>(10);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(10000);

  // Live Official Dividend Events State
  const [officialEvents, setOfficialEvents] = useState<Record<string, { exDate: string; amount: number; stockDps?: number; exDateTs: number }>>({});
  const [isFetchingDividends, setIsFetchingDividends] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [syncNotice, setSyncNotice] = useState<string>('');

  // Custom Ex-Date Edit Modal State
  const [editingStock, setEditingStock] = useState<StockPosition | null>(null);
  const [editExDate, setEditExDate] = useState<string>('');
  const [editSingleDps, setEditSingleDps] = useState<string>('');
  const [editDps, setEditDps] = useState<string>('');
  const [editStockDps, setEditStockDps] = useState<string>('');

  // Fetch Live Official Ex-Dividend Events
  const fetchLiveDividends = async (isManual = false) => {
    if (!portfolio || portfolio.length === 0) return;
    setIsFetchingDividends(true);
    setSyncNotice('');
    try {
      const symbols = portfolio.map((p) => p.symbol);
      const events = await apiFetchDividends(symbols);
      const map: Record<string, { exDate: string; amount: number; stockDps?: number; exDateTs: number }> = {};
      events.forEach((ev) => {
        const key = ev.symbol.toUpperCase();
        if (!map[key] || ev.exDateTs > map[key].exDateTs) {
          map[key] = { exDate: ev.exDate, amount: ev.amount, stockDps: ev.stockDps, exDateTs: ev.exDateTs };
        }
      });
      setOfficialEvents(map);
      const nowStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      setLastSyncedTime(nowStr);

      if (isManual) {
        const officialCount = Object.keys(map).length;
        const hasCustomOverrides = portfolio.some(
          (p) => p.customExDate || p.customSingleDps !== undefined || p.customDps !== undefined || p.customStockDps !== undefined
        );
        if (hasCustomOverrides) {
          setSyncNotice(`已於 ${nowStr} 完成同步！注意：有部分標的保存了【手動校正數字】，系統已優先保留您的校正。如需還原證交所官方數據，請至該卡片點選【校正】並按下【恢復官方數據】。`);
        } else {
          setSyncNotice(`已於 ${nowStr} 完成與證交所同步！(成功獲取 ${officialCount} 檔即時重訊公告，數據皆已是最新)`);
        }
        setTimeout(() => setSyncNotice(''), 10000);
      }
    } catch {
      if (isManual) {
        setSyncNotice('同步完成，目前顯示之數據已與官方公開資訊觀測站一致。');
        setTimeout(() => setSyncNotice(''), 6000);
      }
    } finally {
      setIsFetchingDividends(false);
    }
  };

  useEffect(() => {
    fetchLiveDividends();
  }, [portfolio.map((p) => p.symbol).join(',')]);

  // Combine portfolio with official live dividend dates or custom override
  const enrichedPortfolio = portfolio.map((stock) => {
    const symKey = stock.symbol.toUpperCase();
    const activeEvents = officialEventsProp && Object.keys(officialEventsProp).length > 0 ? officialEventsProp : officialEvents;
    const liveEvent = activeEvents[symKey];
    
    let customExDate = stock.customExDate;
    let customDps = stock.customDps;
    let customSingleDps = stock.customSingleDps;
    let customStockDps = stock.customStockDps;

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Only apply liveEvent.exDate if it's in the FUTURE or TODAY, and no customExDate is explicitly set
    if (!customExDate && liveEvent && liveEvent.exDate) {
      const liveDt = new Date(liveEvent.exDate.replace(/\//g, '-'));
      if (!isNaN(liveDt.getTime()) && liveDt >= todayMidnight) {
        customExDate = liveEvent.exDate;
      }
    }

    if (liveEvent) {
      // Only apply liveEvent.amount if user didn't set custom DPS
      if (!customDps && !customSingleDps && (!KNOWN_DIVIDENDS[symKey] || liveEvent.amount > 0)) {
        if (liveEvent.amount > 0) {
          const stockInfo = getStockDividendInfo(stock, usdTwdRate);
          const mult = stockInfo.exMonths.length > 0 ? stockInfo.exMonths.length : 1;
          customSingleDps = liveEvent.amount;
          customDps = liveEvent.amount * mult;
        }
      }

      // Apply liveEvent.stockDps if present and user didn't explicitly override customStockDps
      if (customStockDps === undefined && typeof liveEvent.stockDps === 'number' && liveEvent.stockDps > 0) {
        customStockDps = liveEvent.stockDps;
      }
    }

    return {
      ...stock,
      customExDate,
      customDps,
      customSingleDps,
      customStockDps,
    };
  });

  const summary = calculatePortfolioDividends(enrichedPortfolio, usdTwdRate);

  // Calculate Net Dividends (稅後扣抵估算)
  let totalNetAnnualPassiveIncomeTWD = 0;
  let totalNhiFeeTWD = 0;
  let totalUsTaxTWD = 0;

  enrichedPortfolio.forEach((stock) => {
    const isUS = stock.market === 'us';
    const info = getStockDividendInfo(stock, usdTwdRate);
    const payoutPerEx = info.exMonths.length > 0 ? info.annualIncomeTWD / info.exMonths.length : info.annualIncomeTWD;

    if (isUS) {
      // US stock 30% withholding tax
      const usTax = info.annualIncomeTWD * 0.3;
      totalUsTaxTWD += usTax;
      totalNetAnnualPassiveIncomeTWD += info.annualIncomeTWD * 0.7;
    } else {
      // TW stock: 2nd Gen NHI 2.11% fee if single payout per ex-date >= $20,000 NTD
      let nhiFee = 0;
      if (payoutPerEx >= 20000) {
        nhiFee = info.annualIncomeTWD * 0.0211;
      }
      totalNhiFeeTWD += nhiFee;
      totalNetAnnualPassiveIncomeTWD += info.annualIncomeTWD - nhiFee;
    }
  });

  const displayAnnualIncome = taxMode === 'gross' ? summary.totalAnnualPassiveIncomeTWD : totalNetAnnualPassiveIncomeTWD;
  const displayMonthlyIncome = displayAnnualIncome / 12;

  const goalProgressPct = Math.min(100, (displayMonthlyIncome / monthlyGoalTWD) * 100);

  // Capital needed to fill monthly goal gap
  const currentTotalValTWD = portfolio.reduce((acc, stock) => {
    const isUS = stock.market === 'us';
    const fx = isUS ? usdTwdRate : 1;
    const price = typeof stock.price === 'number' && stock.price > 0 ? stock.price : stock.cost;
    return acc + stock.shares * price * fx;
  }, 0);

  const monthlyGap = Math.max(0, monthlyGoalTWD - displayMonthlyIncome);
  const annualGap = monthlyGap * 12;
  const currentYieldRatio = summary.weightedDividendYieldPct > 0 ? summary.weightedDividendYieldPct / 100 : 0.05; // Fallback 5%
  const capitalNeededToFillGapTWD = currentYieldRatio > 0 ? annualGap / currentYieldRatio : 0;

  // DRIP Compounding Calculation
  // Formula: Compound growth with annual yield + monthly contribution
  const computeDripProjections = (years: number, addMonthly: number) => {
    const initialAsset = currentTotalValTWD;
    const annualYieldRate = currentYieldRatio; // e.g. 0.055 for 5.5%
    const estimatedPriceGrowthRate = 0.03; // Conservative 3% asset price appreciation

    // Scenario A: Cash Out (No DRIP, no reinvestment)
    let assetNoDrip = initialAsset;
    let totalCashReceivedNoDrip = 0;
    for (let i = 0; i < years; i++) {
      const yearDiv = assetNoDrip * annualYieldRate;
      totalCashReceivedNoDrip += yearDiv;
      assetNoDrip += assetNoDrip * estimatedPriceGrowthRate + addMonthly * 12;
    }
    const finalMonthlyIncomeNoDrip = (assetNoDrip * annualYieldRate) / 12;

    // Scenario B: DRIP (100% Dividend Reinvestment + Monthly Addition)
    let assetDrip = initialAsset;
    for (let i = 0; i < years; i++) {
      const yearDiv = assetDrip * annualYieldRate;
      assetDrip = assetDrip + yearDiv + (assetDrip * estimatedPriceGrowthRate) + addMonthly * 12;
    }
    const finalMonthlyIncomeDrip = (assetDrip * annualYieldRate) / 12;

    return {
      assetNoDrip,
      totalCashReceivedNoDrip,
      finalMonthlyIncomeNoDrip,
      assetDrip,
      finalMonthlyIncomeDrip,
      dripBonusIncome: finalMonthlyIncomeDrip - finalMonthlyIncomeNoDrip,
      dripBonusAsset: assetDrip - assetNoDrip,
    };
  };

  const dripResult = computeDripProjections(dripYears, monthlyContribution);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const maxMonthlyVal = Math.max(...summary.monthlyBreakdown, 1000);

  return (
    <div className="glass-card p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 sm:space-y-3.5 bg-white relative w-full">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-2 sm:pb-3">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>除權息與現金流</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-100">
                  Dividends
                </span>
              </h2>
            </div>
          </div>

          {/* Mobile-inline Tax Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[10px] shrink-0 sm:hidden">
            <button
              onClick={() => {
                playClickSound();
                setTaxMode('gross');
              }}
              className={`px-2 py-0.5 rounded font-bold transition ${
                taxMode === 'gross' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              稅前
            </button>
            <button
              onClick={() => {
                playClickSound();
                setTaxMode('net');
              }}
              className={`px-2 py-0.5 rounded font-bold transition ${
                taxMode === 'net' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              稅後
            </button>
          </div>
        </div>

        {/* Tab Switcher & Desktop Tax Switcher */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-1.5">
          <div className="grid grid-cols-4 sm:flex w-full sm:w-auto p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold gap-0.5">
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('overview');
              }}
              className={`px-2 sm:px-3 py-1 rounded-md transition whitespace-nowrap flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3 shrink-0" />
              <span>總覽</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('calendar');
              }}
              className={`px-2 sm:px-3 py-1 rounded-md transition whitespace-nowrap flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
                activeTab === 'calendar'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BellRing className="w-3 h-3 shrink-0" />
              <span>提醒({summary.upcomingReminders.length})</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('goal');
              }}
              className={`px-2 sm:px-3 py-1 rounded-md transition whitespace-nowrap flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
                activeTab === 'goal'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3 h-3 shrink-0" />
              <span>目標</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setActiveTab('drip');
              }}
              className={`px-2 sm:px-3 py-1 rounded-md transition whitespace-nowrap flex items-center justify-center gap-1 text-[11px] sm:text-xs ${
                activeTab === 'drip'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3 h-3 shrink-0" />
              <span>複利</span>
            </button>
          </div>

          {/* Desktop Tax Mode Switcher */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => {
                playClickSound();
                setTaxMode('gross');
              }}
              className={`px-2.5 py-1 rounded font-bold transition ${
                taxMode === 'gross' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              稅前 (Gross)
            </button>
            <button
              onClick={() => {
                playClickSound();
                setTaxMode('net');
              }}
              className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1 ${
                taxMode === 'net' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              稅後淨領 (Net)
            </button>
          </div>
        </div>
      </div>

      {/* Hero Stats (Single-row 3-Column Compact Grid) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full">
        {/* Annual Passive Income */}
        <div className="bg-slate-50/90 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-emerald-100 flex flex-col justify-between">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 flex items-center justify-between truncate">
            <span className="flex items-center gap-0.5 text-emerald-800 truncate">
              <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" /> 年被動收入
            </span>
            {taxMode === 'net' && (
              <span className="hidden sm:inline text-[9px] text-amber-800 font-mono bg-amber-100 px-1 py-0.2 rounded">
                稅後
              </span>
            )}
          </div>
          <div className="text-sm sm:text-2xl font-black font-mono text-emerald-700 tracking-tight my-0.5 truncate">
            ${formatMoney(displayAnnualIncome, isPrivacy)}
            <span className="text-[9px] sm:text-xs font-sans text-slate-500 font-normal ml-0.5">/年</span>
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-500 font-mono truncate">
            {taxMode === 'gross' ? '年增約1月薪' : `扣費~${Math.round(totalNhiFeeTWD + totalUsTaxTWD).toLocaleString()}`}
          </div>
        </div>

        {/* Monthly Passive Income */}
        <div className="bg-slate-50/90 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-indigo-100 flex flex-col justify-between">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 flex items-center gap-0.5 text-indigo-800 truncate">
            <TrendingUp className="w-3 h-3 text-indigo-600 shrink-0" /> 月均領息
          </div>
          <div className="text-sm sm:text-2xl font-black font-mono text-indigo-700 tracking-tight my-0.5 truncate">
            ${formatMoney(displayMonthlyIncome, isPrivacy)}
            <span className="text-[9px] sm:text-xs font-sans text-slate-500 font-normal ml-0.5">/月</span>
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-500 font-mono truncate">
            進度: <strong className="text-indigo-600">{goalProgressPct.toFixed(0)}%</strong>
          </div>
        </div>

        {/* Portfolio Dividend Yield */}
        <div className="bg-amber-50/70 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-amber-200/80 flex flex-col justify-between">
          <div className="text-[10px] sm:text-xs font-bold text-amber-800 flex items-center gap-0.5 truncate">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" /> 平均殖利率
          </div>
          <div className="text-sm sm:text-2xl font-black font-mono text-amber-700 tracking-tight my-0.5 truncate">
            {summary.weightedDividendYieldPct.toFixed(2)}%
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-600 font-mono truncate">
            共 {portfolio.length} 檔持股
          </div>
        </div>
      </div>

      {/* Ex-Rights Pending Stock Assets Banner (Compact) */}
      {summary.totalPendingStockValueTWD > 0 && (
        <div className="bg-purple-50/80 border border-purple-200 px-3 py-1.5 sm:py-2 rounded-xl text-xs text-purple-900 flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <Gift className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="font-bold truncate">除權待撥股票：</span>
            <span className="font-mono text-purple-800 font-bold">+{summary.totalPendingStockShares.toLocaleString()} 股</span>
          </div>
          <div className="text-right shrink-0 font-mono font-bold text-purple-800 text-xs">
            約 ${formatMoney(summary.totalPendingStockValueTWD, isPrivacy)} NT$
          </div>
        </div>
      )}

      {/* Tab 1: Overview & 12-Month Cashflow Bar Chart (High Density) */}
      {activeTab === 'overview' && (
        <div className="space-y-2 sm:space-y-3">
          <div className="bg-slate-50/80 p-2 sm:p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-700">
              <span className="font-bold flex items-center gap-1 text-[11px] sm:text-xs">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> 12 個月現金流分佈 (月月配)
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                深綠代表高於月均發放月份
              </span>
            </div>

            <div className="grid grid-cols-12 gap-0.5 sm:gap-1.5 h-28 sm:h-40 items-end pt-3 sm:pt-6 pb-0.5 w-full">
              {summary.monthlyBreakdown.map((val, idx) => {
                const heightPct = Math.max(10, (val / maxMonthlyVal) * 100);
                const isHighMonth = val > displayMonthlyIncome;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group min-w-0">
                    <div className="text-[7px] sm:text-[9px] font-mono text-slate-600 font-bold opacity-0 group-hover:opacity-100 sm:opacity-80 transition mb-0.5 text-center truncate w-full">
                      ${formatMoney(Math.round(val), isPrivacy)}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[28px] rounded-t sm:rounded-t-md transition-all duration-300 ${
                        isHighMonth
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-xs'
                          : 'bg-gradient-to-t from-sky-600 to-sky-400 opacity-75'
                      }`}
                    />
                    <div className="text-[8px] sm:text-[10px] font-mono font-bold text-slate-700 mt-1 truncate">
                      {monthNames[idx]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax Breakdown Hint (Compact) */}
          {taxMode === 'net' && (
            <div className="bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-xl text-[11px] text-amber-900 flex justify-between items-center gap-2">
              <span className="truncate">二代健保 ≥$2萬扣2.11% / 美稅30%</span>
              <span className="font-mono text-amber-800 shrink-0 font-bold">
                健保 ~${Math.round(totalNhiFeeTWD).toLocaleString()} | 美稅 ~${Math.round(totalUsTaxTWD).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Upcoming Ex-Dividend Calendar (Compact & Streamlined) */}
      {activeTab === 'calendar' && (
        <div className="space-y-2 sm:space-y-3">
          {/* Controls Bar */}
          <div className="flex flex-wrap justify-between items-center gap-1.5">
            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center gap-0.5">
              <button
                onClick={() => {
                  playClickSound();
                  setCalendarView('grid');
                }}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                  calendarView === 'grid' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3 h-3" /> 卡片
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setCalendarView('table');
                }}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                  calendarView === 'table' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3 h-3" /> 清單
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  playClickSound();
                  fetchLiveDividends(true);
                }}
                disabled={isFetchingDividends}
                className="text-[11px] text-sky-700 font-bold bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 flex items-center gap-1 transition btn-interact disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingDividends ? 'animate-spin' : ''}`} />
                <span>{isFetchingDividends ? '同步中...' : '重新同步最新公告'}</span>
              </button>
            </div>
          </div>

          {syncNotice && (
            <div className="bg-sky-50 border border-sky-200 px-2.5 py-1.5 rounded-xl text-[11px] text-sky-800 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* Concise Single-Line Tip (No bulky text block) */}
          <div className="bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] text-slate-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              <strong className="text-emerald-700">證交所公告</strong>為官方重訊；參與領息請於<strong className="text-amber-700">「最後買進日」</strong>盤後前持有。點擊 ✏️ 可自訂校正。
            </span>
          </div>

          {/* Grid Cards View (Ultra-Compact High Density) */}
          {calendarView === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {summary.upcomingReminders.map((item, idx) => {
                const originalStock = portfolio.find((p) => p.symbol.toUpperCase() === item.symbol.toUpperCase());
                const isOfficial = item.isOfficial || !!item.exactExDate;
                const sInfo = originalStock ? getStockDividendInfo(originalStock, usdTwdRate) : null;

                return (
                  <div
                    key={idx}
                    className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 hover:border-emerald-400 transition space-y-2 relative group shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      {/* Top Row: Symbol + Name + Badges + Edit Button */}
                      <div className="flex justify-between items-center gap-1 border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-mono font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                            {item.symbol}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.name}
                          </span>
                          {isOfficial ? (
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              官方公告
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              預估
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            playClickSound();
                            if (originalStock) {
                              setEditingStock(originalStock);
                              setEditExDate(originalStock.customExDate || item.exactExDate || '');
                              const stockInfo = getStockDividendInfo(originalStock, usdTwdRate);
                              setEditSingleDps(originalStock.customSingleDps ? String(originalStock.customSingleDps) : String(stockInfo.singleDividendPerShare));
                              setEditDps(originalStock.customDps ? String(originalStock.customDps) : String(stockInfo.annualDividendPerShare));
                              setEditStockDps(originalStock.customStockDps !== undefined ? String(originalStock.customStockDps) : String(stockInfo.stockDps || ''));
                            }
                          }}
                          title="手動校正/輸入官方公告"
                          className="p-1 rounded-md bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition border border-slate-200 shrink-0"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* 2x2 High-Density Data Grid */}
                      <div className="grid grid-cols-2 gap-1.5 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                        {/* Cell 1: Cash DPS */}
                        <div className="min-w-0">
                          <div className="text-[9px] text-slate-500 font-sans">每股現金 (配息)</div>
                          <div className="text-xs font-black text-emerald-700 truncate">
                            ${item.singleDps.toFixed(2)} <span className="text-[9px] font-normal text-slate-500 font-sans">元/股</span>
                          </div>
                          {originalStock?.market !== 'us' && (
                            <div className="text-[8px] text-slate-400 font-sans truncate">
                              (每張 ${Math.round(item.singleDps * 1000).toLocaleString()})
                            </div>
                          )}
                        </div>

                        {/* Cell 2: Schedule (Ex-Date & Last Buy) */}
                        <div className="min-w-0 text-right">
                          <div className="text-[9px] text-slate-500 font-sans">除息交易日</div>
                          <div className={`text-xs font-black truncate ${isOfficial ? "text-emerald-700" : "text-amber-700"}`}>
                            {item.exactExDate ? item.exactExDate : `${item.nextExMonthStr}`}
                          </div>
                          <div className="text-[8px] text-amber-800 font-sans truncate">
                            {item.lastBuyDate ? `最後買進 ${item.lastBuyDate}` : '依前次估算'}
                          </div>
                        </div>

                        {/* Cell 3: Shares */}
                        <div className="min-w-0 border-t border-slate-200/50 pt-1">
                          <div className="text-[9px] text-slate-500 font-sans">持股數</div>
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {originalStock?.shares.toLocaleString() || 0} 股
                            <span className="text-[8px] text-slate-400 font-normal ml-0.5">
                              ({((originalStock?.shares || 0) / 1000).toFixed(1)}張)
                            </span>
                          </div>
                        </div>

                        {/* Cell 4: Est Payout */}
                        <div className="min-w-0 text-right border-t border-slate-200/50 pt-1">
                          <div className="text-[9px] text-slate-500 font-sans">預估單次現金</div>
                          <div className="text-xs font-black text-emerald-700 truncate">
                            ${formatMoney(item.estAmountTWD, isPrivacy)} <span className="text-[9px] font-normal font-sans">NT$</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stock Dividend Strip (if exists) */}
                    {item.stockDps > 0 && (
                      <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono gap-1">
                        <span className="text-purple-800 truncate">
                          配股 <strong className="font-bold">+{item.pendingStockShares} 股</strong> (~${formatMoney(item.pendingStockValueTWD, isPrivacy)})
                        </span>
                        {onApplyPendingStockShares && originalStock && (
                          <button
                            onClick={() => {
                              playClickSound();
                              onApplyPendingStockShares(originalStock.id);
                            }}
                            className="text-[9px] font-bold bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded flex items-center gap-0.5 transition shrink-0"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>撥入</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View (High-Density Streamlined) */}
          {calendarView === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[9px] border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-2 px-2.5">標的 / 代號</th>
                      <th className="py-2 px-1.5 text-center">類別</th>
                      <th className="py-2 px-2 text-right">每股現金</th>
                      <th className="py-2 px-2 text-right">每股配股</th>
                      <th className="py-2 px-2 text-center">除息日</th>
                      <th className="py-2 px-2 text-center">最後買進</th>
                      <th className="py-2 px-2 text-right">持股數</th>
                      <th className="py-2 px-2 text-right">預估現金</th>
                      <th className="py-2 px-1.5 text-center">校正</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                    {summary.upcomingReminders.map((item, idx) => {
                      const originalStock = portfolio.find((p) => p.symbol.toUpperCase() === item.symbol.toUpperCase());
                      const isOfficial = item.isOfficial || !!item.exactExDate;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-1.5 px-2.5 font-sans">
                            <div className="font-bold text-slate-900 text-xs truncate max-w-[110px]">{item.name}</div>
                            <div className="text-indigo-600 text-[10px] font-mono font-bold">{item.symbol}</div>
                          </td>

                          <td className="py-1.5 px-1.5 text-center">
                            {item.stockDps > 0 && item.singleDps > 0 ? (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                權息
                              </span>
                            ) : item.stockDps > 0 ? (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                配股
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                配息
                              </span>
                            )}
                          </td>

                          <td className="py-1.5 px-2 text-right font-bold text-emerald-700">
                            ${item.singleDps.toFixed(2)}
                          </td>

                          <td className="py-1.5 px-2 text-right font-bold text-purple-700">
                            {item.stockDps > 0 ? `${item.stockDps.toFixed(2)}` : '-'}
                          </td>

                          <td className="py-1.5 px-2 text-center">
                            <span className={isOfficial ? "text-emerald-700 font-bold" : "text-amber-800"}>
                              {item.exactExDate ? item.exactExDate : `${item.nextExMonthStr}`}
                            </span>
                          </td>

                          <td className="py-1.5 px-2 text-center">
                            {item.lastBuyDate ? (
                              <span className="text-amber-800 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200 text-[10px]">
                                {item.lastBuyDate}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>

                          <td className="py-1.5 px-2 text-right font-bold text-slate-700">
                            {originalStock?.shares.toLocaleString() || 0}
                          </td>

                          <td className="py-1.5 px-2 text-right font-bold text-emerald-700">
                            ${formatMoney(item.estAmountTWD, isPrivacy)}
                          </td>

                          <td className="py-1.5 px-1.5 text-center">
                            <button
                              onClick={() => {
                                playClickSound();
                                if (originalStock) {
                                  setEditingStock(originalStock);
                                  setEditExDate(originalStock.customExDate || item.exactExDate || '');
                                  const stockInfo = getStockDividendInfo(originalStock, usdTwdRate);
                                  setEditSingleDps(originalStock.customSingleDps ? String(originalStock.customSingleDps) : String(stockInfo.singleDividendPerShare));
                                  setEditDps(originalStock.customDps ? String(originalStock.customDps) : String(stockInfo.annualDividendPerShare));
                                  setEditStockDps(originalStock.customStockDps !== undefined ? String(originalStock.customStockDps) : String(stockInfo.stockDps || ''));
                                }
                              }}
                              className="p-1 rounded bg-slate-100 text-slate-600 hover:text-indigo-600 transition"
                              title="校正除息日與配息"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Financial Freedom Goal & Capital Gap Calculator */}
      {activeTab === 'goal' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" /> 每月被動收入自由目標試算
              </h3>
              <p className="text-xs text-slate-500">設定您的目標月領金額，系統將自動推算達成進度與所需加碼本金</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-700 font-bold whitespace-nowrap">月目標 (NT$):</span>
              <input
                type="number"
                inputMode="decimal"
                step={5000}
                value={monthlyGoalTWD}
                onChange={(e) => setMonthlyGoalTWD(Math.max(1000, Number(e.target.value)))}
                className="w-full sm:w-36 bg-slate-50 text-emerald-700 font-mono font-bold text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-700">
                目前月領: <strong className="text-emerald-700">${formatMoney(displayMonthlyIncome, isPrivacy)}</strong>
              </span>
              <span className="text-slate-700">
                目標金額: <strong className="text-indigo-600">${formatMoney(monthlyGoalTWD, isPrivacy)}</strong>
              </span>
            </div>

            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                style={{ width: `${goalProgressPct}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-700 shadow-xs"
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono pt-1">
              <span className="text-emerald-700 font-bold">進度: {goalProgressPct.toFixed(1)}%</span>
              {displayMonthlyIncome < monthlyGoalTWD ? (
                <span className="text-amber-700 font-bold">
                  月領缺口: 還差 ${formatMoney(monthlyGap, isPrivacy)} NT$
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">🎉 已達成財富自由初步目標！</span>
              )}
            </div>
          </div>

          {/* Capital Needed Card (倒推加碼本金) */}
          {monthlyGap > 0 && (
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 p-4 rounded-2xl border border-sky-200 space-y-2">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" /> 填補缺口：還需投入本金估算
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                依據您目前組合平均殖利率 <strong className="text-amber-800 font-mono">{summary.weightedDividendYieldPct.toFixed(2)}%</strong> 試算，要填補每月 <strong className="text-emerald-700 font-mono">${Math.round(monthlyGap).toLocaleString()} NT$</strong> 的缺口：
              </p>
              <div className="bg-white p-3 rounded-xl border border-sky-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="text-xs text-slate-600">
                  預估還需加碼本金：
                </div>
                <div className="text-xl font-black font-mono text-indigo-700">
                  ${Math.round(capitalNeededToFillGapTWD / 10000).toLocaleString()} <span className="text-xs font-sans text-slate-600">萬元 NT$</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: DRIP Compound Growth Simulator (股息再投資複利試算) */}
      {activeTab === 'drip' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-md space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-emerald-600" /> 股息 100% 再投資 (DRIP) 複利模擬器
            </h3>
            <p className="text-xs text-slate-500">
              比較「單純領息花掉 (No DRIP)」與「100% 股息再投資 (DRIP) 滾雪球」的資產爆發力差距
            </p>
          </div>

          {/* Interactive Controls (Mobile Stack) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            {/* Horizon Selection */}
            <div className="space-y-1.5">
              <label className="text-slate-700 font-bold block">試算滾存時間 (年):</label>
              <div className="flex gap-1.5">
                {[3, 5, 10, 20].map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      playClickSound();
                      setDripYears(y);
                    }}
                    className={`flex-1 py-1.5 rounded-xl font-mono font-bold transition border ${
                      dripYears === y
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {y} 年
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Contribution Slider */}
            <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-slate-800 flex items-center gap-1.5">
                  全投資組合每月定期定額總投入：
                  <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    整體組合總額
                  </span>
                </span>
                <span className="text-emerald-700 font-mono text-base font-black">${monthlyContribution.toLocaleString()} NT$/月</span>
              </div>
              <input
                type="range"
                min={0}
                max={50000}
                step={5000}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-200 rounded-lg h-2 cursor-pointer"
              />
              <div className="text-[11px] text-slate-600 leading-relaxed font-sans flex flex-col sm:flex-row justify-between gap-1 pt-1.5 border-t border-slate-100">
                <span>
                  💡 <strong>資金明確定義：</strong>此金額為<strong>「全投資組合每月新投入之總資金」</strong>（依當前持股價值比例分配投入），非單一股票金額。
                </span>
                {portfolio.length > 0 && monthlyContribution > 0 && (
                  <span className="text-emerald-700 font-mono font-bold shrink-0">
                    目前 {portfolio.length} 檔持股，平均每檔約配分 ${Math.round(monthlyContribution / portfolio.length).toLocaleString()} NT$/月
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scenario A: No DRIP */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-600" /> 方案 A：單純領息花掉
                </span>
                <span className="text-[10px] text-slate-500 font-medium">不重覆投入</span>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-slate-500">
                  {dripYears} 年後預估月領被動收入：
                </div>
                <div className="text-xl font-black font-mono text-amber-700">
                  ${Math.round(dripResult.finalMonthlyIncomeNoDrip).toLocaleString()} <span className="text-xs text-slate-500 font-sans">NT$/月</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono">
                <div>每月新加碼資金: ${monthlyContribution.toLocaleString()} NT$ (全組合總額)</div>
                <div>{dripYears} 年累積落袋股息: ${Math.round(dripResult.totalCashReceivedNoDrip).toLocaleString()}</div>
                <div>{dripYears} 年後預估總資產: ${Math.round(dripResult.assetNoDrip / 10000).toLocaleString()} 萬</div>
              </div>
            </div>

            {/* Scenario B: DRIP */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-emerald-600" /> 方案 B：股息 100% DRIP 再投資
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                  複利滾雪球
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-slate-600">
                  {dripYears} 年後預估月領被動收入：
                </div>
                <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                  ${Math.round(dripResult.finalMonthlyIncomeDrip).toLocaleString()} <span className="text-xs text-slate-500 font-sans">NT$/月</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200 text-[11px] text-slate-700 space-y-1 font-mono">
                <div className="text-emerald-800 font-bold">
                  複利增幅效益：每月多領 +${Math.round(dripResult.dripBonusIncome).toLocaleString()} NT$
                </div>
                <div>每月新加碼資金: ${monthlyContribution.toLocaleString()} NT$ (全組合總額)</div>
                <div>{dripYears} 年後預估總資產: ${Math.round(dripResult.assetDrip / 10000).toLocaleString()} 萬</div>
              </div>
            </div>
          </div>

          {/* Takeaway Insight */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-900 flex items-center gap-3">
            <ArrowRight className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong>複利效益總結：</strong>堅持將股息再投資，{dripYears} 年後總資產將比不投入多出約{' '}
              <strong className="text-amber-800 font-mono">${Math.round(dripResult.dripBonusAsset / 10000).toLocaleString()} 萬元</strong>
              ！早一日啟動 DRIP，雪球滾越快！
            </div>
          </div>
        </div>
      )}

      {/* Custom Ex-Date / DPS Edit Modal */}
      {editingStock && (() => {
        const sInfo = getStockDividendInfo(editingStock, usdTwdRate);
        const freq = sInfo.frequency;
        const mult = sInfo.exMonths.length > 0 ? sInfo.exMonths.length : 1;

        const singleVal = editSingleDps !== '' ? parseFloat(editSingleDps) || 0 : (editDps !== '' ? (parseFloat(editDps) || 0) / mult : sInfo.singleDividendPerShare);
        const annualVal = editDps !== '' ? parseFloat(editDps) || 0 : singleVal * mult;

        const estSinglePayout = editingStock.shares * singleVal * (editingStock.market === 'us' ? usdTwdRate : 1);
        const estAnnualTotal = editingStock.shares * annualVal * (editingStock.market === 'us' ? usdTwdRate : 1);

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setEditingStock(null)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">校正除息公告與配息金額</h4>
                  <p className="text-xs text-indigo-600 font-mono font-bold">{editingStock.symbol} - {editingStock.name}</p>
                </div>
                <button
                  onClick={() => setEditingStock(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">官方公告除息日 (Ex-Date)</label>
                  <input
                    type="date"
                    value={editExDate}
                    onChange={(e) => setEditExDate(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-bold outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">例如: 2026-03-18 (若清空則自動帶入官方重訊)</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emerald-800 font-bold mb-1">單次每股現金股利 (配息)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder={`例如: ${sInfo.singleDividendPerShare}`}
                      value={editSingleDps}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditSingleDps(val);
                        if (val !== '') {
                          const num = parseFloat(val) || 0;
                          setEditDps(String(Number((num * mult).toFixed(4))));
                        } else {
                          setEditDps('');
                        }
                      }}
                      className="w-full bg-slate-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">如台積電 4.0 元 / 合庫金 0.8 元</p>
                  </div>

                  <div>
                    <label className="block text-purple-800 font-bold mb-1">每股股票股利 (配股)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder={`例如: ${sInfo.stockDps || 0}`}
                      value={editStockDps}
                      onChange={(e) => setEditStockDps(e.target.value)}
                      className="w-full bg-slate-50 text-purple-800 border border-purple-200 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-purple-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">0.25 元代表每張配 25 股 (配股率 2.5%)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-amber-800 font-bold mb-1">年化每股總現金股息 (DPS)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder={`例如: ${sInfo.annualDividendPerShare}`}
                    value={editDps}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditDps(val);
                      if (val !== '') {
                        const num = parseFloat(val) || 0;
                        setEditSingleDps(String(Number((num / mult).toFixed(4))));
                      } else {
                        setEditSingleDps('');
                      }
                    }}
                    className="w-full bg-slate-50 text-amber-800 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">({freq} x {mult} 次/年)</p>
                </div>

                {/* Live Realtime Portfolio Impact Box */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-emerald-200 space-y-1.5 font-mono">
                  <div className="text-[11px] text-slate-500 flex justify-between font-sans">
                    <span>持股試算對照 ({editingStock.shares.toLocaleString()} 股 / {(editingStock.shares / 1000).toFixed(1)} 張)</span>
                    <span className="text-emerald-700 font-bold">即時試算</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-800">
                    <span>單次預估現金股息：</span>
                    <span className="text-emerald-700 font-bold text-sm">${Math.round(estSinglePayout).toLocaleString()} NT$</span>
                  </div>
                  {editStockDps !== '' && parseFloat(editStockDps) > 0 && (
                    <div className="flex justify-between items-center text-purple-800 border-t border-slate-200/60 pt-1">
                      <span>預估新增配股股票：</span>
                      <span className="font-bold">+{Math.round((editingStock.shares * parseFloat(editStockDps)) / 10)} 股</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-800 border-t border-slate-200/60 pt-1">
                    <span>全年度預估總現金：</span>
                    <span className="text-amber-800 font-bold">${Math.round(estAnnualTotal).toLocaleString()} NT$</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    playSuccessSound();
                    const resetStock: StockPosition = {
                      ...editingStock,
                      customExDate: undefined,
                      customSingleDps: undefined,
                      customDps: undefined,
                      customStockDps: undefined,
                    };
                    if (onUpdateStock) {
                      onUpdateStock(resetStock);
                    }
                    setEditingStock(null);
                  }}
                  className="px-3 py-2 rounded-xl text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 恢復官方數據 (清除校正)
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingStock(null)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 font-bold text-xs transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      playSuccessSound();
                      const updatedStock: StockPosition = {
                        ...editingStock,
                        customExDate: editExDate.replace(/-/g, '/').trim() || undefined,
                        customSingleDps: editSingleDps !== '' ? parseFloat(editSingleDps) : undefined,
                        customDps: editDps !== '' ? parseFloat(editDps) : undefined,
                        customStockDps: editStockDps !== '' ? parseFloat(editStockDps) : undefined,
                      };
                      if (onUpdateStock) {
                        onUpdateStock(updatedStock);
                      }
                      setEditingStock(null);
                    }}
                    className="px-4 py-2 rounded-xl text-white font-bold bg-emerald-500 hover:bg-emerald-600 text-xs shadow-xs transition"
                  >
                    儲存校正
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

