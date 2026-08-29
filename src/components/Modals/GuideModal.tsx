import React, { useState } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  Gift,
  ShieldCheck,
  ChevronRight,
  Receipt,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  HardDrive,
  Cloud,
  EyeOff,
  AlertCircle,
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
  const [activeStep, setActiveStep] = useState<number>(0);

  if (!isOpen) return null;

  const handleConfirm = () => {
    playClickSound();
    if (dontShowAgain) {
      onDonotShow7Days();
    }
    onClose();
  };

  const steps = [
    {
      id: 'step-1',
      title: '即時行情與淨損益精算',
      subtitle: '真實扣除手續費與證券交易稅',
      icon: TrendingUp,
      accentColor: 'indigo',
      badge: '實時盤勢',
      points: [
        {
          label: '即時連線',
          desc: '支援台股（上市/上櫃）與美股即時行情，美股自動依盤中即期匯率換算為新台幣。',
        },
        {
          label: '精算淨獲利',
          desc: '自動帶入券商手續費折讓（預設 2.8 折）與證交稅，精準掌握真正入口袋的損益。',
        },
        {
          label: '盤中分時走勢',
          desc: '點擊任一標的或「全景看盤」，可即時展開 K 線、即時走勢圖與均價線。',
        },
      ],
    },
    {
      id: 'step-2',
      title: '除權息月曆與配息管理',
      subtitle: '年領股利目標與被動收入追蹤',
      icon: Gift,
      accentColor: 'emerald',
      badge: '被動收入',
      points: [
        {
          label: '除息月曆',
          desc: '自動統計 12 個月現金股利發放時程與金額，支援月月配現金流柱狀圖分析。',
        },
        {
          label: '除權息平準',
          desc: '領息可一鍵扣抵成本；配股自動試算待撥股數，還原真實資產不產生虛跌。',
        },
        {
          label: 'DRIP 複利模擬',
          desc: '內建股息再投入（DRIP）複利計算機，預估滾動 5~30 年後的資產成長與月領現金流。',
        },
      ],
    },
    {
      id: 'step-3',
      title: '資料儲存邏輯與隱私安全',
      subtitle: '設備端本機個人專用，絕不上傳私密資產',
      icon: HardDrive,
      accentColor: 'sky',
      badge: '儲存與隱私',
      points: [
        {
          label: '設備端個人專用儲存',
          desc: '您的持股明細、交易紀錄與成本完全儲存在「當前設備的瀏覽器本機 (localStorage)」中，不經過任何第三方雲端伺服器蒐集，極致保障資產隱私。',
        },
        {
          label: '防窺模式 (Privacy Mode)',
          desc: '點擊頂部眼睛圖示，可即時將所有持股數量、市值與損益遮蔽為星號 (****)，於公共場合檢視更安心。',
        },
        {
          label: '換機與定期備份建議',
          desc: '因資料依附於個人設備，若更換手機、電腦或手動清除瀏覽器快取，請隨時至右上角「齒輪 ➔ 匯出備份 (JSON)」或綁定 Google 雲端備份，以便跨裝置無縫還原。',
        },
      ],
    },
  ];

  const currentStep = steps[activeStep];
  const IconComponent = currentStep.icon;

  return (
    <div
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overscroll-none modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-emerald-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                系統使用指南與說明
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                快速了解即時損益、除權息現金流與本機資料儲存機制
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
            title="關閉"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Step Selector Tabs (Simple Pills) */}
        <div className="grid grid-cols-3 gap-1.5 p-2.5 sm:p-3 bg-slate-50 border-b border-slate-100">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => {
                playClickSound();
                setActiveStep(idx);
              }}
              className={`py-2 px-1.5 rounded-xl text-center transition flex flex-col items-center justify-center gap-0.5 btn-interact ${
                activeStep === idx
                  ? 'bg-white text-indigo-700 font-black shadow-xs border border-indigo-100'
                  : 'text-slate-500 font-bold hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    activeStep === idx
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-[11px] sm:text-xs truncate">{step.badge}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 overscroll-contain modal-content-scroll">
          {/* Step Hero Card */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border ${
              activeStep === 0
                ? 'bg-indigo-50/60 border-indigo-100/90'
                : activeStep === 1
                ? 'bg-emerald-50/60 border-emerald-100/90'
                : 'bg-sky-50/60 border-sky-100/90'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl text-white font-bold shrink-0 ${
                  activeStep === 0
                    ? 'bg-indigo-600'
                    : activeStep === 1
                    ? 'bg-emerald-600'
                    : 'bg-sky-600'
                }`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold tracking-wider uppercase opacity-70 text-slate-700">
                  STEP {activeStep + 1} OF 3
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                  {currentStep.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5">
                  {currentStep.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Key Feature Bullets */}
          <div className="space-y-2">
            {currentStep.points.map((pt, i) => (
              <div
                key={i}
                className="p-2.5 sm:p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-start gap-2.5 transition"
              >
                <CheckCircle2
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    activeStep === 0
                      ? 'text-indigo-600'
                      : activeStep === 1
                      ? 'text-emerald-600'
                      : 'text-sky-600'
                  }`}
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 mr-1.5">{pt.label}:</span>
                  <span className="text-slate-600 leading-relaxed">{pt.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Dedicated Storage Highlight for Step 3 */}
          {activeStep === 2 && (
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>個人設備端使用提醒 (Important Note)</span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                本系統為<strong>個人離線優先 (Local-First)</strong> 設計，無帳號註冊且不保留任何伺服器紀錄。請避免在公共電腦使用無痕模式進行長期紀錄；建議在調整大額持股後，隨時使用<strong>「匯出備份 (JSON)」</strong>留存一份備份檔案至個人硬碟或信箱。
              </p>
            </div>
          )}

          {/* Quick Tip Pill */}
          <div className="p-2 bg-slate-100/70 rounded-xl border border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600 px-3">
            <span className="flex items-center gap-1 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              手機隨開即用，支援免安裝主畫面捷徑 (PWA)
            </span>
            <span className="text-[10px] font-bold text-indigo-600 font-mono">100% PRIVACY</span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-900 select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-[11px] sm:text-xs">7 天內不再自動顯示</span>
          </label>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => {
                  playClickSound();
                  setActiveStep((prev) => prev + 1);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm btn-interact"
              >
                <span>下一步</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 shadow-sm btn-interact"
              >
                <span>開始使用</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

