import React, { useState } from 'react';
import { Terminal, Activity, CheckCircle2, ShieldAlert, Lock, Wifi, ChevronDown, ChevronUp } from 'lucide-react';
import { ApiHealthStatus, ApiStatusItem } from '../types';
import { playClickSound } from '../utils/audio';

interface ApiDebugPanelProps {
  apiHealth: ApiHealthStatus;
  lastSyncTime: string;
  quoteSuccessCount: number;
  totalCount: number;
  lastCloudWriteTime: string;
  onRunDiagnostics: () => void;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
}

export const ApiDebugPanel: React.FC<ApiDebugPanelProps> = ({
  apiHealth,
  lastSyncTime,
  quoteSuccessCount,
  totalCount,
  lastCloudWriteTime,
  onRunDiagnostics,
  isAdmin = true,
  onToggleAdmin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const items: ApiStatusItem[] = [
    apiHealth.cloud,
    apiHealth.yahoo,
    apiHealth.twse,
    apiHealth.tpex,
    apiHealth.search,
    apiHealth.fx,
  ];

  let hasError = false;
  const errors: string[] = [];

  items.forEach((api) => {
    if (api.status === 'ERROR') {
      hasError = true;
      errors.push(`${api.name}: ${api.error || '不明錯誤'}`);
    }
  });

  // Collapsed Minimal Bar Mode (Default on Mobile)
  if (!isExpanded) {
    return (
      <div className="bg-white/95 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-800 text-[11px] sm:text-xs truncate flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            API連線正常
          </span>
          <span className="text-[10px] sm:text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 shrink-0 hidden xs:inline">
            報價 {quoteSuccessCount}/{totalCount} 檔
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              setIsExpanded(true);
            }}
            className="text-[10px] sm:text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition btn-interact"
          >
            <span>{isAdmin ? '診斷Console' : '連線狀態'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded View (When User clicks to view detailed diagnostics)
  if (!isAdmin) {
    return (
      <div className="bg-white/95 p-4 rounded-2xl border border-slate-200/90 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fadeIn">
        <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
          <div className="flex items-center gap-2 font-bold text-emerald-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Wifi className="w-4 h-4" /> API 連線狀態：正常運作中
          </div>

          <div className="text-slate-600 font-mono flex items-center gap-2 flex-wrap">
            <span className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
              📊 報價: <strong className="text-emerald-700">{quoteSuccessCount}/{totalCount}</strong> 檔
            </span>
            <span className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
              ⏱️ 同步: <strong className="text-indigo-600">{lastSyncTime || '已更新'}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {onToggleAdmin && (
            <button
              onClick={() => {
                playClickSound();
                onToggleAdmin();
              }}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 btn-interact font-bold"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>解鎖診斷</span>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1 font-bold"
          >
            <span>收起</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Full Admin Debug Console (Expanded)
  return (
    <div className="bg-white/95 p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xl space-y-4 animate-fadeIn">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-widest">
          <Terminal className="w-4 h-4" /> API Debug Console (戰情診斷中心)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              onRunDiagnostics();
            }}
            className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition btn-interact flex items-center gap-1.5 font-bold"
          >
            <Activity className="w-3.5 h-3.5" /> 測試
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1"
            title="收起診斷台"
          >
            <span>收起</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono text-xs">
        {items.map((api, idx) => {
          const isOk = api.status === 'OK';
          const isDis = api.status === 'DISABLED';
          const colorClass = isOk
            ? 'text-emerald-700 border-emerald-200 bg-emerald-50/80'
            : isDis
            ? 'text-slate-500 border-slate-200 bg-slate-50'
            : 'text-rose-700 border-rose-200 bg-rose-50/80';

          return (
            <div key={idx} className={`p-2.5 rounded-xl border flex justify-between items-center ${colorClass}`}>
              <span>● {api.name}</span>
              <span className="font-bold">
                {api.status} <span className="text-[10px] text-slate-500 font-normal">({api.ms}ms)</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs font-mono">
        <div className="flex flex-wrap justify-between text-slate-600 border-b border-slate-200/60 pb-2 gap-2">
          <span>
            最後同步: <strong className="text-slate-900">{lastSyncTime || '--'}</strong>
          </span>
          <span>
            股票報價:{' '}
            <strong className="text-emerald-700">
              {quoteSuccessCount} / {totalCount} 成功
            </strong>
          </span>
          <span>
            雲端寫入: <strong className="text-indigo-700">{lastCloudWriteTime || '--'}</strong>
          </span>
        </div>

        {hasError && (
          <div className="text-rose-700 pt-1 space-y-1">
            {errors.map((err, i) => (
              <div key={i}>❌ {err}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
