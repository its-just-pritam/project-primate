'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconCalendarCheck, IconNotebook, IconChartDots3, IconUserSquareRounded } from '@tabler/icons-react';

export type TabType = 'today' | 'log' | 'recipes' | 'trends';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenProfile: () => void;
  isHidden?: boolean;
  isProfileActive?: boolean;
}

// Where the droplet last rested. Module-level because the profile screen renders its own BottomNav,
// so the droplet can still flow between that nav and the main one.
let lastDropletX: number | null = null;

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab, onOpenProfile, isHidden = false, isProfileActive = false }) => {
  const [ripple, setRipple] = useState<{ id: string; sequence: number } | null>(null);
  const triggerRipple = (id: string) => setRipple((previous) => ({ id, sequence: (previous?.sequence ?? 0) + 1 }));
  const slotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dropletRef = useRef<HTMLSpanElement>(null);
  const activeSlot = isProfileActive ? 'profile' : currentTab;

  // Liquid droplet behind the selected icon: it stretches toward the new tab, squashes as it lands, and is
  // absorbed into the orb when Log is selected.
  const placeDroplet = (animate: boolean) => {
    const droplet = dropletRef.current;
    const slot = slotRefs.current[activeSlot];
    if (!droplet || !slot) return;
    const x = slot.offsetLeft + slot.offsetWidth / 2;
    const absorbed = activeSlot === 'log';
    const at = (position: number, scaleX: number, scaleY: number) =>
      `translate(${position}px, -50%) translateX(-50%) scale(${scaleX}, ${scaleY})`;
    droplet.style.transform = at(x, absorbed ? 0.3 : 1, absorbed ? 0.3 : 1);
    droplet.style.opacity = absorbed ? '0' : '1';
    const from = lastDropletX;
    lastDropletX = x;
    if (!animate || from === null || from === x || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const stretch = Math.min(0.9, Math.abs(x - from) / 140);
    droplet.animate(
      absorbed
        ? [
            { transform: at(from, 1, 1), opacity: 1 },
            { transform: at((from + x) / 2, 1 + stretch, 0.7), opacity: 1, offset: 0.55 },
            { transform: at(x, 0.3, 0.3), opacity: 0 },
          ]
        : [
            { transform: at(from, 1, 1), easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
            { transform: at(from + (x - from) * 0.5, 1 + stretch, 1 - stretch * 0.35), offset: 0.38, easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)' },
            { transform: at(x, 0.84, 1.14), offset: 0.66, easing: 'ease-in-out' },
            { transform: at(x, 1.07, 0.95), offset: 0.84, easing: 'ease-in-out' },
            { transform: at(x, 1, 1) },
          ],
      { duration: absorbed ? 300 : 420, easing: 'linear' },
    );
  };

  useLayoutEffect(() => {
    placeDroplet(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot]);

  useEffect(() => {
    const row = dropletRef.current?.parentElement;
    if (!row) return;
    const observer = new ResizeObserver(() => placeDroplet(false));
    observer.observe(row);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot]);

  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: IconCalendarCheck },
    { id: 'recipes' as TabType, label: 'Recipes', icon: IconNotebook },
    { id: 'log' as TabType, label: 'Log', isPrimary: true },
    { id: 'trends' as TabType, label: 'Trends', icon: IconChartDots3 },
  ];

  return (
    <nav className={`liquid-glass-panel fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 right-auto z-40 w-[85%] max-w-md -translate-x-1/2 rounded-[1.65rem] px-2 py-2 md:bottom-4 md:max-w-2xl md:px-8 transition-transform duration-300 ease-in-out ${isHidden ? 'translate-y-[calc(100%+2rem)] pointer-events-none md:translate-y-0 md:pointer-events-auto' : 'translate-y-0'}`}>
      <div className="relative flex items-center justify-around">
        <span ref={dropletRef} aria-hidden="true" className="nav-droplet" />
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = !isProfileActive && currentTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                ref={(element) => { slotRefs.current[tab.id] = element; }}
                onClick={() => { triggerRipple(tab.id); onChangeTab(tab.id); }}
                aria-label={tab.label}
                title={tab.label}
                className="menu-ripple-button group relative flex min-w-0 flex-1 flex-col items-center justify-center py-1"
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
          if (!Icon) return null;
          return (
            <button
              key={tab.id}
              ref={(element) => { slotRefs.current[tab.id] = element; }}
              onClick={() => onChangeTab(tab.id)}
              aria-label={tab.label}
              title={tab.label}
              className={`menu-ripple-button relative flex min-w-0 flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="relative h-10 w-10 flex items-center justify-center">
                <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </span>
            </button>
          );
        })}
        <button
          type="button"
          ref={(element) => { slotRefs.current.profile = element; }}
          onClick={onOpenProfile}
          aria-label="Profile"
          aria-current={isProfileActive ? 'page' : undefined}
          title="Edit user & plan"
          className={`menu-ripple-button relative flex min-w-0 flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 ${isProfileActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <span className="relative h-10 w-10 flex items-center justify-center">
            <IconUserSquareRounded aria-hidden="true" className={`h-6 w-6 ${isProfileActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </span>
        </button>
      </div>
    </nav>
  );
};
