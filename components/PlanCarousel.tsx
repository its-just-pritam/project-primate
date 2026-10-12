'use client';

import React, { useEffect, useRef } from 'react';
import { PlanAnalytics } from '@/types/nutrition';
import { PlanCard } from './PlanCard';

interface PlanCarouselProps {
  plans: PlanAnalytics[];
  index: number;
  onIndexChange: (index: number) => void;
}

// Swipeable cards (native scroll-snap); the earliest plan comes first.
export const PlanCarousel: React.FC<PlanCarouselProps> = ({ plans, index, onIndexChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target });
  }, [index, plans.length]);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < plans.length) onIndexChange(next);
  };

  if (plans.length === 0) return null;
  if (plans.length === 1) return <PlanCard plan={plans[0]} />;

  return (
    <div className="space-y-2">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {plans.map((p, i) => (
          <div key={`${p.planName}-${p.startDate}-${i}`} className="w-full shrink-0 snap-center">
            <PlanCard plan={p} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5" aria-label="Plan pages">
        {plans.map((p, i) => (
          <button
            key={`${p.planName}-${p.startDate}-${i}`}
            type="button"
            aria-label={`Show plan ${p.planName}`}
            onClick={() => onIndexChange(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-5 bg-emerald-400' : 'w-1.5 bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
