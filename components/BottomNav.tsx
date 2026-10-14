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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-md md:max-w-3xl lg:max-w-5xl mx-auto md:px-8">
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
                <div
                  className={`h-[46px] w-[46px] rounded-full flex items-center justify-center transition-all duration-200 group-active:scale-90 ${
                    isActive
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 text-emerald-400 group-hover:bg-slate-700'
                  }`}
                >
                  <Plus className="w-[23px] h-[23px] stroke-[2.75]" />
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
