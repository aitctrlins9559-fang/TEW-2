import React, { useState } from 'react';
import { Lock, Unlock, Key, X, Check } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface AdminPasswordModalProps {
  isOpen: boolean;
  isAdmin: boolean;
  onUnlock: (password: string) => void;
  onLock: () => void;
  onClose: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  isAdmin,
  onUnlock,
  onLock,
  onClose,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMsg('請輸入金鑰密碼');
      return;
    }
    playClickSound();
    onUnlock(passwordInput.trim());
    setPasswordInput('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-scaleUp text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5 font-bold text-base text-slate-900">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <span>{isAdmin ? '管理員身分（已解鎖）' : '解鎖管理員權限'}</span>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isAdmin ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-700">
              目前系統處於<strong className="text-emerald-700">【解鎖狀態】</strong>，您可以直接編輯部位、備份、或修改雲端同步設定。
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onLock();
                  onClose();
                }}
                className="w-full min-h-[44px] py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>鎖定管理員身分</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              請輸入管理員解鎖密碼，以開啟進階權限（包含雲端金鑰綁定與完整資料導出權限）。
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>解鎖密碼</span>
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="請輸入密碼 (預設可任意輸入)"
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition font-mono"
              />
              {errorMsg && <p className="text-xs text-rose-600 font-bold">{errorMsg}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
              >
                取消
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Unlock className="w-4 h-4" />
                <span>立即解鎖</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
