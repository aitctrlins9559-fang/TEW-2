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
  Globe,
  Table as TableIcon,
  LayoutGrid,
  Grid,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { StockPosition } from '../types';
import { formatMoney } from '../utils/format';
import { playClickSound } from '../utils/audio';
import { getStockDividendInfo } from '../utils/dividendHelper';
import { StockDetailModal } from './Modals/StockDetailModal';

interface StockTableProps {
  portfolio: StockPosition[];
  usdTwdRate: number;
  isAdmin: boolean;
  isPrivacy: boolean;
  isRedUp: boolean;
  officialEvents?: Record<string, { exDate: string; amount: number; stockDps?: number }>;
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
  const dataMenuRef = useRef<HTMLDivElement>(null);

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
    <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
      {/* Table / Feed Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/15 font-bold">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              持股部位終端 (Terminal Engine)
              <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-indigo-100">
                {filteredPortfolio.length} / {portfolio.length} 檔
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">支援多維度數據表格、圖卡與部位權重熱力圖切換</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View Mode Switcher (Table vs Cards vs Heatmap) */}
          <div className="flex items-center p-1 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold">
            <button
              onClick={() => {
                playClickSound();
                setViewMode('table');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="表格檢視"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">專業表格</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setViewMode('cards');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="圖卡檢視"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">視覺圖卡</span>
            </button>
            <button
              onClick={() => {
                playClickSound();
                setViewMode('heatmap');
              }}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                viewMode === 'heatmap' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="熱力比例圖"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">權重熱力圖</span>
            </button>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onOpenAddModal();
            }}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 btn-interact shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新增</span>
          </button>

