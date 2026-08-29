import React from 'react';
import { Banknote, ShieldAlert, Cpu } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface ActionModalProps {
  isOpen: boolean;
  type: 'mvp' | 'lvp' | null;
  name: string;
  profitStr: string;
  roi: number;
  isRedUp: boolean;
  onClose: () => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  type,
  name,
  profitStr,
  roi,
  isRedUp,
  onClose,
}) => {
  if (!isOpen || !type) return null;

  const isMVP = type === 'mvp';

  // Determine positive vs negative color themes based on Taiwan/US red-up setting
  // isRedUp = true (TW): Up = Rose/Red, Down = Emerald/Green
  // isRedUp = false (US): Up = Emerald/Green, Down = Rose/Red
  const isUpRed = isRedUp;

  const upTheme = isUpRed
    ? {
        bg: 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm',
        iconText: 'text-rose-600',
        titleText: 'text-rose-700',
        badge: 'text-rose-700 border-rose-200 bg-rose-50 font-bold',
      }
    : {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm',
        iconText: 'text-emerald-600',
        titleText: 'text-emerald-700',
        badge: 'text-emerald-700 border-emerald-200 bg-emerald-50 font-bold',
      };

  const downTheme = isUpRed
    ? {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm',
        iconText: 'text-emerald-600',
        titleText: 'text-emerald-700',
        badge: 'text-emerald-700 border-emerald-200 bg-emerald-50 font-bold',
      }
    : {
        bg: 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm',
        iconText: 'text-rose-600',
        titleText: 'text-rose-700',
        badge: 'text-rose-700 border-rose-200 bg-rose-50 font-bold',
      };

  const theme = isMVP ? upTheme : downTheme;

  let extraText = '';
  if (isMVP) {
    if (roi >= 50) extraText = '驚人的爆發力！🚀 報酬率突破 50%，這波翻倍行情抓得太漂亮了！';
    else if (roi >= 20) extraText = '強勢波段確立！📈 拉開 20% 以上的獲利空間，趨勢完全在掌握之中！';
    else if (roi >= 10) extraText = '穩步雙位數成長！✨ 獲利突破 10%，進可攻退可守的絕佳水位！';
    else extraText = '穩健獲利中！🛡️ 保持獲利帳面就是舒服，不疾不徐累積資產！';
  } else {
    if (roi <= -20) extraText = '⚠️ 跌幅已深！已達深度回檔區間，請嚴格檢視基本面是否改變，保持紀律！';
    else if (roi <= -10) extraText = '📉 跌破雙位數！可能已跌破重要支撐，保持冷靜重新評估交易初衷。';
    else extraText = '🛡️ 輕微回檔中。目前仍在可控範圍，嚴守停損點即可。';
  }

  return (
    <div
      onClick={() => {
        playClickSound();
        onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 transition-all duration-300 overscroll-none modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center border border-slate-200 text-slate-900 overscroll-contain"
      >
        <div
          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border ${theme.bg} ${
            isMVP ? 'animate-bounce' : 'animate-pulse'
          }`}
        >
          {isMVP ? (
            <Banknote className={`w-10 h-10 ${theme.iconText}`} />
          ) : (
            <ShieldAlert className={`w-10 h-10 ${theme.iconText}`} />
          )}
        </div>

        <h3 className={`text-2xl font-black mb-2 tracking-tight ${theme.titleText}`}>
          {isMVP ? '獲利成就解鎖！' : '風控冷靜室'}
        </h3>

        <div className="text-slate-700 text-sm mb-8 leading-relaxed font-medium">
          <div
            className={`text-[10px] mb-3 font-mono tracking-widest uppercase border inline-block px-2 py-0.5 rounded font-bold ${theme.badge}`}
          >
            <Cpu className="w-3 h-3 inline mr-1 relative -top-0.5" />
            {isMVP ? '系統戰情分析' : '系統風控警告'}
          </div>
          <br />
          {extraText}
          <br />
          <br />
          <span className="text-slate-900 font-bold text-base">{name}</span> 目前帳面{' '}
          <span className={`font-mono font-bold text-base ${theme.titleText}`}>
            {profitStr}
          </span>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm transition btn-interact shadow-sm"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
