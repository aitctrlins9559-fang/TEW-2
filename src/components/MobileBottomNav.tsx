import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  Calendar,
  Plus,
  Sparkles,
  ListFilter,
  BarChart3,
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
  onOpenAddModal,
  onOpenAICopilot,
  portfolioCount,
}) => {
  return (
    <>
      {/* Spacer to prevent page bottom content from being blocked by floating bottom nav bar */}
      <div className="h-24 lg:hidden" />

      {/* Floating Luminous Mobile Bottom Rail */}
      <nav className="fixed bottom-3 left-3 right-3 lg:hidden bg-white/95 backdrop-blur-xl border border-slate-200/90 z-50 px-2 py-1.5 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] max-w-md mx-auto">
        <div className="grid grid-cols-5 items-center justify-between gap-1">
          {/* Tab 1: Overview */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('overview');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition btn-interact ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight font-bold">總覽</span>
          </button>

          {/* Tab 2: Portfolio */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('portfolio');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition btn-interact relative ${
              activeTab === 'portfolio'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <PieChart className={`w-4 h-4 ${activeTab === 'portfolio' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight font-bold">持股</span>
            {portfolioCount > 0 && (
              <span className={`absolute -top-0.5 right-1.5 text-[8px] font-mono font-black px-1 rounded-full ${activeTab === 'portfolio' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-800'}`}>
                {portfolioCount}
              </span>
            )}
          </button>

          {/* Central Prominent CTA: Add Stock */}
          <div className="flex items-center justify-center relative -top-3">
            <button
              onClick={() => {
                playClickSound();
                onOpenAddModal();
              }}
              className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 btn-interact border-2 border-white transition active:scale-95"
              title="快速新增持股"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* Tab 4: Dividend / Calendar */}
          <button
            onClick={() => {
              playClickSound();
              onSelectTab('calendar');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition btn-interact ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'calendar' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight font-bold">除息</span>
          </button>

          {/* Tab 5: AI / Charts */}
          <button
            onClick={() => {
              playClickSound();
              onOpenAICopilot();
            }}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition btn-interact text-slate-500 hover:text-indigo-600 font-medium"
            title="開啟 AI 智算戰情室"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] tracking-tight font-bold text-slate-600">AI戰情</span>
          </button>
        </div>
      </nav>
    </>
  );
};
