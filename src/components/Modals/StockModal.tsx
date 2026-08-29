import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Search, Loader2, X, Check, Sparkles, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import { StockPosition, MarketType } from '../../types';
import { searchLocalDictionary, lookupStockInfo } from '../../data/stockDictionary';
import { playClickSound, playCoinSound } from '../../utils/audio';
import { apiFetchQuotes, apiSearchStock } from '../../utils/apiClient';
import { useScrollLock } from '../../utils/scrollLock';

interface StockModalProps {
  isOpen: boolean;
  editStock: StockPosition | null;
  usdTwdRate: number;
  onClose: () => void;
  onSave: (stockData: {
    editId: string;
    symbol: string;
    name: string;
    market: MarketType;
    shares: number;
    cost: number;
    buyDate: string;
    buyRate: number;
  }) => void;
}

export const StockModal: React.FC<StockModalProps> = ({
  isOpen,
  editStock,
  usdTwdRate,
  onClose,
  onSave,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [market, setMarket] = useState<MarketType>('tse');
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [buyRate, setBuyRate] = useState('');
  const [livePrice, setLivePrice] = useState<string>('--');
  const [rawLivePriceNum, setRawLivePriceNum] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; market: MarketType }>>([]);
  const [showResults, setShowResults] = useState(false);

  // Lock background window scrolling whenever modal is open
  useScrollLock(isOpen);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchQueryRef = useRef<string>('');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (editStock) {
      setSymbol(editStock.symbol);
      setName(editStock.name);
      setMarket(editStock.market);
      setShares(String(editStock.shares));
      setCost(String(editStock.cost));
      setBuyDate(editStock.buyDate || new Date().toISOString().slice(0, 10));
      setBuyRate(String(editStock.buyRate || usdTwdRate));
      setSearchInput(`${editStock.symbol} ${editStock.name}`);
      fetchLivePreview(editStock.symbol, editStock.market);
    } else {
      setSymbol('');
      setName('');
      setMarket('tse');
      setShares('');
      setCost('');
      setBuyDate(new Date().toISOString().slice(0, 10));
      setBuyRate(String(usdTwdRate || 31.5));
      setSearchInput('');
      setLivePrice('--');
      setRawLivePriceNum(null);
    }
  }, [editStock, usdTwdRate, isOpen]);

  const fetchLivePreview = async (sym: string, mkt: MarketType) => {
    if (!sym) return;
    setLivePrice('查詢中...');

    // Auto fill name if matched from dictionary
    const info = lookupStockInfo(sym);
    if (info) {
      setName(info.name);
      setMarket(info.market);
    }

    try {
      const s = mkt === 'tse' ? `${sym}.TW` : mkt === 'otc' ? `${sym}.TWO` : sym;
      const quotes = await apiFetchQuotes([s]);
      const q = quotes?.[0];
      if (q && typeof q.regularMarketPrice === 'number') {
        const p = q.regularMarketPrice;
        setRawLivePriceNum(p);
        setLivePrice(`$${p} ${mkt === 'us' ? 'USD' : 'NT$'}`);
        if (q.shortName) {
          const isTaiwanStock = mkt === 'tse' || mkt === 'otc' || /^\d{4,6}[A-Z]?$/i.test(sym);
          const isAsciiName = /^[A-Za-z0-9\s.,&'-]+$/.test(q.shortName);
          if (!isTaiwanStock || !isAsciiName || !info) {
            setName((prevName) => {
              if (!prevName || prevName.startsWith('台股標的') || prevName.startsWith('美股標的') || prevName.startsWith('搜尋') || prevName === sym) {
                return (isTaiwanStock && isAsciiName && info) ? info.name : q.shortName!;
              }
              return prevName;
            });
          }
        }
      } else {
        setLivePrice('無即時報價');
        setRawLivePriceNum(null);
      }

      if (!info && (!name || name.startsWith('台股標的') || name.startsWith('美股標的') || name.startsWith('搜尋') || name === sym)) {
        const searchRes = await apiSearchStock(sym);
        const matched = searchRes.find((r) => r.symbol.toUpperCase() === sym.toUpperCase()) || searchRes[0];
        if (matched && matched.name && !matched.name.startsWith('台股標的') && !matched.name.startsWith('美股標的') && !matched.name.startsWith('搜尋') && matched.name !== sym) {
          setName(matched.name);
          setMarket(matched.market);
          setSearchInput(`${matched.symbol} | ${matched.name}`);
        }
      }
    } catch {
      setLivePrice('查詢逾時');
      setRawLivePriceNum(null);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    lastSearchQueryRef.current = val;

    if (!val.trim()) {
      setShowResults(false);
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setShowResults(true);

    const instantLocal = searchLocalDictionary(val, 10);
    if (instantLocal.length > 0) {
      setSearchResults(instantLocal);
    }

    setIsSearching(true);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      const currentQ = val;
      try {
        const results = await apiSearchStock(currentQ);
        if (lastSearchQueryRef.current === currentQ) {
          if (Array.isArray(results)) {
            setSearchResults(results.slice(0, 10));
          }
        }
      } catch {
        // keep local results
      } finally {
        if (lastSearchQueryRef.current === currentQ) {
          setIsSearching(false);
        }
      }
    }, 120);
  };

  const selectSuggestion = (sSymbol: string, sName: string, sMarket: MarketType) => {
    playClickSound();
    setSymbol(sSymbol);
    const isPlaceholder = !sName || sName.startsWith('台股標的') || sName.startsWith('美股標的') || sName.startsWith('搜尋');
    const display = isPlaceholder ? '' : sName;
    setName(display);
    setMarket(sMarket);
    setSearchInput(display ? `${sSymbol} | ${display}` : sSymbol);
    setShowResults(false);
    fetchLivePreview(sSymbol, sMarket);
  };

  const addShares = (amount: number) => {
    playCoinSound();
    const current = parseFloat(shares) || 0;
    const next = current + amount;
    setShares(String(next));
  };

  const fillMarketPrice = () => {
    if (rawLivePriceNum !== null && rawLivePriceNum > 0) {
      playClickSound();
      setCost(String(rawLivePriceNum));
    }
  };

  const costNum = parseFloat(cost) || 0;
  const sharesNum = parseFloat(shares) || 0;
  const currency = market === 'us' ? 'USD' : 'NT$';
  const totalCost = costNum * sharesNum;
  const totalCostTwd = market === 'us' ? totalCost * (parseFloat(buyRate) || usdTwdRate) : totalCost;

  const tpPrice = costNum > 0 ? `$${(costNum * 1.1).toFixed(2)}` : '--';
  const slPrice = costNum > 0 ? `$${(costNum * 0.95).toFixed(2)}` : '--';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      alert('請先搜尋並選擇股票標的');
      return;
    }
    onSave({
      editId: editStock ? editStock.id : '',
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim().toUpperCase(),
      market,
      shares: Number(shares),
      cost: Number(cost),
      buyDate: buyDate || new Date().toISOString().slice(0, 10),
      buyRate: market === 'us' ? Number(buyRate) || usdTwdRate : 1,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-slate-100 z-[99] flex flex-col text-slate-900 animate-in fade-in duration-200 select-none">
      {/* 1. 滿版頂部導航 Header */}
      <header className="w-full bg-white border-b border-slate-200 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition active:scale-95 flex items-center justify-center"
            title="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-indigo-600 inline-block shrink-0" />
              <span>{editStock ? '編輯持股部位' : '新增監控持股'}</span>
            </h2>
            <p className="text-[10.5px] text-slate-500 font-medium leading-none mt-0.5 hidden sm:block">
              台股上市/上櫃與美股 · 即時報價與損益自動聯動
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* 2. 核心表單 Body - 緊湊自然的卡片流式佈局 */}
      <main className="w-full max-w-lg mx-auto flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 modal-content-scroll">
        <form id="stock-position-form" onSubmit={handleSubmit} className="space-y-3">
          
          {/* (A) 智慧標的搜尋列 */}
          <div ref={searchContainerRef} className="relative bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" /> 智慧搜尋標的 (台股/美股)
              </label>
              {isSearching && (
                <span className="text-[9.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-indigo-100">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> 搜尋中
                </span>
              )}
            </div>
            
            <div className="relative">
              <input
                type="text"
                inputMode="search"
                enterKeyHint="done"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                      const top = searchResults[0];
                      selectSuggestion(top.symbol, top.name, top.market);
                    } else if (searchInput.trim()) {
                      const parts = searchInput.split(/[|\s]+/);
                      const sym = parts[0]?.trim();
                      const n = parts[1]?.trim() || sym;
                      if (sym) {
                        selectSuggestion(sym, n, market);
                      }
                    }
                    (e.target as HTMLElement).blur();
                  }
                }}
                onFocus={() => {
                  if (searchInput.trim()) {
                    setShowResults(true);
                    if (searchResults.length === 0) {
                      const local = searchLocalDictionary(searchInput, 10);
                      if (local.length > 0) setSearchResults(local);
                    }
                  }
                }}
                placeholder="輸入代號/名稱 (如 2330 / NVDA / 蘋果)"
                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-slate-900 font-bold outline-none text-base sm:text-xs focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-100 transition truncate"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setShowResults(false);
                    setSearchResults([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 下拉聯想選單 */}
            {showResults && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 ring-1 ring-black/5">
                {searchResults.length === 0 ? (
                  <div className="p-2.5 text-xs text-slate-500 text-center font-medium">
                    找不到符合標的，可在下方手動輸入代號與名稱
                  </div>
                ) : (
                  searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(item.symbol, item.name, item.market)}
                      className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-slate-900 truncate">{item.name}</span>
                        <span className="text-indigo-600 font-mono font-bold shrink-0">{item.symbol}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 uppercase ${
                        item.market === 'us' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {item.market === 'us' ? '美股' : item.market === 'otc' ? '上櫃' : '上市'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* (B) 標的資訊整合卡片 (市場、代號、名稱 + 參考價) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4 sm:col-span-3">
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">市場類別</label>
                <select
                  value={market}
                  onChange={(e) => {
                    playClickSound();
                    const m = e.target.value as MarketType;
                    setMarket(m);
                    fetchLivePreview(symbol, m);
                  }}
                  className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-indigo-700 font-bold outline-none text-xs focus:border-indigo-600 focus:bg-white truncate"
                >
                  <option value="tse">台股上市</option>
                  <option value="otc">台股上櫃</option>
                  <option value="us">美股</option>
                </select>
              </div>

              <div className="col-span-3 sm:col-span-4">
                <label className="block text-slate-700 font-bold mb-1 text-[11px] truncate">股票代號 *</label>
                <input
                  type="text"
                  required
                  enterKeyHint="next"
                  value={symbol}
                  onChange={(e) => {
                    const s = e.target.value.toUpperCase();
                    setSymbol(s);
                    fetchLivePreview(s, market);
                  }}
                  placeholder="2330"
                  className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-900 font-mono font-bold uppercase outline-none text-base sm:text-xs focus:border-indigo-600 focus:bg-white truncate"
                />
              </div>

              <div className="col-span-5 sm:col-span-5">
                <label className="block text-slate-700 font-bold mb-1 text-[11px] truncate">股票名稱 *</label>
                <input
                  type="text"
                  required
                  enterKeyHint="next"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="台積電"
                  className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-900 font-bold outline-none text-base sm:text-xs focus:border-indigo-600 focus:bg-white truncate"
                />
              </div>
            </div>

            {/* 即時參考價與即期匯率條 */}
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px] leading-tight">
              <span className="text-slate-500">
                參考價: <strong className="text-indigo-700 font-mono font-bold">{livePrice}</strong>
              </span>
              <span className="text-slate-500">
                匯率: <strong className="text-amber-700 font-mono font-bold">{usdTwdRate.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          {/* (C) 持有股數與買入均價 (雙欄極致對稱) */}
          <div className="grid grid-cols-2 gap-2">
            {/* 持有股數卡 */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5">
              <div className="flex justify-between items-center leading-none">
                <label className="text-slate-800 font-bold text-[11px] truncate">
                  持有股數 *
                </label>
                {sharesNum > 0 && market !== 'us' && (
                  <span className="text-[10px] text-indigo-600 font-bold font-mono">
                    約{(sharesNum / 1000).toFixed(1)}張
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0.0001"
                required
                enterKeyHint="next"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="例: 1000"
                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-900 outline-none text-base sm:text-xs font-mono font-bold tabular-nums focus:border-indigo-600 focus:bg-white transition"
              />
              {/* 快捷股數按鈕 */}
              <div className="flex items-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => addShares(1000)}
                  className="flex-1 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 rounded text-[10px] font-bold font-mono transition active:scale-95"
                >
                  +1張
                </button>
                <button
                  type="button"
                  onClick={() => addShares(500)}
                  className="flex-1 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 rounded text-[10px] font-bold font-mono transition active:scale-95"
                >
                  +500
                </button>
                <button
                  type="button"
                  onClick={() => addShares(100)}
                  className="flex-1 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 rounded text-[10px] font-bold font-mono transition active:scale-95"
                >
                  +100
                </button>
                {shares && (
                  <button
                    type="button"
                    onClick={() => setShares('')}
                    className="px-1 py-0.5 text-slate-400 hover:text-rose-500 text-[10px] font-medium"
                  >
                    清空
                  </button>
                )}
              </div>
            </div>

            {/* 買入均價卡 */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5">
              <div className="flex justify-between items-center leading-none">
                <label className="text-slate-800 font-bold text-[11px] truncate">
                  買入均價 ({currency}) *
                </label>
                {rawLivePriceNum !== null && rawLivePriceNum > 0 && (
                  <button
                    type="button"
                    onClick={fillMarketPrice}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 active:scale-95 shrink-0"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> 填現價
                  </button>
                )}
              </div>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                required
                enterKeyHint="next"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="配股填 0"
                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-900 outline-none text-base sm:text-xs font-mono font-bold tabular-nums focus:border-indigo-600 focus:bg-white transition"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5 leading-none">
                <span>停利:<strong className="text-emerald-600 font-mono ml-0.5 font-bold">{tpPrice}</strong></span>
                <span>停損:<strong className="text-rose-600 font-mono ml-0.5 font-bold">{slPrice}</strong></span>
              </div>
            </div>
          </div>

          {/* (D) 買入日期與當時匯率 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 overflow-hidden">
              <label className="block text-slate-700 font-bold text-[11px] flex items-center gap-1 leading-none truncate">
                <Calendar className="w-3 h-3 text-indigo-600 shrink-0" /> 交易日期
              </label>
              <input
                type="date"
                enterKeyHint="done"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0 text-slate-900 outline-none text-base sm:text-xs font-mono tabular-nums focus:border-indigo-600 focus:bg-white transition block max-w-full truncate"
              />
            </div>

            {market === 'us' ? (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 shadow-2xs space-y-1.5 overflow-hidden">
                <label className="block text-amber-950 font-bold text-[11px] flex items-center gap-1 leading-none truncate">
                  <DollarSign className="w-3 h-3 text-amber-600 shrink-0" /> 美股匯率 (USD)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  enterKeyHint="done"
                  value={buyRate}
                  onChange={(e) => setBuyRate(e.target.value)}
                  placeholder="32.15"
                  className="w-full h-8 bg-white border border-amber-300 rounded-lg px-2 py-0 text-amber-900 font-bold outline-none text-base sm:text-xs font-mono tabular-nums focus:border-amber-500 block max-w-full truncate"
                />
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 overflow-hidden">
                <span className="block text-slate-600 font-bold text-[11px] leading-none truncate">計價幣別說明</span>
                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 text-xs font-bold flex justify-between items-center truncate">
                  <span>新台幣 (TWD)</span>
                  <span className="text-[10px] text-slate-400 font-normal">無匯率換算</span>
                </div>
              </div>
            )}
          </div>

          {/* (E) 總投入本金精準摘要卡 */}
          <div className="bg-gradient-to-r from-indigo-50 via-indigo-50/60 to-white border border-indigo-100 rounded-xl px-3.5 py-2.5 flex justify-between items-center shadow-2xs">
            <span className="text-indigo-950 font-bold text-xs">預估投入總本金</span>
            <div className="text-right">
              <span className="font-black font-mono text-indigo-700 text-sm">
                {market === 'us' 
                  ? `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` 
                  : `NT$ ${Math.round(totalCost).toLocaleString()}`}
              </span>
              {market === 'us' && (
                <span className="ml-1.5 text-[11px] text-slate-500 font-mono">
                  (約 NT$ {Math.round(totalCostTwd).toLocaleString()})
                </span>
              )}
            </div>
          </div>

          {/* (F) 底部操作按鈕 (放於表單流內，不懸浮遮擋鍵盤) */}
          <div className="pt-2 pb-6 sm:pb-8 flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="w-1/3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition active:scale-98 shadow-2xs flex items-center justify-center"
            >
              取消
            </button>
            <button
              type="submit"
              className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-200 active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>確認儲存部位</span>
            </button>
          </div>

        </form>
      </main>
    </div>
  );
};

