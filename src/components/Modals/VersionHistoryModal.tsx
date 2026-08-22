import React from 'react';
import { X, Sparkles, CheckCircle2, Tag, Calendar, Rocket, ShieldCheck, Cpu } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VersionItem {
  version: string;
  date: string;
  title: string;
  badge?: string;
  highlights: string[];
}

const VERSION_LOGS: VersionItem[] = [
  {
    version: 'V6.3-PRO',
    date: '2026 年 8 月',
    title: '交易成本算牌、除權息日曆與台美股紅綠轉換全站一致化',
    badge: '最新版本',
    highlights: [
      '📊 交易成本算牌納入：新增台股券商手續費 (預設 28 折規費) 與證券交易稅 (普通股 0.3% / ETF 0.1%) 即時試算，部位編輯器顯示精準毛損益與淨損益差異。',
      '🔴🟢 全站台美紅綠色彩規範一致化：修正最佳損益彈窗與風控對話框的台美股紅綠喜慶切換 (台股紅漲綠跌 / 美股綠漲紅跌)，確保全站顏色一致。',
      '📅 除權息日曆 (Dividend Calendar) 佈局優化：移至主頁面下方，支援 12 個月現金流月月配柱狀圖、除息日提醒與月領被動收入目標算牌器。',
      '⚡ 即時限價大字高亮：走勢圖頂部升級超大號現價 Display 區塊，含即時價位與動態高亮。',
    ],
  },
  {
    version: 'V6.2-PRO',
    date: '2026 年 8 月',
    title: '智慧台股搜尋與即時現價視覺重磅升級',
    highlights: [
      '⚡ 即時限價大字高亮：走勢圖頂部升級超大號現價 Display 區塊，含即時價位、漲跌金額與漲跌幅百分比動態顏色高亮，一目了然。',
      '🔍 全面支援台股中文智慧搜尋：內建超過 100 檔熱門台股/美股/ETF 繁體中文字典檔，無論輸入代號 (2330) 或中文 (鴻海/富邦金) 皆能秒速下拉選單。',
      '🔓 本地部位管理全面解鎖：新增持股、編輯交易歷程及 JSON 備份還原完全開放，不設任何密碼門檻；僅 GAS 雲端金鑰連線同步需管理員解鎖。',
      '📡 簡化版 API 連線面板：一般模式下顯示優化的單行連線狀態列與報價成功率，視覺清爽不干擾。',
    ],
  },
  {
    version: 'V6.0-PRO',
    date: '2026 年 6 月',
    title: 'GAS 雲端數據同步與 Gemini AI 智能投顧',
    highlights: [
      '☁️ Google Apps Script (GAS) 雲端備份與多裝置同步金鑰。',
      '🤖 Gemini 2.5 Flash AI 操盤手一鍵盤中持股健康診斷與風控建議。',
      '📈 個股即時分時走勢圖，包含 10% 漲跌停參考線與當日振幅計算。',
      '🔒 管理員安全鎖定機制，防止誤觸雲端推送設定。',
    ],
  },
  {
    version: 'V5.5-PRO',
    date: '2026 年 3 月',
    title: '即時報價引擎與多市場指數',
    highlights: [
      '💹 加權指數、櫃買指數、費城半導體、台積電 ADR 即時大盤卡片。',
      '💱 台灣銀行與 Yahoo 即時美元對台幣匯率自動折算美股總資產。',
      '📰 即時財經新聞滾動跑馬燈與開盤時間倒數計時器。',
      '隱私遮罩模式 (一鍵隱藏金額與總資產)。',
    ],
  },
  {
    version: 'V5.0-PRO',
    date: '2026 年 1 月',
    title: '農曆吉時與台股開盤運勢卡',
    highlights: [
      '🧧 整合農曆曆法與台股交易日，提供獨家財神方位與開市吉時提示。',
      '定期定額 (DCA) 平均成本計算器與買入歷史歷程追蹤。',
    ],
  },
];

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 space-y-6 max-h-[85vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Rocket className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                版本更新紀錄 <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold">Changelog</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">系統版本演進歷程與最新功能說明</p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto pr-1 space-y-6 flex-1 divide-y divide-slate-100">
          {VERSION_LOGS.map((item, idx) => (
            <div key={idx} className={`${idx !== 0 ? 'pt-6' : ''} space-y-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                    {item.version}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-slate-500 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" /> {item.date}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>

              <ul className="space-y-2 pl-1">
                {item.highlights.map((h, hIdx) => (
                  <li key={hIdx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 持股監控投資雷達 • 穩定極速體驗
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition btn-interact shadow-sm"
          >
            瞭解並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
