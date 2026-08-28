import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  BarChart3,
  Calendar,
  Sparkles,
  Plus,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  TrendingUp,
  Globe,
  Radio,
  Cpu,
} from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  portfolioCount: number;
  usdTwdRate: number;
  isPrivacy: boolean;
  onTogglePrivacy: () => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onOpenAddModal: () => void;
  onOpenAICopilot: () => void;
  twMarketOpen: boolean;
  usMarketOpen: boolean;
  isFetchingPrices: boolean;
  onManualRefresh: () => void;
  cloudSyncUrl?: string;
  onOpenSyncModal: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  portfolioCount,
  usdTwdRate,
  isPrivacy,
  onTogglePrivacy,
  isAdmin,
  onToggleAdmin,
  onOpenAddModal,
  onOpenAICopilot,
  twMarketOpen,
  usMarketOpen,
  isFetchingPrices,
  onManualRefresh,
  cloudSyncUrl,
  onOpenSyncModal,
}) => {
  const navItems = [
    { id: 'overview', label: '戰情總覽', icon: LayoutDashboard, badge: null },
    { id: 'portfolio', label: '持股終端', icon: BarChart3, badge: portfolioCount },
    { id: 'charts', label: '走勢配置', icon: PieChart, badge: null },
    { id: 'calendar', label: '除權息', icon: Calendar, badge: '息' },
    { id: 'all', label: '單頁全景', icon: Sliders, badge: null },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[calc(100vh-2rem)] sticky top-4 bg-white border border-slate-100 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] justify-between z-30 transition-all">
      {/* Brand & App Title Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 font-black text-lg">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-black text-slate-900 tracking-tight text-base flex items-center gap-1.5">
                股息記帳
              </div>
              <div className="text-[10px] font-mono font-bold text-indigo-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                台美股持股管理
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: Add Position */}
        <button
          onClick={() => {
            playClickSound();
            onOpenAddModal();
          }}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/15 btn-interact"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>建立新持股部位</span>
        </button>

        {/* Primary Navigation Rail */}
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 font-mono">
            主選單
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playClickSound();
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition btn-interact ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Copilot Special Feature Card */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-slate-900">AI 智慧投資顧問</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            即時檢析持股權重、預測除息年息與最佳加碼標的。
          </p>
          <button
            onClick={() => {
              playClickSound();
              onOpenAICopilot();
            }}
            className="w-full py-2 px-3 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>開啟 AI 研判終端</span>
          </button>
        </div>
      </div>

      {/* Footer Status Panel & Controls */}
      <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
        {/* Live Market Indicators */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
          <div className="p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
            <span className="text-slate-500 font-bold">台股</span>
            <span className={`font-bold flex items-center gap-1 ${twMarketOpen ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${twMarketOpen ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
              {twMarketOpen ? '盤中' : '休市'}
            </span>
          </div>

          <div className="p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
            <span className="text-slate-500 font-bold">美股</span>
            <span className={`font-bold flex items-center gap-1 ${usMarketOpen ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${usMarketOpen ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
              {usMarketOpen ? '盤中' : '休市'}
            </span>
          </div>
        </div>

        {/* Quick Utility Toggles */}
        <div className="flex items-center justify-between gap-1 text-slate-600">
          <div className="text-[11px] font-mono font-bold text-slate-500">
            USD/TWD <span className="text-slate-900">${usdTwdRate.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                playClickSound();
                onTogglePrivacy();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 transition"
              title={isPrivacy ? '顯示金額' : '隱藏金額'}
            >
              {isPrivacy ? <EyeOff className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                playClickSound();
                onManualRefresh();
              }}
              className={`p-1.5 rounded-lg hover:bg-slate-50 text-slate-600 transition ${isFetchingPrices ? 'animate-spin text-indigo-600' : ''}`}
              title="即時更新報價"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                playClickSound();
                onToggleAdmin();
              }}
              className={`p-1.5 rounded-lg transition ${isAdmin ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-400'}`}
              title="管理者模式"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Status Button */}
        <button
          onClick={() => {
            playClickSound();
            onOpenSyncModal();
          }}
          className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition flex items-center justify-between shadow-2xs"
        >
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>雲端同步</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            {cloudSyncUrl ? '已綁定' : '未同步'}
          </span>
        </button>
      </div>
    </aside>
  );
};
