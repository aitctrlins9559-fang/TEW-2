import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { playClickSound } from '../../utils/audio';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemName?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = '確認刪除',
  message = '確定要移除此筆項目嗎？此操作無法復原。',
  itemName,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-scaleUp text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <span>{title}</span>
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
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 font-medium leading-relaxed">{message}</p>
          {itemName && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-bold text-slate-900 text-base font-mono">
              {itemName}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-50/50 border-t border-slate-100">
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
            type="button"
            onClick={() => {
              playClickSound();
              onConfirm();
            }}
            className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>確認刪除</span>
          </button>
        </div>
      </div>
    </div>
  );
};
