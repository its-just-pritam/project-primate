'use client';

import React from 'react';
import { Calendar, Plus, BookOpen, LineChart } from 'lucide-react';

export type TabType = 'today' | 'log' | 'recipes' | 'trends';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  avatar?: string;
  onOpenProfile: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab, avatar, onOpenProfile }) => {
  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: Calendar },
    { id: 'recipes' as TabType, label: 'Recipes', icon: BookOpen },
    { id: 'log' as TabType, label: 'Log', icon: Plus, isPrimary: true },
    { id: 'trends' as TabType, label: 'Trends', icon: LineChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-md md:max-w-none mx-auto md:px-8">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                aria-label={tab.label}
                className="flex flex-col items-center justify-center py-1 px-3 group"
              >
                <div className={`log-orb relative flex h-[46px] w-[46px] items-center justify-center rounded-full transition-transform duration-200 group-active:scale-90 ${isActive ? 'log-orb-active' : ''}`}>
                  <span aria-hidden="true" className="log-orb-fluid" />
                  <span aria-hidden="true" className="log-orb-gloss" />
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="log-orb-plus relative z-10 h-[23px] w-[23px]">
                    <path d="M12 5.5v13M5.5 12h13" fill="none" stroke="#04151a" strokeWidth="4" strokeLinecap="round" />
                    <path d="M11.35 6v12M5.9 11.35h12" fill="none" stroke="#9fffe0" strokeOpacity="0.5" strokeWidth="0.8" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="h-8 w-8 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </span>
              <span className="text-[11px] leading-none tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Profile"
          title="Edit user & plan"
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-150"
        >
          <span className="h-8 w-8 flex items-center justify-center">
            <span className="w-[27px] h-[27px] rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-sm leading-none">
              {avatar || '🥑'}
            </span>
          </span>
          <span className="text-[11px] leading-none tracking-tight mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
};
