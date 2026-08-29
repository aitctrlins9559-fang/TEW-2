import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  PieChart,
  Download,
  Upload,
  Box,
  Plus,
  History,
  Edit3,
  Trash2,
  Calendar,
  Sparkles,
  BarChart2,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Globe,
  Table as TableIcon,
  LayoutGrid,
  Grid,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  Calculator,
} from 'lucide-react';
import { StockPosition } from '../types';
import { formatMoney } from '../utils/format';
import { playClickSound } from '../utils/audio';
import { getStockDividendInfo } from '../utils/dividendHelper';
import { calculateTransactionCost, DISCOUNT_OPTIONS } from '../utils/costHelper';
import { StockDetailModal } from './Modals/StockDetailModal';

interface StockTableProps {
  portfolio: StockPosition[];
  usdTwdRate: number;
  isAdmin: boolean;
  isPrivacy: boolean;
  isRedUp: boolean;
  officialEvents?: Record<string, { exDate: string; amount: number; stockDps?: number }>;
  brokerDiscount?: number;
  onUpdateBrokerDiscount?: (discount: number) => void;
  onSelectChartTarget: (symbol: string, market: 'tse' | 'otc' | 'us', name: string) => void;
  onOpenTxHistory: (stockId: string) => void;
  onOpenEditModal: (stockId: string) => void;
  onDeleteStock: (stockId: string) => void;
  onOpenAddModal: () => void;
  onToggleAdmin: () => void;
  onPublishToGlobal?: () => void;
  onExportData: () => void;
  onImportData: () => void;
  isExAdjustedMode?: boolean;
  onToggleExAdjustedMode?: () => void;
  onApplyPendingStockShares?: (stockId: string) => void;
  onDeductCashDividendCost?: (stockId: string, dps?: number) => void;
}

type ViewMode = 'table' | 'cards' | 'heatmap';
type SortField = 'value' | 'roi' | 'yield' | 'name';
type SortOrder = 'asc' | 'desc';

