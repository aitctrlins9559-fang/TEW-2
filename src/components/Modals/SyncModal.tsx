import React, { useState, useEffect } from 'react';
import { CloudCog, Download, Upload, Save, Lock, X, CheckCircle2 } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface SyncModalProps {
  isOpen: boolean;
  currentSyncUrl: string;
  onClose: () => void;
  onSaveSyncUrl: (url: string) => void;
  onFetchFromCloud?: (url: string) => Promise<boolean>;
  onPushToCloud?: (url: string) => Promise<boolean>;
  isAdmin: boolean;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  currentSyncUrl,
  onClose,
  onSaveSyncUrl,
  onFetchFromCloud,
  onPushToCloud,
  isAdmin,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isOperating, setIsOperating] = useState(false);

  useEffect(() => {
    setInputUrl(currentSyncUrl);
  }, [currentSyncUrl, isOpen]);

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
        className="bg-white rounded-t-[2rem] sm:rounded-3xl p-5 md:p-8 w-full max-w-lg shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[88vh] overflow-y-auto border border-slate-200 text-slate-900"
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <CloudCog className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                雲端同步與數據維護
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-mono font-bold">
                  🔒 已加密鎖定
                </span>
              </h3>
              <p className="text-xs text-slate-500">設備端本機存取與 Google Cloud / GAS 雙向同步</p>
            </div>
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

        <div className="space-y-4 text-sm">
          {/* Local storage note */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-emerald-900 mb-0.5">設備端離線儲存保護中</strong>
              您在外使用時，所有的持股增刪修訂皆已自動保存在此設備 (LocalStorage) 中，隨時開啟即用。
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5 font-bold tracking-wide flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Google Apps Script 雲端同步網址 (Web App URL)</span>
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-mono text-xs outline-none focus:border-indigo-600"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">
              貼上您的 Google Apps Script 網址後點擊『儲存網址設定』。在其他設備輸入相同網址，即可雙向拉取與推送持股。
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
            <div className="font-bold text-amber-800 flex items-center gap-1">
              💡 雲端同步無效或測試失敗的常見原因：
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[10px] leading-relaxed">
              <li><strong>尚未填寫網址</strong>：本系統預設為純離線 (LocalStorage) 儲存，需自行填寫 GAS 網址。</li>
              <li><strong>GAS 部署權限問題</strong>：部署 Web App 時「誰可以存取」請必須選擇 <strong>「任何人 (Anyone)」</strong>。</li>
              <li><strong>未解鎖管理員</strong>：推送備份需點擊頂部標題旁的🔒解鎖權限。</li>
              <li><strong>替代方案</strong>：若無 Google 試算表，可使用表格右上角的 <strong>「匯出備份 (JSON)」</strong> 功能跨設備轉移。</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isOperating || !inputUrl.trim()}
              onClick={async () => {
                if (onFetchFromCloud && inputUrl.trim()) {
                  setIsOperating(true);
                  await onFetchFromCloud(inputUrl.trim());
                  setIsOperating(false);
                }
              }}
              className="flex items-center justify-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 py-3 rounded-xl font-bold text-xs transition disabled:opacity-40 btn-interact"
            >
              <Download className="w-4 h-4" />
              <span>📥 從雲端讀取持股</span>
            </button>

            <button
              type="button"
              disabled={isOperating || !inputUrl.trim() || !isAdmin}
              onClick={async () => {
                if (onPushToCloud && inputUrl.trim()) {
                  setIsOperating(true);
                  await onPushToCloud(inputUrl.trim());
                  setIsOperating(false);
                }
              }}
              className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-3 rounded-xl font-bold text-xs transition disabled:opacity-40 btn-interact"
            >
              <Upload className="w-4 h-4" />
              <span>📤 備份推送到雲端</span>
            </button>
          </div>

          <div className="pt-3 pb-6 sm:pb-0 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition btn-interact border border-slate-200"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveSyncUrl(inputUrl.trim());
              }}
              className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 btn-interact"
            >
              <Save className="w-4 h-4" />
              <span>儲存網址設定</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

