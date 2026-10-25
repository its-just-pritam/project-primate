'use client';

import React, { useState } from 'react';
import { IconCalendar, IconBook2, IconChartBarPopular } from '@tabler/icons-react';

export type TabType = 'today' | 'log' | 'recipes' | 'trends';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  avatar?: string;
  onOpenProfile: () => void;
  isHidden?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab, avatar, onOpenProfile, isHidden = false }) => {
  const [ripple, setRipple] = useState<{ id: string; sequence: number } | null>(null);
  const triggerRipple = (id: string) => setRipple((previous) => ({ id, sequence: (previous?.sequence ?? 0) + 1 }));

  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: IconCalendar },
    { id: 'recipes' as TabType, label: 'Recipes', icon: IconBook2 },
    { id: 'log' as TabType, label: 'Log', isPrimary: true },
    { id: 'trends' as TabType, label: 'Trends', icon: IconChartBarPopular },
  ];

  return (
    <nav className={`liquid-glass-panel fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 right-auto z-40 w-[85%] max-w-md -translate-x-1/2 rounded-[1.65rem] px-2 py-2 md:bottom-4 md:max-w-2xl md:px-8 transition-transform duration-300 ease-in-out ${isHidden ? 'translate-y-[calc(100%+2rem)] pointer-events-none md:translate-y-0 md:pointer-events-auto' : 'translate-y-0'}`}>
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                onClick={() => { triggerRipple(tab.id); onChangeTab(tab.id); }}
                aria-label={tab.label}
                title={tab.label}
                className="menu-ripple-button group relative flex flex-col items-center justify-center py-1 px-3"
              >
                {ripple?.id === tab.id && <span key={ripple.sequence} aria-hidden="true" className="menu-ripple-effect" />}
                <div className={`log-orb relative flex h-[46px] w-[46px] items-center justify-center rounded-full transition-transform duration-200 group-active:scale-90 ${isActive ? 'log-orb-active' : ''}`}>
                  <span aria-hidden="true" className="log-orb-fluid" />
                  <span aria-hidden="true" className="log-orb-gloss" />
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="log-orb-plus relative z-10 h-[27px] w-[27px]">
                    <path d="M12 5.5v13M5.5 12h13" fill="none" stroke="#063b32" strokeWidth="3.2" strokeLinecap="round" />
                    <path d="M11.35 6v12M5.9 11.35h12" fill="none" stroke="#0f766e" strokeOpacity="0.7" strokeWidth="0.8" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              onClick={() => { triggerRipple(tab.id); onChangeTab(tab.id); }}
              aria-label={tab.label}
              title={tab.label}
              className={`menu-ripple-button relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ripple?.id === tab.id && <span key={ripple.sequence} aria-hidden="true" className="menu-ripple-effect" />}
              <span className="h-10 w-10 flex items-center justify-center">
                <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { triggerRipple('profile'); onOpenProfile(); }}
          aria-label="Profile"
          title="Edit user & plan"
          className="menu-ripple-button relative flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-150"
        >
          {ripple?.id === 'profile' && <span key={ripple.sequence} aria-hidden="true" className="menu-ripple-effect" />}
          <span className="h-10 w-10 flex items-center justify-center">
            <span className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-sm leading-none">
              {avatar || '🥑'}
            </span>
          </span>
        </button>
      </div>
    </nav>
  );
};