export const StockTable: React.FC<StockTableProps> = ({
  portfolio,
  usdTwdRate,
  isAdmin,
  isPrivacy,
  isRedUp,
  officialEvents,
  brokerDiscount = 0.28,
  onUpdateBrokerDiscount,
  onSelectChartTarget,
  onOpenTxHistory,
  onOpenEditModal,
  onDeleteStock,
  onOpenAddModal,
  onToggleAdmin,
  onPublishToGlobal,
  onExportData,
  onImportData,
  isExAdjustedMode = true,
  onToggleExAdjustedMode,
  onApplyPendingStockShares,
  onDeductCashDividendCost,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'tw' | 'us'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [detailModalStock, setDetailModalStock] = useState<StockPosition | null>(null);
  const [localDiscount, setLocalDiscount] = useState<number>(brokerDiscount);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalDiscount(brokerDiscount);
  }, [brokerDiscount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(e.target as Node)) {
        setIsDataMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUpColor = () => (isRedUp ? 'text-rose-600' : 'text-emerald-600');
  const getDownColor = () => (isRedUp ? 'text-emerald-600' : 'text-rose-600');

  // Filtered & Sorted Portfolio List
  const filteredPortfolio = useMemo(() => {
    const list = portfolio.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSymbol = item.symbol.toLowerCase().includes(q);
        if (!matchName && !matchSymbol) return false;
      }

      const isUS = item.market === 'us';
      if (filterTab === 'tw' && isUS) return false;
      if (filterTab === 'us' && !isUS) return false;

      return true;
    });

    return list.sort((a, b) => {
      const getVal = (item: StockPosition) => {
        const isUS = item.market === 'us';
        const fx = isUS ? usdTwdRate : 1;
        const p = typeof item.price === 'number' && item.price > 0 ? item.price : item.cost;
        const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);
        const effShares = isExAdjustedMode ? item.shares + divInfo.pendingStockShares : item.shares;
        return effShares * p * fx;
      };

      const getROI = (item: StockPosition) => {
        const isUS = item.market === 'us';
        const buyFx = isUS ? item.buyRate || usdTwdRate : 1;
        const mFx = isUS ? usdTwdRate : 1;
        const cost = item.shares * item.cost * buyFx;
        const p = typeof item.price === 'number' && item.price > 0 ? item.price : item.cost;
        const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);
        const effShares = isExAdjustedMode ? item.shares + divInfo.pendingStockShares : item.shares;
        const val = effShares * p * mFx;
        return cost > 0 ? ((val - cost) / cost) * 100 : 0;
      };

      const getYield = (item: StockPosition) => {
        const info = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);
        return info.dividendYieldPct;
      };

      let factor = sortOrder === 'desc' ? -1 : 1;
      if (sortField === 'value') return (getVal(a) - getVal(b)) * factor;
      if (sortField === 'roi') return (getROI(a) - getROI(b)) * factor;
      if (sortField === 'yield') return (getYield(a) - getYield(b)) * factor;
      if (sortField === 'name') return a.name.localeCompare(b.name, 'zh-TW') * factor;
      return 0;
    });
  }, [portfolio, searchQuery, filterTab, sortField, sortOrder, usdTwdRate, officialEvents]);

  // Total Portfolio Value for Heatmap % Calculation
  const totalPortfolioValueTWD = useMemo(() => {
    return portfolio.reduce((acc, item) => {
      const isUS = item.market === 'us';
      const fx = isUS ? usdTwdRate : 1;
      const p = typeof item.price === 'number' && item.price > 0 ? item.price : item.cost;
      return acc + item.shares * p * fx;
    }, 0);
  }, [portfolio, usdTwdRate]);

  // Counts
  const counts = useMemo(() => {
    let tw = 0;
    let us = 0;
    portfolio.forEach((item) => {
      if (item.market === 'us') us++;
      else tw++;
    });
    return { all: portfolio.length, tw, us };
  }, [portfolio]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white p-2 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2.5 sm:space-y-4 w-full">
      {/* Table / Feed Header Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-3 flex-wrap">
        {/* Left Title & Count */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/15 font-bold shrink-0">
            <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
              <span>持股部位</span>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 rounded-full font-mono font-bold border border-indigo-100 shrink-0">
                {filteredPortfolio.length} / {portfolio.length}
              </span>
            </h2>
          </div>
        </div>

        {/* Right Unified Controls: View Switcher + Add + Settings Dropdown */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 text-[10px] sm:text-xs font-bold">
            <button
              onClick={() => {
                playClickSound();
                setViewMode('table');
              }}
              className={`px-2 py-1 rounded-md transition flex items-center gap-0.5 sm:gap-1 ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="表格檢視"
            >
              <TableIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>表格</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setViewMode('cards');
              }}
              className={`px-2 py-1 rounded-md transition flex items-center gap-0.5 sm:gap-1 ${
                viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="圖卡檢視"
            >
              <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>圖卡</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setViewMode('heatmap');
              }}
              className={`px-2 py-1 rounded-md transition flex items-center gap-0.5 sm:gap-1 ${
                viewMode === 'heatmap' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="熱力比例圖"
            >
              <Grid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>熱力</span>
            </button>
          </div>

          {/* Add Stock Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenAddModal();
            }}
            className="text-[11px] sm:text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition flex items-center gap-1 btn-interact shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">新增持股</span>
            <span className="xs:hidden">新增</span>
          </button>

          {/* Settings & Parameters Dropdown Menu (Contains Broker Discount + Backup) */}
          <div className="relative" ref={dataMenuRef}>
            <button
              onClick={() => {
                playClickSound();
                setIsDataMenuOpen((prev) => !prev);
              }}
              className={`text-xs p-1 sm:px-2 sm:py-1.5 rounded-lg sm:rounded-xl border transition flex items-center gap-1 btn-interact ${
                isDataMenuOpen
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="參數與管理設定 (券商折數、備份匯出入)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[10px] font-mono font-bold text-indigo-700 hidden sm:inline">
                {DISCOUNT_OPTIONS.find((o) => Math.abs(o.value - localDiscount) < 0.001)?.label.split(' ')[1] || `${(localDiscount * 10).toFixed(1)}折`}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDataMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDataMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 space-y-2.5 text-xs animate-fadeIn">
                {/* Broker Discount Setting Block inside Dropdown */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      券商手續費折讓
                    </span>
                    <span className="font-mono text-indigo-600 font-bold text-[10px]">
                      {DISCOUNT_OPTIONS.find((o) => Math.abs(o.value - localDiscount) < 0.001)?.label.split(' ')[0] || ''}
                    </span>
                  </div>
                  <select
                    value={localDiscount}
                    onChange={(e) => {
                      const d = parseFloat(e.target.value);
                      playClickSound();
                      setLocalDiscount(d);
                      if (onUpdateBrokerDiscount) onUpdateBrokerDiscount(d);
                    }}
                    className="w-full bg-white border border-slate-200 text-indigo-700 font-bold rounded-lg px-2 py-1.5 outline-none cursor-pointer text-xs font-sans shadow-2xs"
                  >
                    {DISCOUNT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="text-xs font-sans text-slate-800">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-400">用於損益試算扣除手續費 (0.1425%) 與證交稅</p>
                </div>

                <div className="border-t border-slate-100 pt-1.5 space-y-1">
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsDataMenuOpen(false);
                      onExportData();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>匯出備份檔 (JSON)</span>
                  </button>

                  <button
                    onClick={() => {
                      playClickSound();
                      setIsDataMenuOpen(false);
                      onImportData();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>還原 JSON 備份檔</span>
                  </button>

                  {onPublishToGlobal && (
                    <button
                      onClick={() => {
                        playClickSound();
                        setIsDataMenuOpen(false);
                        onPublishToGlobal();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 text-emerald-700 font-bold transition"
                    >
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span>同步至全域雲端</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Toolbar: Filter Tabs, Search & Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="grid grid-cols-3 sm:flex items-center gap-1 p-0.5 sm:p-1 bg-slate-100/80 rounded-lg sm:rounded-xl border border-slate-200/80 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => {
              playClickSound();
              setFilterTab('all');
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition text-center ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部 ({counts.all})
          </button>
          <button
            onClick={() => {
              playClickSound();
              setFilterTab('tw');
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition text-center ${
              filterTab === 'tw'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            台股 ({counts.tw})
          </button>
          <button
            onClick={() => {
              playClickSound();
              setFilterTab('us');
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition text-center ${
              filterTab === 'us'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            美股 ({counts.us})
          </button>
        </div>

        {/* Search & Sort controls */}
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5 sm:gap-2 flex-1 w-full sm:max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋代號或名稱..."
              className="w-full glass-input rounded-lg sm:rounded-xl pl-8 pr-7 py-1 sm:py-1.5 text-xs placeholder-slate-400 border-slate-300 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 shrink-0 xs:flex xs:items-center">
            <button
              onClick={() => toggleSort('value')}
              className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-0.5 transition ${
                sortField === 'value' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="依市值排序"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>市值</span>
            </button>

            <button
              onClick={() => toggleSort('roi')}
              className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-0.5 transition ${
                sortField === 'roi' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="依報酬率排序"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>報酬</span>
            </button>

            <button
              onClick={() => toggleSort('yield')}
              className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-0.5 transition ${
                sortField === 'yield' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="依殖利率排序"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>殖利率</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredPortfolio.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Box className="w-6 h-6" />
          </div>
          <p className="text-slate-600 text-xs font-medium">
            {searchQuery || filterTab !== 'all'
              ? '沒有符合搜尋條件的標的'
              : '目前尚未加入任何持股部位，點擊新增開啟資產追蹤'}
          </p>
        </div>
      ) : (
        <>
          {/* MODE 1: PRO FINANCIAL DATA TABLE VIEW */}
          {viewMode === 'table' && (
            <>
              {/* Desktop / Tablet Table View (Stacked for Maximum Width & Zero Horizontal Drag) */}
              <div className="hidden sm:block rounded-xl sm:rounded-2xl border border-slate-200 bg-white relative w-full overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/90 uppercase tracking-wider font-mono text-[11px]">
                      <th className="p-3 whitespace-nowrap">標的 / 代號</th>
                      <th className="p-3 text-right whitespace-nowrap">現價 / 均價股數</th>
                      <th className="p-3 text-right whitespace-nowrap">總市值 / 淨損益 (ROI)</th>
                      <th className="p-3 text-right whitespace-nowrap">預估成本 (手續費+稅)</th>
                      <th className="p-3 text-right whitespace-nowrap">殖利率 (預估年息)</th>
                      <th className="p-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPortfolio.map((item) => {
                      const isUS = item.market === 'us';
                      const buyFx = isUS ? item.buyRate || usdTwdRate : 1;
                      const marketFx = isUS ? usdTwdRate : 1;
                      const safePrice = typeof item.price === 'number' && item.price > 0 ? item.price : null;

                      const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);
                      const pendingShares = divInfo.pendingStockShares || 0;
                      const effectiveShares = isExAdjustedMode ? item.shares + pendingShares : item.shares;

                      const itemCostTWD = item.shares * item.cost * buyFx;
                      const itemMarketValTWD = safePrice === null ? null : effectiveShares * safePrice * marketFx;
                      const itemProfitTWD = itemMarketValTWD === null ? null : itemMarketValTWD - itemCostTWD;

                      const costDetails = calculateTransactionCost(item, usdTwdRate, localDiscount);

                      const netProfitColorClass =
                        costDetails.netProfitTWD >= 0 ? getUpColor() : getDownColor();

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            playClickSound();
                            setDetailModalStock(item);
                          }}
                          className="hover:bg-indigo-50/40 cursor-pointer transition text-slate-800 group"
                        >
                          {/* Stacked Name & Symbol & Market */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <div className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                                <span>{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                                  {item.symbol}
                                </span>
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 uppercase">
                                  {item.market}
                                </span>
                                {isExAdjustedMode && pendingShares > 0 && (
                                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200" title="除權待撥股數：已算入估值與損益平準">
                                    +{pendingShares.toLocaleString()} 待撥
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Stacked Current Price & Shares / Cost */}
                          <td className="p-3 text-right font-mono whitespace-nowrap">
                            <div className="font-black text-slate-900 text-sm">
                              {safePrice === null ? '--' : `$${safePrice}`}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.shares.toLocaleString()} 股 · 均價 ${item.cost}
                            </div>
                          </td>

                          {/* Stacked Market Value & Net Profit / ROI */}
                          <td className="p-3 text-right font-mono whitespace-nowrap">
                            <div className="font-black text-slate-900 text-sm">
                              {itemMarketValTWD === null ? '--' : formatMoney(itemMarketValTWD, isPrivacy)}
                            </div>
                            <div className={`text-[11px] font-bold ${netProfitColorClass} flex items-center justify-end gap-1`}>
                              <span>
                                {safePrice === null
                                  ? '--'
                                  : `${costDetails.netProfitTWD >= 0 ? '+' : ''}${formatMoney(costDetails.netProfitTWD, isPrivacy)}`}
                              </span>
                              <span className="text-[10px]">
                                ({safePrice === null ? '--' : `${costDetails.netRoiPct >= 0 ? '+' : ''}${costDetails.netRoiPct.toFixed(2)}%`})
                              </span>
                            </div>
                          </td>

                          {/* Stacked Transaction Cost */}
                          <td className="p-3 text-right font-mono whitespace-nowrap">
                            {isUS ? (
                              <div className="text-slate-400 text-[11px] font-sans">免手續費 (美股)</div>
                            ) : (
                              <div>
                                <div className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block text-[11px]">
                                  ${costDetails.totalCostTWD.toLocaleString()} NT$
                                </div>
                                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                                  費 ${costDetails.buyCommissionTWD + costDetails.sellCommissionTWD} | 稅 ${costDetails.sellTaxTWD}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Stacked Dividend Yield & Annual Income */}
                          <td className="p-3 text-right font-mono whitespace-nowrap">
                            <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-xs">
                              {divInfo.dividendYieldPct.toFixed(2)}%
                            </span>
                            <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                              年領 {formatMoney(divInfo.annualIncomeTWD, isPrivacy)}
                            </div>
                          </td>

                          {/* Subtle chevron indicator */}
                          <td className="p-3 text-right text-slate-300 group-hover:text-indigo-600 transition-colors w-8">
                            <ChevronRight className="w-4 h-4 ml-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Table View (Optimized Clean 4-Column Layout, Click Row for Actions) */}
              <div className="block sm:hidden rounded-xl border border-slate-200 bg-white shadow-2xs w-full overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider font-mono">
                      <th className="p-2.5 whitespace-nowrap">
                        標的 / 代號
                      </th>
                      <th className="p-2.5 text-right whitespace-nowrap">現價 / 均價</th>
                      <th className="p-2.5 text-right whitespace-nowrap">總市值 / 損益</th>
                      <th className="p-2.5 text-right whitespace-nowrap">殖利率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                    {filteredPortfolio.map((item) => {
                      const isUS = item.market === 'us';
                      const buyFx = isUS ? item.buyRate || usdTwdRate : 1;
                      const marketFx = isUS ? usdTwdRate : 1;
                      const safePrice = typeof item.price === 'number' && item.price > 0 ? item.price : null;

                      const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);
                      const pendingShares = divInfo.pendingStockShares || 0;
                      const effectiveShares = isExAdjustedMode ? item.shares + pendingShares : item.shares;

                      const itemCostTWD = item.shares * item.cost * buyFx;
                      const itemMarketValTWD = safePrice === null ? null : effectiveShares * safePrice * marketFx;

                      const costDetails = calculateTransactionCost(item, usdTwdRate, localDiscount);
                      const netProfitColorClass =
                        costDetails.netProfitTWD >= 0 ? getUpColor() : getDownColor();

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            playClickSound();
                            setDetailModalStock(item);
                          }}
                          className="hover:bg-indigo-50/40 active:bg-indigo-50/60 cursor-pointer transition text-slate-800"
                        >
                          {/* Stacked Symbol & Name */}
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="font-extrabold text-slate-900 truncate max-w-[105px] text-xs leading-tight">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 py-0.2 rounded text-[9px]">
                                  {item.symbol}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">
                                  {item.market}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Stacked Price & Shares/Cost */}
                          <td className="p-2.5 text-right font-mono whitespace-nowrap">
                            <div className="font-black text-slate-900 text-xs">
                              {safePrice === null ? '--' : `$${safePrice}`}
                            </div>
                            <div className="text-[9px] text-slate-500">
                              {item.shares}股 · ${item.cost}
                            </div>
                            {isExAdjustedMode && pendingShares > 0 && (
                              <div className="text-[8px] font-bold text-emerald-800 bg-emerald-50 px-1 rounded border border-emerald-200 inline-block">
                                +{pendingShares}
                              </div>
                            )}
                          </td>

                          {/* Stacked Market Value & Net Profit */}
                          <td className="p-2.5 text-right font-mono whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-xs">
                              {itemMarketValTWD === null ? '--' : formatMoney(itemMarketValTWD, isPrivacy)}
                            </div>
                            <div className={`text-[9px] font-bold ${netProfitColorClass}`}>
                              {safePrice === null
                                ? '--'
                                : `${costDetails.netProfitTWD >= 0 ? '+' : ''}${formatMoney(costDetails.netProfitTWD, isPrivacy)} (${costDetails.netRoiPct >= 0 ? '+' : ''}${costDetails.netRoiPct.toFixed(1)}%)`}
                            </div>
                          </td>

                          {/* Stacked Dividend Yield & Income */}
                          <td className="p-2.5 text-right font-mono whitespace-nowrap">
                            <div className="text-emerald-700 font-bold text-xs">
                              {divInfo.dividendYieldPct.toFixed(1)}%
                            </div>
                            <div className="text-[9px] text-slate-500">
                              年領 {formatMoney(divInfo.annualIncomeTWD, isPrivacy)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* MODE 2: VISUAL CARDS FEED VIEW */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPortfolio.map((item) => {
                const isUS = item.market === 'us';
                const buyFx = isUS ? item.buyRate || usdTwdRate : 1;
                const marketFx = isUS ? usdTwdRate : 1;
                const safePrice = typeof item.price === 'number' && item.price > 0 ? item.price : null;

                const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);
                const pendingShares = divInfo.pendingStockShares || 0;
                const effectiveShares = isExAdjustedMode ? item.shares + pendingShares : item.shares;

                const itemCostTWD = item.shares * item.cost * buyFx;
                const itemMarketValTWD = safePrice === null ? null : effectiveShares * safePrice * marketFx;
                const itemProfitTWD = itemMarketValTWD === null ? null : itemMarketValTWD - itemCostTWD;

                const costDetails = calculateTransactionCost(item, usdTwdRate, localDiscount);

                const netProfitColorClass =
                  costDetails.netProfitTWD >= 0 ? getUpColor() : getDownColor();

                const hasCashDiv = divInfo.singleDividendPerShare > 0;
                const hasStockDiv = typeof divInfo.stockDps === 'number' && divInfo.stockDps > 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      playClickSound();
                      setDetailModalStock(item);
                    }}
                    className="glass-card p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-300 transition space-y-3 relative group cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition truncate max-w-[140px] xs:max-w-[200px] flex items-center gap-1">
                            <span>{item.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition shrink-0" />
                          </h3>
                          <span className="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                            {item.symbol}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 uppercase">
                            {item.market}
                          </span>
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-500 font-mono font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{item.shares.toLocaleString()} 股</span>
                          <span>｜</span>
                          <span>均價 ${item.cost}</span>
                          {isExAdjustedMode && pendingShares > 0 && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                              +{pendingShares.toLocaleString()} 待撥
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-sm sm:text-base font-black text-slate-900">
                          {safePrice === null ? '--' : `$${safePrice}`}
                        </div>
                        <div
                          className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-0.5 mt-0.5 ${
                            costDetails.netRoiPct === null
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : costDetails.netRoiPct >= 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {safePrice === null ? '--' : `${costDetails.netRoiPct >= 0 ? '+' : ''}${costDetails.netRoiPct.toFixed(2)}%`}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold block truncate">估計市值 (TWD)</span>
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate block">
                          {itemMarketValTWD === null ? '--' : formatMoney(itemMarketValTWD, isPrivacy)}
                        </span>
                      </div>
                      <div className="text-right min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold block truncate">未實現獲利 (淨損益)</span>
                        <span className={`font-mono font-bold text-xs sm:text-sm truncate block ${netProfitColorClass}`}>
                          {safePrice === null ? '--' : `${costDetails.netProfitTWD >= 0 ? '+' : ''}${formatMoney(costDetails.netProfitTWD, isPrivacy)}`}
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/80 border border-emerald-100 p-2.5 sm:p-3 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-emerald-950 font-bold flex-wrap gap-1">
                        <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          殖利率 {divInfo.dividendYieldPct.toFixed(2)}% ({divInfo.frequency})
                        </span>
                        <span className="font-mono text-emerald-800 font-bold text-[11px] sm:text-xs shrink-0">
                          年領 {formatMoney(divInfo.annualIncomeTWD, isPrivacy)}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-emerald-800 font-medium flex items-center justify-between flex-wrap gap-1">
                        <span className="truncate">
                          單次配息：{hasCashDiv ? `$${divInfo.singleDividendPerShare}元` : '依公告'}
                          {hasStockDiv ? ` + 配股 ${divInfo.stockDps}元` : ''}
                        </span>
                        {(divInfo.exactExDate || divInfo.nextExMonthStr) && (
                          <span className="font-mono text-emerald-800 font-bold shrink-0">
                            除息日：{divInfo.exactExDate || divInfo.nextExMonthStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE 3: PORTFOLIO WEIGHT & ROI HEATMAP VIEW */}
          {viewMode === 'heatmap' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>區塊面積代表持股佔總資產比例（點擊可查看詳情與校正）</span>
                <span className="font-mono font-bold text-indigo-600">總部位 {filteredPortfolio.length} 檔</span>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredPortfolio.map((item) => {
                  const isUS = item.market === 'us';
                  const buyFx = isUS ? item.buyRate || usdTwdRate : 1;
                  const marketFx = isUS ? usdTwdRate : 1;
                  const safePrice = typeof item.price === 'number' && item.price > 0 ? item.price : item.cost;

                  const itemCostTWD = item.shares * item.cost * buyFx;
                  const itemMarketValTWD = item.shares * safePrice * marketFx;
                  const weightPct = totalPortfolioValueTWD > 0 ? (itemMarketValTWD / totalPortfolioValueTWD) * 100 : 0;
                  const itemProfitTWD = itemMarketValTWD - itemCostTWD;
                  const itemRoi = itemCostTWD > 0 ? (itemProfitTWD / itemCostTWD) * 100 : 0;

                  const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);

                  const isPositive = itemRoi >= 0;
                  const bgGradient = isPositive
                    ? 'from-emerald-500/10 via-emerald-500/5 to-white border-emerald-300'
                    : 'from-rose-500/10 via-rose-500/5 to-white border-rose-300';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        playClickSound();
                        setDetailModalStock(item);
                      }}
                      className={`p-4 rounded-2xl border bg-gradient-to-br ${bgGradient} hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-mono font-bold text-indigo-700">{item.symbol}</div>
                          <div className="text-base font-black text-slate-900 truncate">{item.name}</div>
                        </div>
                        <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-800 shadow-2xs">
                          {weightPct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-mono font-bold text-slate-700 flex justify-between">
                          <span>價值</span>
                          <span>{formatMoney(itemMarketValTWD, isPrivacy)}</span>
                        </div>
                        <div className="text-xs font-mono font-bold flex justify-between">
                          <span>報酬率</span>
                          <span className={isPositive ? getUpColor() : getDownColor()}>
                            {isPositive ? '+' : ''}{itemRoi.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-800 flex justify-between">
                          <span>殖利率</span>
                          <span>{divInfo.dividendYieldPct.toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, Math.max(5, weightPct * 2))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detailModalStock && (
        <StockDetailModal
          isOpen={!!detailModalStock}
          stock={detailModalStock}
          usdTwdRate={usdTwdRate}
          isPrivacy={isPrivacy}
          isRedUp={isRedUp}
          officialEvents={officialEvents}
          brokerDiscount={localDiscount}
          onClose={() => setDetailModalStock(null)}
          onOpenChart={onSelectChartTarget}
          onOpenTxHistory={onOpenTxHistory}
          onOpenEditModal={onOpenEditModal}
          onDeleteStock={onDeleteStock}
          onApplyPendingStockShares={onApplyPendingStockShares}
          onDeductCashDividendCost={onDeductCashDividendCost}
        />
      )}
    </div>
  );
};
