'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlanAnalytics } from '@/types/nutrition';
import { ArrowRight, Info, Share2, X } from 'lucide-react';
import { BowlFoodIcon } from '@phosphor-icons/react/dist/csr/BowlFood';
import { LightningIcon } from '@phosphor-icons/react/dist/csr/Lightning';
import { FireIcon } from '@phosphor-icons/react/dist/csr/Fire';
import { TargetIcon } from '@phosphor-icons/react/dist/csr/Target';
import { CalendarDotsIcon } from '@phosphor-icons/react/dist/csr/CalendarDots';
import { INVITATION_URL, SHARE_DESIGNS, buildShareSvg, loadShareAssets, renderShareImage, svgToDataUrl } from '@/lib/planShareImages';

type PreparedShareImage = (typeof SHARE_DESIGNS)[number] & { preview: string; file: File };

// Lava-lamp ring: blobs drift along the gauge arc (pre-rotation coordinates, 270° from the bottom-left end)
// and a "goo" filter melts them into the ring.
const GAUGE_ARC_PATH = 'M233 130 A103 103 0 1 1 130 27';
const LAVA_BLOBS = [
  { r: 10, dur: 9, begin: 0, points: '0;.55;0', accent: 'start' },
  { r: 8, dur: 11, begin: -3, points: '.35;1;.35', accent: 'end' },
  { r: 11.5, dur: 13, begin: -6, points: '.9;.15;.9', accent: 'start' },
] as const;

