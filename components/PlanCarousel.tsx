'use client';

import React, { useEffect, useRef } from 'react';
import { PlanAnalytics } from '@/types/nutrition';
import { PlanCard } from './PlanCard';
import { GarminCarouselCard } from './GarminCarouselCard';

interface PlanCarouselProps {
  plans: PlanAnalytics[];
  index: number;
  onIndexChange: (index: number) => void;
}

// Swipeable cards (native scroll-snap); Garmin follows every active plan.
export const PlanCarousel: React.FC<PlanCarouselProps> = ({ plans, index, onIndexChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollDrivenIndex = useRef<number | null>(null);
  const [viewportHeight, setViewportHeight] = React.useState<number>();
  const [garminEnabled, setGarminEnabled] = React.useState(false);
  const slideCount = plans.length + (garminEnabled ? 1 : 0);

  useEffect(() => {
    let current = true;
    const loadGarminStatus = async () => {
      try {
        const response = await fetch('/api/garmin/integration', { cache: 'no-store' });
        const status = await response.json();
        if (current) setGarminEnabled(response.ok && Boolean(status.connected));
      } catch {
        if (current) setGarminEnabled(false);
      }
    };
    void loadGarminStatus();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (plans.length > 0 && !garminEnabled && index >= plans.length) onIndexChange(plans.length - 1);
  }, [garminEnabled, index, onIndexChange, plans.length]);

  useEffect(() => {
    if (scrollDrivenIndex.current === index) {
      scrollDrivenIndex.current = null;
      return;
    }
    const el = trackRef.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 2) el.scrollTo({ left: target, behavior: 'smooth' });
  }, [index, plans.length, garminEnabled]);

  useEffect(() => {
    const activeSlide = slideRefs.current[index];
    if (!activeSlide) return;
    const updateHeight = () => setViewportHeight(activeSlide.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(activeSlide);
    return () => observer.disconnect();
  }, [index, plans.length, garminEnabled]);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < slideCount) {
      scrollDrivenIndex.current = next;
      onIndexChange(next);
    }
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden transition-[height] duration-300 ease-out" style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}>
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex h-fit items-start overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {plans.map((p, i) => (
            <div key={`${p.planName}-${p.startDate}-${i}`} ref={(element) => { slideRefs.current[i] = element; }} className="w-full shrink-0 snap-center self-start">
              <PlanCard plan={p} />
            </div>
          ))}
          {garminEnabled && <div ref={(element) => { slideRefs.current[plans.length] = element; }} className="w-full shrink-0 snap-center self-start">
            <GarminCarouselCard isActive={index === plans.length} />
          </div>}
        </div>
      </div>
      {slideCount > 1 && <div className="flex items-center justify-center gap-1.5" aria-label="Plan and Garmin pages">
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
          {garminEnabled && <button
            type="button"
            aria-label="Show Garmin card"
            aria-current={index === plans.length ? 'page' : undefined}
            onClick={() => onIndexChange(plans.length)}
            className={`h-1.5 rounded-full transition-all ${
              index === plans.length ? 'w-5 bg-sky-300' : 'w-1.5 bg-slate-700'
            }`}
          />}
        </div>}
    </div>
  );
};
