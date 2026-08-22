import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Unlock,
  Lock,
  Sparkles,
  Clock,
  Cloud,
  CloudOff,
  Settings,
  FileText,
  DollarSign,
} from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface HeaderProps {
  isAdmin: boolean;
  onToggleAdmin: () => void;
  isRedUp: boolean;
  onToggleTheme: () => void;
  isPrivacy: boolean;
  onTogglePrivacy: () => void;
  isAutoRefreshOn: boolean;
  onToggleAutoRefresh: () => void;
  countdownTimer: number;
  activeRefreshInterval: number;
  onManualRefresh: () => void;
  isFetchingPrices: boolean;
  cloudSyncUrl: string;
  onOpenSyncModal: () => void;
  onOpenAddModal: () => void;
  onOpenAICopilot: () => void;
  onOpenChangelog?: () => void;
  usdTwdRate: number;
  lastUpdateTime: string;
  twMarketOpen: boolean;
  usMarketOpen: boolean;
  quoteSuccessCount: number;
  totalPositionsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onToggleAdmin,
  isRedUp,
  onToggleTheme,
  isPrivacy,
  onTogglePrivacy,
  isAutoRefreshOn,
  onToggleAutoRefresh,
  countdownTimer,
  activeRefreshInterval,
  onManualRefresh,
  isFetchingPrices,
  cloudSyncUrl,
  onOpenSyncModal,
  onOpenAddModal,
  onOpenAICopilot,
  onOpenChangelog,
  usdTwdRate,
  lastUpdateTime,
  twMarketOpen,
  usMarketOpen,
  quoteSuccessCount,
  totalPositionsCount,
}) => {
  const isCloudBound = Boolean(cloudSyncUrl && cloudSyncUrl.includes('script.google.com'));
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-40">
      <div className="flex flex-col gap-3.5">
        {/* Main Workstation Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          {/* Logo & Platform Badge */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  onClick={onToggleAdmin}
                  className="cursor-pointer text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 hover:text-indigo-600 transition"
                >
                  智股領息 <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-extrabold border border-indigo-100 shadow-2xs">LUMINOUS FINTECH PRO</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden xs:block mt-0.5">
                高階明亮資產戰情室 ｜ 實時台美股複利與被動現金流樞紐
              </p>
            </div>
          </div>

          {/* Action Center Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Primary CTA: Add Position */}
            <button
              onClick={() => {
                playClickSound();
                onOpenAddModal();
              }}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-indigo-600/15 btn-interact shrink-0 border border-indigo-500/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">建倉/新增部位</span>
              <span className="sm:hidden">新增</span>
            </button>

            {/* AI Copilot Button */}
            <button
              onClick={() => {
                playClickSound();
                onOpenAICopilot();
              }}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-indigo-50/90 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-100 text-xs font-bold transition flex items-center gap-1.5 btn-interact shadow-2xs"
              title="開啟 AI 智算戰情室"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="hidden md:inline">AI 智算</span>
            </button>

            {/* Privacy Shield */}
            <button
              onClick={() => {
                playClickSound();
                onTogglePrivacy();
              }}
              className={`p-2.5 sm:p-2.5 rounded-2xl border transition btn-interact ${
                isPrivacy
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 shadow-2xs'
              }`}
              title={isPrivacy ? '顯示金額' : '隱藏金額'}
            >
              {isPrivacy ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                playClickSound();
                onManualRefresh();
              }}
              className={`p-2.5 sm:p-2.5 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 btn-interact ${
                isFetchingPrices
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 shadow-2xs'
              }`}
              title="刷新台美股即時行情"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingPrices ? 'animate-spin' : 'text-emerald-600'}`} />
            </button>

            {/* Tools Menu Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                onClick={() => {
                  playClickSound();
                  setIsToolsOpen(!isToolsOpen);
                }}
                className="p-2.5 sm:p-2.5 rounded-2xl bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50 shadow-2xs transition btn-interact"
                title="系統管理工具"
              >
                <Settings className="w-4 h-4" />
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl p-2 z-50 text-xs space-y-1 animate-fadeIn text-slate-800">
                  {/* Admin Unlock */}
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsToolsOpen(false);
                      onToggleAdmin();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between font-bold"
                  >
                    <span className="flex items-center gap-2">
                      {isAdmin ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-slate-400" />}
                      管理員金鑰權限
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isAdmin ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                      {isAdmin ? '已授權' : '未授權'}
                    </span>
                  </button>

                  {/* Auto Refresh Toggle */}
                  <button
                    onClick={() => {
                      playClickSound();
                      onToggleAutoRefresh();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between font-bold"
                  >
                    <span className="flex items-center gap-2">
                      {isAutoRefreshOn ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4 text-slate-400" />}
                      自動定時刷價
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isAutoRefreshOn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                      {isAutoRefreshOn ? `${countdownTimer}s` : '關閉'}
                    </span>
                  </button>

                  {/* Cloud Sync Settings */}
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsToolsOpen(false);
                      if (!isAdmin) onToggleAdmin();
                      else onOpenSyncModal();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between font-bold"
                  >
                    <span className="flex items-center gap-2">
                      {isCloudBound ? <Cloud className="w-4 h-4 text-sky-600" /> : <CloudOff className="w-4 h-4 text-amber-500" />}
                      Google 雲端備份網址
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isCloudBound ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {isCloudBound ? '已連結' : '未設定'}
                    </span>
                  </button>

                  {/* Version Log */}
                  {onOpenChangelog && (
                    <button
                      onClick={() => {
                        playClickSound();
                        setIsToolsOpen(false);
                        onOpenChangelog();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-indigo-700 font-bold"
                    >
                      <FileText className="w-4 h-4 text-indigo-600" />
                      更新日誌與版本規格
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Status Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            {/* TW Market Badge */}
            <span
              className={`px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${
                twMarketOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200/80 shadow-2xs'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${twMarketOpen ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              台股：{twMarketOpen ? '盤中交易' : '休市'}
            </span>

            {/* US Market Badge */}
            <span
              className={`px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 ${
                usMarketOpen
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200/80 shadow-2xs'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${usMarketOpen ? 'bg-indigo-500 animate-ping' : 'bg-slate-400'}`} />
              美股：{usMarketOpen ? '盤中交易' : '休市'}
            </span>

            {/* Total Positions */}
            <span className="px-2.5 py-1 rounded-xl bg-white text-slate-700 border border-slate-200/80 font-bold shadow-2xs">
              部位監控：<strong className="text-slate-900 font-mono">{totalPositionsCount}</strong> 檔
            </span>

            {/* Update Time */}
            <span className="px-2.5 py-1 rounded-xl bg-white text-slate-600 border border-slate-200/80 font-mono flex items-center gap-1 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              {lastUpdateTime || '更新中'}
            </span>
          </div>

          {/* Currency Pill */}
          <div className="flex items-center gap-1.5 bg-indigo-50/80 px-3 py-1 rounded-xl border border-indigo-100 text-indigo-900 font-bold font-mono text-xs">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            <span>USD/TWD {usdTwdRate > 0 ? usdTwdRate.toFixed(2) : '31.50'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
