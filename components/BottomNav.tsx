'use client';

import React from 'react';
import { Calendar, Plus, BookOpen, LineChart } from 'lucide-react';

export type TabType = 'today' | 'log' | 'recipes' | 'trends';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: Calendar },
    { id: 'log' as TabType, label: 'Log', icon: Plus, isPrimary: true },
    { id: 'recipes' as TabType, label: 'Recipes', icon: BookOpen },
    { id: 'trends' as TabType, label: 'Trends', icon: LineChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 max-w-lg mx-auto">
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
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 group-active:scale-90 ${
                    isActive
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 text-emerald-400 group-hover:bg-slate-700'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[2.75]" />
                </div>
                <span
                  className={`text-[11px] tracking-tight mt-0.5 ${
                    isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
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
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
