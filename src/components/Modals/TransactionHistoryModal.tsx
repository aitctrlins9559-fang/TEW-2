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
  onClose: () => void;
  onAddTransaction: (stockId: string, buyDate: string, shares: number, cost: number) => void;
  onDeleteTransaction: (stockId: string, txId: string) => void;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  stock,
  isAdmin,
  usdTwdRate,
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
    <div
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[2rem] sm:rounded-3xl p-5 md:p-8 w-full max-w-2xl shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto border border-slate-200 text-slate-900"
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" /> {stock.name} ({stock.symbol}) 買入歷程
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              總持股：{stock.shares.toLocaleString()} 股 ｜ 加權平均成本：
              {isUS ? `$${stock.cost} USD` : `$${stock.cost} NT$`} ｜ 扣款筆數：
              {stock.transactions.length} 筆
            </p>
          </div>
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

        {/* Transactions Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="uppercase bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">買入日期</th>
                <th className="py-3 px-4">買入股數</th>
                <th className="py-3 px-4">單價 (均價)</th>
                <th className="py-3 px-4">匯率</th>
                <th className="py-3 px-4">小計 (NT$)</th>
                <th className="py-3 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {stock.transactions.map((tx) => {
                const fx = isUS ? tx.buyRate || usdTwdRate : 1;
                const subtotal = tx.shares * tx.cost * fx;

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">{tx.buyDate || '未記錄'}</td>
                    <td className="py-3 px-4">{tx.shares.toLocaleString()} 股</td>
                    <td className="py-3 px-4">{isUS ? `$${tx.cost} USD` : `$${tx.cost}`}</td>
                    <td className="py-3 px-4">{isUS ? tx.buyRate || usdTwdRate : '1.0'}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ${Math.round(subtotal).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(stock.id, tx.id)}
                        className="text-rose-600 hover:text-rose-700 font-sans text-xs bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition font-bold"
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

        {/* Add DCA Transaction Form */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" /> 快速新增定期定額 / 買入記錄
          </div>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">日期</label>
              <input
                type="date"
                required
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">股數</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                placeholder="股數"
                value={addShares}
                onChange={(e) => setAddShares(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">買入單價</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="單價"
                value={addCost}
                onChange={(e) => setAddCost(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 outline-none font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition btn-interact shadow-sm"
              >
                新增此筆
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
