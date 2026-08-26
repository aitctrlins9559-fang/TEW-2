import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Search, Loader2, Target, X } from 'lucide-react';
import { StockPosition, MarketType } from '../../types';
import { BUILTIN_STOCK_DICTIONARY, searchLocalDictionary, lookupStockInfo } from '../../data/stockDictionary';
import { playClickSound } from '../../utils/audio';
import { apiFetchQuotes, apiSearchStock } from '../../utils/apiClient';

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
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; market: MarketType }>>([]);
  const [showResults, setShowResults] = useState(false);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        setLivePrice(`$${q.regularMarketPrice} ${mkt === 'us' ? 'USD' : 'NT$'}`);
        if (q.shortName) {
          setName((prevName) => {
            if (!prevName || prevName.startsWith('台股標的') || prevName.startsWith('美股標的') || prevName.startsWith('搜尋') || prevName === sym) {
              return q.shortName!;
            }
            return prevName;
          });
        }
      } else {
        setLivePrice('無即時報價');
      }

      // If name is still missing or placeholder, perform search lookup
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
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (!val.trim()) {
      setShowResults(false);
      setSearchResults([]);
      return;
    }

    setShowResults(true);

    // Instant local dictionary lookup first
    const instantLocal = searchLocalDictionary(val, 8);
    if (instantLocal.length > 0) {
      setSearchResults(instantLocal);
    }

    setIsSearching(true);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await apiSearchStock(val);
        if (Array.isArray(results) && results.length > 0) {
          setSearchResults(results.slice(0, 8));
        }
      } catch {
        // keep local results if any
      } finally {
        setIsSearching(false);
      }
    }, 150);
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

  const costNum = parseFloat(cost) || 0;
  const currency = market === 'us' ? 'USD' : 'NT$';
  const tpPrice = costNum > 0 ? `$${(costNum * 1.1).toFixed(2)} ${currency}` : '--';
  const slPrice = costNum > 0 ? `$${(costNum * 0.95).toFixed(2)} ${currency}` : '--';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      editId: editStock ? editStock.id : '',
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      market,
      shares: Number(shares),
      cost: Number(cost),
      buyDate: buyDate || new Date().toISOString().slice(0, 10),
      buyRate: market === 'us' ? Number(buyRate) || usdTwdRate : 1,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[2rem] sm:rounded-3xl p-5 md:p-8 w-full max-w-lg shadow-[0_12px_40px_rgb(0,0,0,0.15)] flex flex-col max-h-[85dvh] sm:max-h-[88vh] border border-slate-100 text-slate-900"
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            {editStock ? '編輯監控部位' : '新增監控部位'}
          </h3>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition btn-interact"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 text-sm">
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* Search Input */}
          <div className="relative">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-700 font-bold text-xs tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" /> 智慧搜尋標的 (台美股) *
              </label>
              {isSearching && (
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium flex items-center gap-1 border border-indigo-100">
                  <Loader2 className="w-3 h-3 animate-spin" /> 搜尋中
                </span>
              )}
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="例如: 台積電 / 2330 / NVDA / 兆聯實業"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none text-sm focus:border-indigo-600 focus:bg-white transition"
            />

            {/* Auto-complete Dropdown */}
            {showResults && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">
                    找不到符合標的。可直接手動輸入代號與名稱。
                  </div>
                ) : (
                  searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSuggestion(item.symbol, item.name, item.market)}
                      className="w-full text-left p-3.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-sm transition"
                    >
                      <div>
                        <span className="font-bold text-slate-900 mr-3">{item.name}</span>
                        <span className="text-indigo-600 font-mono font-bold">{item.symbol}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.market === 'us' ? '美股' : item.market === 'otc' ? '上櫃' : '上市'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Live Price Reference */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-1.5 font-bold">
                即時參考價:{' '}
                <strong className="text-slate-900 font-mono tabular-nums text-sm tracking-wide">
                  {livePrice}
                </strong>
              </span>
              <span className="text-slate-600 font-bold">
                當前匯率:{' '}
                <strong className="text-amber-700 font-mono tabular-nums text-sm tracking-wide">
                  {usdTwdRate.toFixed(2)}
                </strong>
              </span>
            </div>
          </div>

          {/* Market, Symbol, Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">市場類別</label>
              <select
                value={market}
                onChange={(e) => {
                  playClickSound();
                  const m = e.target.value as MarketType;
                  setMarket(m);
                  fetchLivePreview(symbol, m);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-indigo-700 font-bold outline-none cursor-pointer"
              >
                <option value="tse">台股上市</option>
                <option value="otc">台股上櫃</option>
                <option value="us">美股</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">股票代號</label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => {
                  const s = e.target.value.toUpperCase();
                  setSymbol(s);
                  fetchLivePreview(s, market);
                }}
                placeholder="代號"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 font-bold uppercase outline-none tracking-wider"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">股票名稱</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="名稱"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 font-medium outline-none"
              />
            </div>
          </div>

          {/* Shares, Cost, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs">持有股數 *</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="填寫股數"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 outline-none text-sm font-mono tabular-nums focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                買入均價 * <span className="text-[10px] text-amber-700 font-bold">(配股填0)</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="買入成本"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 outline-none text-sm font-mono tabular-nums focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs">買入日期</label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 outline-none text-sm font-mono tabular-nums focus:bg-white"
              />
            </div>
          </div>

          {/* US Buy Rate Input */}
          {market === 'us' && (
            <div>
              <label className="block text-amber-800 mb-1.5 text-xs font-bold">
                買入當時匯率 (USD/TWD) *
              </label>
              <input
                type="number"
                step="0.01"
                value={buyRate}
                onChange={(e) => setBuyRate(e.target.value)}
                placeholder="例如: 32.15"
                className="w-full bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-3 outline-none text-sm font-mono tabular-nums font-bold"
              />
            </div>
          )}

          {/* Transaction Cost Estimations (手續費與證交稅預估) */}
          {market !== 'us' && Number(shares) > 0 && Number(cost) > 0 && (
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs">
              <div className="text-emerald-800 font-bold flex justify-between items-center">
                <span>預估交易成本 (券商 28 折 + 證交稅)</span>
                <span className="text-[10px] bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-900 font-mono font-bold">
                  NT$ {Math.round(
                    Math.max(20, Number(shares) * Number(cost) * 0.001425 * 0.28) +
                    Math.max(20, Number(shares) * Number(cost) * 0.001425 * 0.28) +
                    Number(shares) * Number(cost) * (symbol.startsWith('00') ? 0.001 : 0.003)
                  ).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-800 bg-white p-2.5 rounded-lg border border-emerald-100">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans font-bold">買入手續費</span>
                  ${Math.round(Math.max(20, Number(shares) * Number(cost) * 0.001425 * 0.28))} NT$
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans font-bold">預估賣出手續費</span>
                  ${Math.round(Math.max(20, Number(shares) * Number(cost) * 0.001425 * 0.28))} NT$
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans font-bold">預估證交稅 ({symbol.startsWith('00') ? '0.1%' : '0.3%'})</span>
                  ${Math.round(Number(shares) * Number(cost) * (symbol.startsWith('00') ? 0.001 : 0.003))} NT$
                </div>
              </div>
            </div>
          )}

          {/* Risk Control Estimations */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="text-indigo-700 font-bold flex items-center gap-1.5">
              <Target className="w-4 h-4" /> 風控估算價 (估算)
            </div>
            <div className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-lg">
              <span className="text-slate-600 font-bold">停利 Target (+10%)</span>
              <strong className="text-emerald-600 font-mono tabular-nums text-sm">{tpPrice}</strong>
            </div>
            <div className="flex justify-between items-center bg-white border border-slate-200 px-3 py-2 rounded-lg">
              <span className="text-slate-600 font-bold">停損 Stop-Loss (-5%)</span>
              <strong className="text-rose-600 font-mono tabular-nums text-sm">{slPrice}</strong>
            </div>
          </div>

          </div>

          <div className="pt-3 pb-2 sm:pb-0 flex gap-3 border-t border-slate-100 bg-white shrink-0">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="w-1/3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm transition btn-interact"
            >
              取消
            </button>
            <button
              type="submit"
              className="w-2/3 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm transition shadow-sm btn-interact"
            >
              確認儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