interface PlanCardProps {
  plan: PlanAnalytics | null;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Rendered when the picker opens, so tapping a design can share straight away while the tap still counts as a user gesture
  const [shareImages, setShareImages] = useState<PreparedShareImage[] | null>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPickerOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pickerOpen]);
  const [selectedCoreMetric, setSelectedCoreMetric] = useState(3);
  const metricSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const gaugeGradientId = useId().replace(/:/g, '');
  // SVG animations ignore prefers-reduced-motion in CSS, so the lava blobs check it here
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  if (!plan) return null;

  const targetWeightDelta = plan.targetWeight - plan.currentWeight;
  const weightDeltaKg = plan.totalWeightChangeGrams / 1000;
  const fatMassDeltaKg = plan.totalFatMassChangeGrams / 1000;
  const muscleMassDeltaKg = plan.totalMuscleMassChangeGrams / 1000;
  const isWeightGain = weightDeltaKg > 0;
  const progressBarWidth = Math.min(100, Math.abs(plan.progressPercent));
  const coreMetrics = [
    { label: 'Total Consumed', value: plan.totalCalorieConsumed.toLocaleString(), unit: 'kcal', Icon: BowlFoodIcon, iconColor: '#93c35a', highlight: false, accentStart: '#93c35a', accentEnd: '#5a8c36', glow: 'rgba(147,195,90,0.58)' },
    { label: 'Total Burnt incl. TEF', value: plan.totalCalorieBurnt.toLocaleString(), unit: 'kcal', Icon: LightningIcon, iconColor: '#fcd34d', highlight: false, accentStart: '#fde047', accentEnd: '#f59e0b', glow: 'rgba(250,204,21,0.5)' },
    { label: 'Resting Burn', value: plan.restingCalories.toLocaleString(), unit: 'kcal/d', Icon: FireIcon, iconColor: '#38bdf8', highlight: false, accentStart: '#38bdf8', accentEnd: '#2563eb', glow: 'rgba(56,189,248,0.5)' },
    { label: 'Avg Daily Deficit', value: plan.averageCalorieDeficit.toLocaleString(), unit: 'kcal/d', Icon: TargetIcon, iconColor: '#ef4444', highlight: false, accentStart: '#fb923c', accentEnd: '#ef4444', glow: 'rgba(239,68,68,0.58)' },
    { label: 'Total Deficit', value: plan.totalCalorieDeficit.toLocaleString(), unit: 'kcal', Icon: FireIcon, iconColor: '#fb923c', highlight: false, accentStart: '#fb923c', accentEnd: '#ea580c', glow: 'rgba(251,146,60,0.58)' },
    { label: 'Days on Plan', value: String(plan.daysElapsed), unit: 'days', Icon: CalendarDotsIcon, iconColor: '#818cf8', highlight: false, accentStart: '#60a5fa', accentEnd: '#4f46e5', glow: 'rgba(129,140,248,0.55)' },
  ];
  const openSharePicker = async () => {
    setShareMessage('');
    setShareImages(null);
    setPickerOpen(true);
    try {
      const assets = await loadShareAssets();
      const prepared = await Promise.all(SHARE_DESIGNS.map(async (design) => ({
        ...design,
        preview: svgToDataUrl(buildShareSvg(design.id, plan, assets)),
        file: await renderShareImage(design.id, plan, assets),
      })));
      setShareImages(prepared);
    } catch (error) {
      setPickerOpen(false);
      setShareMessage(error instanceof Error ? error.message : 'Could not export the plan image.');
    }
  };

  const shareImage = async (image: File) => {
    setSharing(true);
    setShareMessage('');
    try {
      const shareData = {
        files: [image],
        title: `${plan.userName}'s active plan on Platito`,
        text: `${plan.userName} invited you to join Platito: ${INVITATION_URL}`,
      };
      if (navigator.canShare?.({ files: [image] }) && navigator.share) {
        try {
          await navigator.share(shareData);
          setPickerOpen(false);
          setShareMessage('Plan image shared.');
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          throw error;
        }
      } else {
        const objectUrl = URL.createObjectURL(image);
        const download = document.createElement('a');
        download.href = objectUrl;
        download.download = image.name;
        download.click();
        URL.revokeObjectURL(objectUrl);
        setPickerOpen(false);
        try {
          await navigator.clipboard.writeText(shareData.text);
          setShareMessage('Image downloaded and invitation link copied.');
        } catch {
          setShareMessage(`Image downloaded. Invitation link: ${INVITATION_URL}`);
        }
      }
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : 'Could not export the plan image.');
    } finally {
      setSharing(false);
    }
  };

  const sharePicker = pickerOpen && createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerOpen(false); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="share-picker-title" className="app-card-surface w-full max-w-lg rounded-[22px] border border-slate-700/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="share-picker-title" className="text-sm font-bold text-white">Share your progress</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Choose an image style</p>
          </div>
          <button type="button" onClick={() => setPickerOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 items-end gap-3">
          {(shareImages ?? SHARE_DESIGNS).map((design) => {
            const prepared = shareImages ? (design as PreparedShareImage) : null;
            return (
              <button
                key={design.id}
                type="button"
                disabled={!prepared || sharing}
                onClick={() => prepared && void shareImage(prepared.file)}
                aria-label={`Share the ${design.title} image`}
                className="group flex flex-col items-center gap-2 rounded-xl p-1 text-center transition disabled:cursor-wait"
              >
                <span
                  className="block w-full overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-emerald-400/70 group-active:scale-[0.97]"
                  style={{ aspectRatio: `${design.width} / ${design.height}` }}
                >
                  {prepared ? <img src={prepared.preview} alt="" className="h-full w-full object-cover" /> : <span className="block h-full w-full animate-pulse bg-white/[0.05]" />}
                </span>
                <span>
                  <span className="block text-[11px] font-bold text-white">{design.title}</span>
                  <span className="block text-[10px] text-slate-500">{design.format}</span>
                </span>
              </button>
            );
          })}
        </div>
        {!shareImages && <p role="status" className="mt-3 text-center text-[11px] text-slate-400">Preparing images…</p>}
      </section>
    </div>,
    document.body,
  );

  return (
    <>
    {sharePicker}
    <div className="app-card-surface rounded-2xl p-4 space-y-3.5 relative overflow-hidden">

      {/* Header with Goal */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 tracking-wide uppercase">
              Active Plan
            </span>
            <span className="text-xs text-slate-400 font-medium truncate">· {plan.planName}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 mt-1">
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
              <span>{plan.currentWeight} kg</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">{plan.targetWeight} kg</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              ({targetWeightDelta > 0 ? '+' : ''}{targetWeightDelta} kg to target)
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => void openSharePicker()}
            disabled={sharing}
            aria-label={sharing ? 'Sharing plan image' : 'Share active plan'}
            title={sharing ? 'Sharing plan image' : 'Share active plan'}
            className="shrink-0 inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-300 disabled:opacity-60"
          >
            {sharing ? <span aria-hidden="true">…</span> : <Share2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {shareMessage && <p role="status" className="relative z-10 text-[11px] text-emerald-300">{shareMessage}</p>}

      {/* Mobile calorie gauge */}
      <div className="relative z-10 hidden max-sm:block pt-1">
        {(() => {
          const selectedMetric = coreMetrics[selectedCoreMetric];
          const bottomMetrics = coreMetrics.filter((_, index) => index !== selectedCoreMetric);
          return (
            <div
              className="mx-auto flex w-full max-w-[360px] flex-col items-center touch-pan-y"
              onTouchStart={(event) => {
                const touch = event.touches[0];
                metricSwipeStart.current = { x: touch.clientX, y: touch.clientY };
                // Keep metric swipes from also changing the surrounding plan card.
                event.stopPropagation();
              }}
              onTouchEnd={(event) => {
                const start = metricSwipeStart.current;
                metricSwipeStart.current = null;
                event.stopPropagation();
                if (!start) return;
                const touch = event.changedTouches[0];
                const dx = touch.clientX - start.x;
                const dy = touch.clientY - start.y;
                if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
                setSelectedCoreMetric((current) => (current + (dx < 0 ? 1 : -1) + coreMetrics.length) % coreMetrics.length);
              }}
            >
              <div className="relative h-[276px] w-[276px] max-w-full">
                <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full rotate-[135deg]" aria-hidden="true">
                  <defs>
                    <linearGradient id={gaugeGradientId} x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={selectedMetric.accentStart} />
                      <stop offset="100%" stopColor={selectedMetric.accentEnd} />
                    </linearGradient>
                    <filter id={`${gaugeGradientId}-goo`} x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
                      <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
                    </filter>
                  </defs>
                  <circle cx="130" cy="130" r="103" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="13" strokeDasharray="485 647" strokeLinecap="round" />
                  <g style={{ filter: `${reduceMotion ? '' : `url(#${gaugeGradientId}-goo) `}drop-shadow(0 0 8px ${selectedMetric.glow})` }}>
                    <circle cx="130" cy="130" r="103" fill="none" stroke={`url(#${gaugeGradientId})`} strokeWidth="13" strokeDasharray="485 647" strokeLinecap="round" />
                    {!reduceMotion && LAVA_BLOBS.map((blob, index) => (
                      <circle key={index} r={blob.r} fill={blob.accent === 'start' ? selectedMetric.accentStart : selectedMetric.accentEnd}>
                        <animateMotion path={GAUGE_ARC_PATH} dur={`${blob.dur}s`} begin={`${blob.begin}s`} repeatCount="indefinite" calcMode="spline" keyPoints={blob.points} keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" />
                        <animate attributeName="r" values={`${blob.r * 0.75};${blob.r * 1.1};${blob.r * 0.75}`} dur={`${blob.dur / 2}s`} begin={`${blob.begin}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                  </g>
                </svg>
                <div key={selectedMetric.label} className="metric-selection-enter absolute inset-[30px] flex flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(45,61,86,0.34),rgba(15,23,42,0.08)_68%)] text-center">
                  <selectedMetric.Icon aria-hidden="true" className="mb-2" size={34} weight="fill" color={selectedMetric.iconColor} style={{ filter: `drop-shadow(0 0 7px ${selectedMetric.glow})` }} />
                  <span className="max-w-[172px] text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {selectedMetric.label}
                  </span>
                  <span className={`mt-1 text-[38px] font-black leading-none tracking-tight ${selectedMetric.highlight ? 'text-emerald-300' : 'text-white'}`}>
                    {selectedMetric.value}
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-slate-400">{selectedMetric.unit}</span>
                </div>
              </div>

              <div className="mt-1 grid w-full grid-cols-5 gap-1.5">
                {bottomMetrics.map((metric, positionIndex) => {
                  const metricIndex = coreMetrics.indexOf(metric);
                  return (
                    <button
                      key={metric.label}
                      type="button"
                      aria-label={`Show ${metric.label}: ${metric.value} ${metric.unit}`}
                      aria-pressed={false}
                      onClick={() => setSelectedCoreMetric(metricIndex)}
                      className="metric-selection-enter group relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      {positionIndex > 0 && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -left-[4px] top-0 -bottom-2 w-px bg-gradient-to-b from-transparent via-slate-400/35 to-slate-400/35"
                        />
                      )}
                      <span className="flex h-8 items-center justify-center transition-transform group-active:scale-95">
                        <metric.Icon aria-hidden="true" size={24} weight="fill" color={metric.iconColor} style={{ filter: `drop-shadow(0 0 4px ${metric.glow})` }} />
                      </span>
                    </button>
                  );
                })}
              </div>
              <div aria-hidden="true" className="mt-2 h-px w-full bg-slate-400/35" />
            </div>
          );
        })()}
      </div>

      {/* 6 Core Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 relative z-10 max-sm:hidden">
        {/* Metric 1: Total Calorie Consumed */}
        <div className="app-card-raised rounded-xl p-2.5 flex items-center gap-2.5">
          <span aria-hidden="true" className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-emerald-300"><BowlFoodIcon size={23} weight="fill" color="#93c35a" style={{ filter: 'drop-shadow(0 0 6px rgba(147,195,90,0.58))' }} /></span>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              Total Consumed
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-white">
                {plan.totalCalorieConsumed.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">kcal</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Calorie Burnt */}
        <div className="app-card-raised rounded-xl p-2.5 flex items-center gap-2.5">
          <span aria-hidden="true" className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-amber-300"><LightningIcon size={23} weight="fill" color="#fcd34d" style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.55))' }} /></span>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              Total Burnt incl. TEF
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-white">
                {plan.totalCalorieBurnt.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">kcal</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Resting Burn Baseline */}
        <div className="app-card-raised rounded-xl p-2.5 flex items-center gap-2.5">
          <span aria-hidden="true" className="w-8 h-8 flex items-center justify-center flex-shrink-0"><FireIcon size={23} weight="fill" color="#38bdf8" style={{ filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.58))' }} /></span>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              Resting Burn
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-white">
                {plan.restingCalories.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">kcal/d</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Avg Daily Deficit */}
        <div className="app-card-raised rounded-xl p-2.5 flex items-center gap-2.5">
          <span aria-hidden="true" className="w-8 h-8 flex items-center justify-center flex-shrink-0"><TargetIcon size={23} weight="fill" color="#ef4444" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.62))' }} /></span>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              Avg Daily Deficit
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-white">
                {plan.averageCalorieDeficit.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">kcal/d</span>
            </div>
          </div>
        </div>

        {/* Metric 5: Total Deficit */}
        <div className="app-card-raised rounded-xl p-2.5 flex items-center gap-2.5">
          <span aria-hidden="true" className="w-8 h-8 flex items-center justify-center flex-shrink-0"><FireIcon size={23} weight="fill" color="#fb923c" style={{ filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.62))' }} /></span>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              Total Deficit
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-emerald-400">
                {plan.totalCalorieDeficit.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">kcal</span>
            </div>
          </div>
        </div>

        {/* Metric 6: Days on Plan */}
        <div className="app-card-raised rounded-xl p-2.5 flex items-center gap-2.5">
          <span aria-hidden="true" className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-indigo-300"><CalendarDotsIcon size={23} weight="fill" color="#818cf8" style={{ filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.58))' }} /></span>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              Days on Plan
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-white">
                {plan.daysElapsed}
              </span>
              <span className="text-[10px] text-slate-400">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Goal progress with projected completion date */}
      <div className="relative z-10 pt-0.5" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400 font-semibold">Goal progress</p>
            <p
              className={`mt-1 text-4xl font-extrabold leading-none ${
                plan.progressPercent < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {plan.progressPercent}
              <span className={`text-xl ${plan.progressPercent < 0 ? 'text-rose-400/70' : 'text-emerald-400/70'}`}>%</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-400 text-right leading-tight">
            {weightDeltaKg > 0 ? '+' : ''}
            {weightDeltaKg.toFixed(2)} kg
            <br />
            {isWeightGain ? 'weight gained' : weightDeltaKg < 0 ? 'weight lost' : 'net weight change'}
          </p>
        </div>

        <div className="progress-track-inset relative mt-3 h-3.5 w-full overflow-hidden rounded-full p-[2px]">
          <div
            className={`progress-fill-raised h-full max-w-full rounded-full transition-all duration-700 ${
              plan.progressPercent >= 0
                ? 'bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-200'
                : 'bg-gradient-to-r from-rose-500 to-orange-400 text-rose-200'
            }`}
            style={{ width: `${progressBarWidth}%` }}
          />
        </div>
        <div className="relative mt-3 grid grid-cols-2">
          <div className="px-2.5 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Body Fat</p>
            <p className={`mt-0.5 text-sm font-extrabold ${fatMassDeltaKg > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {fatMassDeltaKg > 0 ? '+' : ''}
              {fatMassDeltaKg.toFixed(2)} kg
            </p>
          </div>
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -bottom-2 w-px bg-gradient-to-b from-transparent via-slate-400/35 to-slate-400/35" />
          <div className="px-2.5 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Muscle Mass</p>
            <p className={`mt-0.5 text-sm font-extrabold ${muscleMassDeltaKg >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
              {muscleMassDeltaKg > 0 ? '+' : ''}
              {muscleMassDeltaKg.toFixed(2)} kg
            </p>
          </div>
        </div>
        <div aria-hidden="true" className="mt-2 h-px w-full bg-slate-400/35" />
        <div className="pt-3 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className="relative flex items-center gap-1">
              <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400 font-semibold">Projected finish</p>
              <button
                type="button"
                aria-label="About the projected date"
                aria-expanded={showInfo}
                onClick={() => setShowInfo((v) => !v)}
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
                onBlur={() => setShowInfo(false)}
                className="block text-slate-500 hover:text-emerald-400 focus:text-emerald-400 outline-none"
              >
                <Info className="w-3 h-3" />
              </button>
              {showInfo && (
                <span
                  role="tooltip"
                  className="absolute left-0 bottom-full mb-2.5 w-60 rounded-lg border border-emerald-500/30 bg-slate-950 px-3 py-2.5 text-left text-[11px] font-normal normal-case tracking-normal leading-relaxed text-slate-300 shadow-xl z-20"
                >
                  Progress is the signed cumulative body-weight delta relative to your target. It
                  combines predicted fat change with wet muscle-mass change from protein balance.
                  <span className="absolute left-[118px] -bottom-[5px] w-2.5 h-2.5 rotate-45 border-r border-b border-emerald-500/30 bg-slate-950" />
                </span>
              )}
            </div>
            <p
              className={`mt-0.5 text-sm font-extrabold truncate ${
                plan.daysRemaining > 0 || plan.projectedDate === 'Target achieved'
                  ? 'text-emerald-300'
                  : 'text-amber-400'
              }`}
            >
              {plan.projectedDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400 font-semibold">Time left</p>
            <p className="mt-0.5 text-sm font-extrabold text-white">
              {plan.daysRemaining > 0 ? `~${plan.daysRemaining} days` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};