          {/* Data Management Dropdown */}
          <div className="relative" ref={dataMenuRef}>
            <button
              onClick={() => {
                playClickSound();
                setIsDataMenuOpen((prev) => !prev);
              }}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 btn-interact"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDataMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDataMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 text-xs">
                <button
                  onClick={() => {
                    playClickSound();
                    setIsDataMenuOpen(false);
                    onExportData();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition"
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
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition"
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
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 text-emerald-700 font-bold transition"
                  >
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>同步至全域雲端</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Toolbar: Filter Tabs, Search & Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              setFilterTab('all');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
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
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
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
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              filterTab === 'us'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            美股 ({counts.us})
          </button>
        </div>

        {/* Search & Sort controls */}
        <div className="flex flex-wrap items-center gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1 min-w-[130px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋名稱或代號..."
              className="w-full glass-input rounded-xl pl-9 pr-8 py-1.5 text-xs placeholder-slate-400 border-slate-300 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => toggleSort('value')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition shrink-0 ${
              sortField === 'value' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="依市值排序"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>市值</span>
          </button>

          <button
            onClick={() => toggleSort('roi')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition shrink-0 ${
              sortField === 'roi' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="依報酬率排序"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>報酬</span>
          </button>

          <button
            onClick={() => toggleSort('yield')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition shrink-0 ${
              sortField === 'yield' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="依殖利率排序"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>殖利率</span>
          </button>
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
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[780px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/90 uppercase tracking-wider font-mono">
                    <th className="p-3.5 whitespace-nowrap">標的代號 / 名稱</th>
                    <th className="p-3.5 whitespace-nowrap">市場</th>
                    <th className="p-3.5 text-right whitespace-nowrap">持有股數 / 成本</th>
                    <th className="p-3.5 text-right whitespace-nowrap">即時現價</th>
                    <th className="p-3.5 text-right whitespace-nowrap">估計總市值 (TWD)</th>
                    <th className="p-3.5 text-right whitespace-nowrap">未實現損益 / ROI</th>
                    <th className="p-3.5 text-right whitespace-nowrap">殖利率 (預估年領)</th>
                    <th className="p-3.5 text-center whitespace-nowrap">快捷操作</th>
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
                    const itemRoi = itemCostTWD > 0 && itemProfitTWD !== null ? (itemProfitTWD / itemCostTWD) * 100 : null;

                    const profitColorClass =
                      itemProfitTWD === null ? 'text-slate-400' : itemProfitTWD >= 0 ? getUpColor() : getDownColor();

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          playClickSound();
                          setDetailModalStock(item);
                        }}
                        className="hover:bg-indigo-50/40 cursor-pointer transition text-slate-800"
                      >
                        {/* Name & Symbol */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md shrink-0">
                              {item.symbol}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm hover:text-indigo-600 transition whitespace-nowrap">
                              {item.name}
                            </span>
                          </div>
                        </td>

                        {/* Market Badge */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                            {item.market}
                          </span>
                        </td>

                        {/* Shares & Cost */}
                        <td className="p-3.5 text-right font-mono whitespace-nowrap">
                          <div className="font-bold text-slate-900">{item.shares.toLocaleString()} 股</div>
                          {isExAdjustedMode && pendingShares > 0 && (
                            <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5" title="除權待撥股數：已算入估值與損益平準">
                              +{pendingShares.toLocaleString()} 待撥
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500">均價 ${item.cost}</div>
                        </td>

                        {/* Price */}
                        <td className="p-3.5 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                          {safePrice === null ? '--' : `$${safePrice}`}
                        </td>

                        {/* Market Value */}
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                          {itemMarketValTWD === null ? '--' : formatMoney(itemMarketValTWD, isPrivacy)}
                        </td>

                        {/* P&L & ROI */}
                        <td className="p-3.5 text-right font-mono whitespace-nowrap">
                          <div className={`font-black ${profitColorClass}`}>
                            {itemProfitTWD === null ? '--' : `${itemProfitTWD >= 0 ? '+' : ''}${formatMoney(itemProfitTWD, isPrivacy)}`}
                          </div>
                          <div className={`text-[11px] font-bold ${profitColorClass}`}>
                            {itemRoi === null ? '--' : `${itemRoi >= 0 ? '+' : ''}${itemRoi.toFixed(2)}%`}
                          </div>
                        </td>

                        {/* Dividend Yield */}
                        <td className="p-3.5 text-right font-mono whitespace-nowrap">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {divInfo.dividendYieldPct.toFixed(2)}%
                          </span>
                          <div className="text-[10px] text-emerald-800 font-bold mt-1">
                            年領 {formatMoney(divInfo.annualIncomeTWD, isPrivacy)}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {pendingShares > 0 && onApplyPendingStockShares && (
                              <button
                                onClick={() => {
                                  playClickSound();
                                  onApplyPendingStockShares(item.id);
                                }}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1 text-[10px] font-bold px-2 shadow-xs"
                                title={`一鍵將 +${pendingShares} 股配股撥入持股總數`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>撥入 +{pendingShares}股</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                playClickSound();
                                onOpenEditModal(item.id);
                              }}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                              title="校正股息"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                playClickSound();
                                onOpenTxHistory(item.id);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                              title="交易紀錄"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                playClickSound();
                                onSelectChartTarget(item.symbol, item.market === 'us' ? 'us' : 'tse', item.name);
                              }}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                              title="K線走勢"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                playClickSound();
                                onDeleteStock(item.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="刪除部位"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* MODE 2: VISUAL CARDS FEED VIEW */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPortfolio.map((item) => {
                const isUS = item.market === 'us';
                const buyFx = isUS ? item.buyRate || usdTwdRate : 1;
                const marketFx = isUS ? usdTwdRate : 1;
                const safePrice = typeof item.price === 'number' && item.price > 0 ? item.price : null;

                const itemCostTWD = item.shares * item.cost * buyFx;
                const itemMarketValTWD = safePrice === null ? null : item.shares * safePrice * marketFx;
                const itemProfitTWD = itemMarketValTWD === null ? null : itemMarketValTWD - itemCostTWD;
                const itemRoi = itemCostTWD > 0 && itemProfitTWD !== null ? (itemProfitTWD / itemCostTWD) * 100 : null;

                const profitColorClass =
                  itemProfitTWD === null ? 'text-slate-400' : itemProfitTWD >= 0 ? getUpColor() : getDownColor();

                const divInfo = getStockDividendInfo(item, usdTwdRate, officialEvents?.[item.symbol.toUpperCase()]);
                const hasCashDiv = divInfo.singleDividendPerShare > 0;
                const hasStockDiv = typeof divInfo.stockDps === 'number' && divInfo.stockDps > 0;

                return (
                  <div
                    key={item.id}
                    className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition space-y-3.5 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => {
                          playClickSound();
                          setDetailModalStock(item);
                        }}
                        className="cursor-pointer min-w-0 flex-1"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition truncate">
                            {item.name}
                          </h3>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 uppercase">
                            {item.market}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono font-semibold mt-1">
                          {item.shares.toLocaleString()} 股 ｜ 建倉均價 ${item.cost}
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-base font-black text-slate-900">
                          {safePrice === null ? '--' : `$${safePrice}`}
                        </div>
                        <div
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1 mt-0.5 ${
                            itemRoi === null
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : itemRoi >= 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {itemRoi === null ? '--' : `${itemRoi >= 0 ? '+' : ''}${itemRoi.toFixed(2)}%`}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">市值總額 (TWD)</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {itemMarketValTWD === null ? '--' : formatMoney(itemMarketValTWD, isPrivacy)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">未實現獲利</span>
                        <span className={`font-mono font-bold text-sm ${profitColorClass}`}>
                          {itemProfitTWD === null ? '--' : `${itemProfitTWD >= 0 ? '+' : ''}${formatMoney(itemProfitTWD, isPrivacy)}`}
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/80 border border-emerald-100 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-emerald-950 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          殖利率 {divInfo.dividendYieldPct.toFixed(2)}% ({divInfo.frequency})
                        </span>
                        <span className="font-mono text-emerald-800 font-bold">
                          預估年領 {formatMoney(divInfo.annualIncomeTWD, isPrivacy)}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-between">
                        <span>
                          單次配息：{hasCashDiv ? `$${divInfo.singleDividendPerShare}元` : '依公告'}
                          {hasStockDiv ? ` + 配股 ${divInfo.stockDps}元` : ''}
                        </span>
                        {(divInfo.exactExDate || divInfo.nextExMonthStr) && (
                          <span className="font-mono text-emerald-800 font-bold">
                            除息日：{divInfo.exactExDate || divInfo.nextExMonthStr}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          onOpenEditModal(item.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-100 flex items-center gap-1 transition btn-interact"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>校正股息</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          onOpenTxHistory(item.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 flex items-center gap-1 transition btn-interact"
                      >
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span>交易</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          onSelectChartTarget(item.symbol, item.market === 'us' ? 'us' : 'tse', item.name);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 flex items-center gap-1 transition btn-interact"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>K線</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          onDeleteStock(item.id);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition btn-interact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
