import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calculator,
  Receipt,
  Gift,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDonotShow7Days: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  onDonotShow7Days,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activeTab, setActiveTab] = useState<'cost' | 'dividend' | 'ai' | 'privacy'>('cost');

  if (!isOpen) return null;

  const handleConfirm = () => {
    playClickSound();
    if (dontShowAgain) {
      onDonotShow7Days();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-slate-50 to-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                股息記帳 App 使用指南與核心計算邏輯
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                協助您快速了解交易成本精算、除權息處理與平台功能
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 px-4 pt-2 gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('cost');
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'cost'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <Receipt className="w-4 h-4" />
            交易成本與淨損益
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('dividend');
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'dividend'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <Gift className="w-4 h-4" />
            除權息與待發股票
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('ai');
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'ai'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI 智算與美股匯率
          </button>
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('privacy');
            }}
            className={`px-3.5 py-2.5 rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'privacy'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 border-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            隱私模式與雲端備份
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs sm:text-sm">
          {activeTab === 'cost' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl space-y-2">
                <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  為什麼要精算交易成本？
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  一般證券軟體僅顯示「帳面毛損益（現價 - 成本價）」，常忽略買賣雙向手續費與賣出證券交易稅。本平台為您精密計算所有規費，呈現真正入口袋的「淨獲利（Net Profit）」。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    券商買賣手續費
                  </span>
                  <p className="text-slate-600">
                    法定費率為 <strong>0.1425%</strong>，每筆交易設有最低 <strong>$20 元 NT$</strong> 門檻。平台預設套用常見線上券商 <strong>2.8 折</strong>，您亦可在持股表格上方自由切換為 6 折、3 折、1.425 折或免手續費。
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    賣出證券交易稅
                  </span>
                  <p className="text-slate-600">
                    普通台股股票賣出徵收 <strong>0.3%</strong> 證交稅；如果是 ETF（例如 0050、0056、00878 等），系統會自動識別並套用優惠稅率 <strong>0.1%</strong>。
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  淨損益與淨 ROI 計算公式
                </span>
                <p className="text-emerald-800 font-mono">
                  扣成本淨損益 = (即時市值 - 買入成本) - (買手續費 + 賣手續費 + 證交稅)
                </p>
                <p className="text-emerald-800 font-mono">
                  淨 ROI (%) = (扣成本淨損益 / 買入成本) × 100%
                </p>
              </div>
            </div>
          )}

          {activeTab === 'dividend' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-indigo-600" />
                  現金股利與股票股利（除權息）處理
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  平台提供完整的配息月曆與除權息特別處理功能，幫助長線價值投資與存股族精準計算年領股利。
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3">
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold font-mono text-xs shrink-0">現金</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">現金股利與成本折抵</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      收到現金股息時，可點擊「領取股息」折抵持有股票成本，讓系統自動更新您的實質持股均價。
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-3">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold font-mono text-xs shrink-0">股票</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">除權待發股票無痛併入持股</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      當公司公告發放股票股利時，平台會自動計算發放股數。入帳後點擊「一鍵補發併入持股」，即可免手動修改零股。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl space-y-2">
                <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  AI 智算戰情室與美股雙幣別轉換
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  整合 Google Gemini AI 智慧分析，全面解讀持股集中度、股息收益率與產業曝險。
                </p>
              </div>

              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2 bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <div>
                    <strong className="text-slate-900 block">台美股即時即期匯率換算</strong>
                    美股部位以美元計價，系統自動抓取台灣銀行 / 國際即時匯率折算新台幣總資產。
                  </div>
                </li>
                <li className="flex items-start gap-2 bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <div>
                    <strong className="text-slate-900 block">AI 智慧投資組合健康度檢視</strong>
                    提供針對個股與總投資組合的優缺點分析、殖利率優化策略與風控建議。
                  </div>
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  資料安全與隱私遮蔽
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  您的所有資產資料皆優先保存在瀏覽器本地存儲 (localStorage)，不會洩露個人帳戶隱私。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                  <strong className="text-slate-900 block mb-1">👁️ 一鍵隱私防窺模式</strong>
                  點擊 Header 的眼睛圖示，即可將所有股數、資產金額與獲利全部替換為星號「****」，公開場合展示更安心。
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                  <strong className="text-slate-900 block mb-1">☁️ Google 試算表雲端同步</strong>
                  支援綁定個人的 Google Apps Script WebApp 網址，實現多裝置跨平台雙向備份。
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>7 天內不再自動顯示此指南</span>
          </label>

          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition shadow-md shadow-indigo-600/20 btn-interact"
          >
            我知道了，開始體驗
          </button>
        </div>
      </div>
    </div>
  );
};
