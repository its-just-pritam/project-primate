'use client';

import React, { useState } from 'react';
import { PlanAnalytics } from '@/types/nutrition';
import { Target, Flame, Zap, ArrowRight, TrendingDown, Utensils, Clock, Info } from 'lucide-react';

interface PlanCardProps {
  plan: PlanAnalytics | null;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const [showInfo, setShowInfo] = useState(false);
  if (!plan) return null;

  const weightToLose = Math.max(0, plan.currentWeight - plan.targetWeight);
  // Same 7,700 kcal/kg basis the server uses for progressPercent
  const kgLost = Math.max(0, plan.totalCalorieDeficit / 7700);

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
              (-{weightToLose} kg target)
            </span>
          </div>
        </div>
      </div>

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
              Total Burnt
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
            <p className="mt-1 text-4xl font-extrabold leading-none text-emerald-400">
              {plan.progressPercent}
              <span className="text-xl text-emerald-400/70">%</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-400 text-right leading-tight">
            {kgLost.toFixed(1)} kg
            <br />
            of {weightToLose} kg
          </p>
        </div>
        <div className="mt-3 w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(2, plan.progressPercent)}%` }}
          />
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
                  Projected date based on your average daily deficit so far. Increasing your average
                  deficit will help you reach your goal earlier.
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
