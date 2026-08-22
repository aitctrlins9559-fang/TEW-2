import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  Calendar,
  BarChart3,
  ListFilter,
} from 'lucide-react';
import { playClickSound } from '../utils/audio';

export type MobileTabType = 'overview' | 'portfolio' | 'charts' | 'calendar' | 'all';

interface MobileBottomNavProps {
  activeTab: MobileTabType;
  onSelectTab: (tab: MobileTabType) => void;
  onOpenAddModal: () => void;
  onOpenAICopilot: () => void;
  portfolioCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  portfolioCount,
}) => {
  return (
    <>
      {/* Spacer to prevent page bottom content from being blocked by floating bottom nav bar */}
      <div className="h-20 lg:hidden" />

      {/* Floating Luminous Mobile Bottom Rail */}
      <nav className="fixed bottom-3 left-3 right-3 lg:hidden bg-white border border-slate-100 z-50 px-2.5 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] max-w-md mx-auto">
        <div className="grid grid-cols-5 items-center justify-between gap-1">
          {/* Tab 1: Overview */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('overview');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition btn-interact ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">總覽</span>
          </button>

          {/* Tab 2: Portfolio */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('portfolio');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition btn-interact relative ${
              activeTab === 'portfolio'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <PieChart className={`w-5 h-5 ${activeTab === 'portfolio' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">持股</span>
            {portfolioCount > 0 && (
              <span className={`absolute top-1 right-2 text-[9px] font-mono font-bold px-1 rounded-full ${activeTab === 'portfolio' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {portfolioCount}
              </span>
            )}
          </button>

          {/* Tab 3: Calendar */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('calendar');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition btn-interact ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'calendar' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">日曆</span>
          </button>

          {/* Tab 4: Charts */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('charts');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition btn-interact ${
              activeTab === 'charts'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === 'charts' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">圖表</span>
          </button>

          {/* Tab 5: All View */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('all');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition btn-interact ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <ListFilter className={`w-5 h-5 ${activeTab === 'all' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">全景</span>
          </button>
        </div>
      </nav>
    </>
  );
};
