'use client';

import React, { useState } from 'react';
import { PlanAnalytics } from '@/types/nutrition';
import { Target, Flame, Zap, ArrowRight, TrendingDown, Utensils, Clock, Info, Share2 } from 'lucide-react';

const INVITATION_URL = 'https://project-primate.vercel.app/';

const escapeSvgText = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] || character);

async function createPlanShareImage(plan: PlanAnalytics): Promise<File> {
  const userName = escapeSvgText(plan.userName || 'A Primate Fuel user');
  const planName = escapeSvgText(plan.planName || 'Active plan');
  const projectedDate = escapeSvgText(plan.projectedDate || 'Keep going');
  const weightDeltaKg = plan.totalWeightChangeGrams / 1000;
  const fatDeltaKg = plan.totalFatMassChangeGrams / 1000;
  const muscleDeltaKg = plan.totalMuscleMassChangeGrams / 1000;
  const targetWeightDelta = plan.targetWeight - plan.currentWeight;
  const formatKg = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)} kg`;
  const metric = (x: number, y: number, label: string, value: string, color: string, width = 420) => `
    <rect x="${x}" y="${y}" width="${width}" height="142" rx="24" fill="#101a28" stroke="#263548" stroke-width="2"/>
    <text x="${x + 28}" y="${y + 46}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="22" font-weight="600" letter-spacing="2">${escapeSvgText(label.toUpperCase())}</text>
    <text x="${x + 28}" y="${y + 103}" fill="${color}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeSvgText(value)}</text>`;
  const progressBarWidth = Math.max(0, Math.min(856, 856 * Math.abs(plan.progressPercent) / 100));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1740" viewBox="0 0 1080 1740">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111d"/><stop offset="1" stop-color="#0d2a25"/></linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#34d399"/><stop offset="1" stop-color="#2dd4bf"/></linearGradient>
      </defs>
      <rect width="1080" height="1740" fill="url(#bg)"/>
      <circle cx="980" cy="105" r="220" fill="#10b981" opacity=".08"/>
      <text x="72" y="96" fill="#6ee7b7" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="5">PRIMATE FUEL</text>
      <rect x="72" y="142" width="220" height="42" rx="21" fill="#064e3b"/>
      <text x="182" y="170" text-anchor="middle" fill="#a7f3d0" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">ACTIVE PLAN</text>
      <text x="72" y="246" fill="#ffffff" font-family="Arial, sans-serif" font-size="48" font-weight="700">${planName}</text>
      <text x="72" y="294" fill="#94a3b8" font-family="Arial, sans-serif" font-size="27">A progress snapshot from ${userName}</text>
      <rect x="72" y="344" width="936" height="182" rx="30" fill="#0b1723" stroke="#1e3a35" stroke-width="2"/>
      <text x="112" y="401" fill="#94a3b8" font-family="Arial, sans-serif" font-size="21" font-weight="600" letter-spacing="2">WEIGHT GOAL</text>
      <text x="112" y="478" fill="#ffffff" font-family="Arial, sans-serif" font-size="48" font-weight="700">${escapeSvgText(String(plan.currentWeight))} kg</text>
      <path d="M410 461h54m-14-14 14 14-14 14" fill="none" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="520" y="478" fill="#6ee7b7" font-family="Arial, sans-serif" font-size="48" font-weight="700">${escapeSvgText(String(plan.targetWeight))} kg</text>
      <text x="112" y="509" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20">${targetWeightDelta > 0 ? '+' : ''}${escapeSvgText(String(targetWeightDelta))} kg to target</text>
      <rect x="72" y="550" width="936" height="158" rx="28" fill="#0b1723" stroke="#1e3a35" stroke-width="2"/>
      <text x="108" y="600" fill="#94a3b8" font-family="Arial, sans-serif" font-size="21" font-weight="600" letter-spacing="2">GOAL PROGRESS</text>
      <text x="108" y="664" fill="#6ee7b7" font-family="Arial, sans-serif" font-size="48" font-weight="700">${escapeSvgText(String(plan.progressPercent))}%</text>
      <rect x="390" y="635" width="540" height="16" rx="8" fill="#020617"/>
      <rect x="390" y="635" width="${progressBarWidth * 540 / 856}" height="16" rx="8" fill="url(#accent)"/>
      ${metric(72, 742, 'Total consumed', `${plan.totalCalorieConsumed.toLocaleString()} kcal`, '#c4b5fd')}
      ${metric(588, 742, 'Total burnt incl. TEF', `${plan.totalCalorieBurnt.toLocaleString()} kcal`, '#fdba74')}
      ${metric(72, 908, 'Total deficit', `${plan.totalCalorieDeficit.toLocaleString()} kcal`, '#6ee7b7')}
      ${metric(588, 908, 'Avg daily deficit', `${plan.averageCalorieDeficit.toLocaleString()} kcal/d`, '#fcd34d')}
      ${metric(72, 1074, 'Resting burn', `${plan.restingCalories.toLocaleString()} kcal/d`, '#7dd3fc')}
      ${metric(588, 1074, 'Days on plan', `${plan.daysElapsed} days`, '#5eead4')}
      ${metric(72, 1240, 'Weight change', formatKg(weightDeltaKg), '#ffffff', 288)}
      ${metric(396, 1240, 'Body fat', formatKg(fatDeltaKg), '#6ee7b7', 288)}
      ${metric(720, 1240, 'Muscle mass', formatKg(muscleDeltaKg), '#7dd3fc', 288)}
      <rect x="72" y="1410" width="936" height="118" rx="24" fill="#101a28" stroke="#263548" stroke-width="2"/>
      <text x="108" y="1458" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="2">PROJECTED FINISH</text>
      <text x="108" y="1502" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="700">${projectedDate}</text>
      <text x="974" y="1458" text-anchor="end" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="2">TIME LEFT</text>
      <text x="974" y="1502" text-anchor="end" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="700">${plan.daysRemaining > 0 ? `~${plan.daysRemaining} days` : '—'}</text>
      <text x="72" y="1600" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="27" font-weight="600">Join me on Primate Fuel</text>
      <text x="72" y="1650" fill="#6ee7b7" font-family="Arial, sans-serif" font-size="25">${INVITATION_URL}</text>
      <rect x="72" y="1684" width="936" height="4" rx="2" fill="url(#accent)"/>
      <text x="72" y="1722" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Track nutrition. Build habits. Reach your goal.</text>
    </svg>`;

  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1740;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image export is not supported in this browser.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not create the plan image.')), 'image/png');
    });
    return new File([blob], 'primate-fuel-active-plan.png', { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

interface PlanCardProps {
  plan: PlanAnalytics | null;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  if (!plan) return null;

  const targetWeightDelta = plan.targetWeight - plan.currentWeight;
  const weightDeltaKg = plan.totalWeightChangeGrams / 1000;
  const fatMassDeltaKg = plan.totalFatMassChangeGrams / 1000;
  const muscleMassDeltaKg = plan.totalMuscleMassChangeGrams / 1000;
  const isWeightGain = weightDeltaKg > 0;
  const progressBarWidth = Math.min(100, Math.abs(plan.progressPercent));

  const handleShare = async () => {
    setSharing(true);
    setShareMessage('');
    try {
      const image = await createPlanShareImage(plan);
      const shareData = {
        files: [image],
        title: `${plan.userName}'s active plan on Primate Fuel`,
        text: `${plan.userName} invited you to join Primate Fuel: ${INVITATION_URL}`,
      };
      if (navigator.canShare?.({ files: [image] }) && navigator.share) {
        try {
          await navigator.share(shareData);
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

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3.5 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Goal */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wide uppercase">
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
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          aria-label={sharing ? 'Preparing plan image to share' : 'Share active plan'}
          title={sharing ? 'Preparing plan image' : 'Share active plan'}
          className="shrink-0 inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-300 disabled:opacity-60"
        >
          {sharing ? <span aria-hidden="true">…</span> : <Share2 className="h-4 w-4" />}
        </button>
      </div>
      {shareMessage && <p role="status" className="relative z-10 text-[11px] text-emerald-300">{shareMessage}</p>}

      {/* 6 Core Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        {/* Metric 1: Total Calorie Consumed */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Utensils className="w-4 h-4 stroke-[2.2]" />
          </div>
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
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Zap className="w-4 h-4 stroke-[2.2]" />
          </div>
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

        {/* Metric 3: Total Deficit */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <TrendingDown className="w-4 h-4 stroke-[2.2]" />
          </div>
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

        {/* Metric 4: Avg Daily Deficit */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
            <Flame className="w-4 h-4 stroke-[2.2]" />
          </div>
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

        {/* Metric 5: Resting Burn Baseline */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
            <Target className="w-4 h-4 stroke-[2.2]" />
          </div>
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

        {/* Metric 6: Days on Plan */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
            <Clock className="w-4 h-4 stroke-[2.2]" />
          </div>
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

        <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
          <div
            className={`absolute inset-y-0 left-0 rounded-r-full transition-all duration-700 ${
              plan.progressPercent >= 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-rose-500 to-orange-400'
            }`}
            style={{ width: `${progressBarWidth}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Body Fat</p>
            <p className={`mt-0.5 text-sm font-extrabold ${fatMassDeltaKg > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {fatMassDeltaKg > 0 ? '+' : ''}
              {fatMassDeltaKg.toFixed(2)} kg
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Muscle Mass</p>
            <p className={`mt-0.5 text-sm font-extrabold ${muscleMassDeltaKg >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
              {muscleMassDeltaKg > 0 ? '+' : ''}
              {muscleMassDeltaKg.toFixed(2)} kg
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
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
  );
};
