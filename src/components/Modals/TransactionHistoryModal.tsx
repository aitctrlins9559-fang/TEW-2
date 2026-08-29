import React, { useState } from 'react';
import { History, PlusCircle, X } from 'lucide-react';
import { StockPosition } from '../../types';
import { getTaiwanDateString } from '../../utils/format';
import { playClickSound } from '../../utils/audio';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  stock: StockPosition | null;
  isAdmin: boolean;
  usdTwdRate: number;
  brokerDiscount?: number;
  onClose: () => void;
  onAddTransaction: (stockId: string, buyDate: string, shares: number, cost: number) => void;
  onDeleteTransaction: (stockId: string, txId: string) => void;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  stock,
  isAdmin,
  usdTwdRate,
  brokerDiscount = 0.28,
  onClose,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [addDate, setAddDate] = useState(getTaiwanDateString());
  const [addShares, setAddShares] = useState('');
  const [addCost, setAddCost] = useState('');

  if (!isOpen || !stock) return null;

  const isUS = stock.market === 'us';

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sNum = Number(addShares);
    const cNum = Number(addCost);
    if (sNum <= 0 || cNum < 0) return;

    onAddTransaction(stock.id, addDate || getTaiwanDateString(), sNum, cNum);
    setAddShares('');
    setAddCost('');
  };

  return (
    <div className="fixed inset-0 z-[90] w-full h-[100dvh] bg-slate-100 flex flex-col text-slate-900 overflow-hidden overscroll-none animate-fadeIn select-none modal-backdrop">
      {/* Top Sticky Navigation Bar */}
      <div className="bg-white border-b border-slate-200/90 px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-2 shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold transition btn-interact shrink-0"
        >
          <X className="w-4 h-4 text-indigo-600 hidden" />
          <span>返回</span>
        </button>

        <div className="flex flex-col items-center min-w-0">
          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
            <History className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{stock.name} ({stock.symbol}) 買入歷程</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            總持股：{stock.shares.toLocaleString()} 股 ｜ 均價：{isUS ? `$${stock.cost} USD` : `$${stock.cost} NT$`} ｜ {stock.transactions.length} 筆紀錄
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 transition btn-interact shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-w-3xl mx-auto w-full space-y-3 overscroll-contain modal-content-scroll">
        {/* Transactions Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-xs text-left text-slate-700 min-w-[480px]">
              <thead className="uppercase bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2 px-3">買入日期</th>
                  <th className="py-2 px-3">買入股數</th>
                  <th className="py-2 px-3">單價 (均價)</th>
                  <th className="py-2 px-3">匯率</th>
                  <th className="py-2 px-3">買手續費</th>
                  <th className="py-2 px-3">小計 (含手續費)</th>
                  <th className="py-2 px-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {stock.transactions.map((tx) => {
                  const fx = isUS ? tx.buyRate || usdTwdRate : 1;
                  const rawSubtotal = tx.shares * tx.cost * fx;
                  const buyFee = isUS
                    ? 0
                    : Math.max(20, Math.round(tx.shares * tx.cost * 0.001425 * brokerDiscount));
                  const totalCostWithFee = rawSubtotal + buyFee;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 whitespace-nowrap">{tx.buyDate || '未記錄'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{tx.shares.toLocaleString()} 股</td>
                      <td className="py-2 px-3 whitespace-nowrap">{isUS ? `$${tx.cost} USD` : `$${tx.cost}`}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{isUS ? tx.buyRate || usdTwdRate : '1.0'}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-amber-900">
                        {isUS ? '免費' : `$${buyFee} NT$`}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                        ${Math.round(totalCostWithFee).toLocaleString()} NT$
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onDeleteTransaction(stock.id, tx.id)}
                          className="text-rose-600 hover:text-rose-700 font-sans text-xs bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg hover:bg-rose-100 transition font-bold btn-interact"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add DCA Transaction Form */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 space-y-2.5 shadow-2xs">
          <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" /> 快速新增定期定額 / 買入記錄
          </div>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">買入日期</label>
              <input
                type="date"
                required
                enterKeyHint="next"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="w-full h-8 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 outline-none text-xs font-mono tabular-nums focus:border-indigo-600 truncate"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">股數</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                enterKeyHint="next"
                placeholder="股數"
                value={addShares}
                onChange={(e) => setAddShares(e.target.value)}
                className="w-full h-8 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 outline-none font-mono text-xs focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">買入單價</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                enterKeyHint="done"
                placeholder="單價"
                value={addCost}
                onChange={(e) => setAddCost(e.target.value)}
                className="w-full h-8 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 outline-none font-mono text-xs focus:border-indigo-600"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition btn-interact shadow-xs text-xs flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> 新增此筆
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-3 bg-white border-t border-slate-200/90 shrink-0 max-w-3xl mx-auto w-full shadow-2xs">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs transition btn-interact"
        >
          完成關閉
        </button>
      </div>
    </div>
  );
};
