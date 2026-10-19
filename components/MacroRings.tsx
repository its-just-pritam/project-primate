'use client';

import React from 'react';
import { DailyTargets } from '@/types/nutrition';
import { Beef, Wheat, Droplets } from 'lucide-react';

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MacroRingsProps {
  totals: MacroTotals;
  targets: DailyTargets;
}

export const MacroRings: React.FC<MacroRingsProps> = ({ totals, targets }) => {
  const calPercent = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
  const proteinPercent = Math.min(100, Math.round((totals.protein / targets.protein) * 100));
  const carbsPercent = Math.min(100, Math.round((totals.carbs / targets.carbs) * 100));
  const fatsPercent = Math.min(100, Math.round((totals.fats / targets.fats) * 100));

  const calDiff = Math.round(targets.calories - totals.calories);
  const calRemaining = Math.max(0, calDiff);
  const calSurplus = Math.max(0, -calDiff);

  return (
    <section className="space-y-2 min-w-0">
    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">Nutrients</h3>
    <div className="app-card-surface rounded-2xl p-4 space-y-4">
      {/* Top Banner: Calories */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span aria-hidden="true" className="shrink-0 text-[30px] leading-none">🔥</span>
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {Math.round(totals.calories)}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ {targets.calories} kcal</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Daily Energy Budget</p>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex min-h-6 items-center justify-center px-2.5 py-1 rounded-full text-center text-xs font-bold leading-none ${
              calSurplus > 0
              ? 'bg-rose-500/10 text-rose-400'
              : 'bg-orange-500/10 text-orange-400'
            }`}
          >
            <span className="relative -top-px">
              {calSurplus > 0 ? `${calSurplus} surplus` : calRemaining > 0 ? `${calRemaining} left` : 'Target met'}
            </span>
          </span>
        </div>
      </div>

      {/* Main Calorie Progress Bar */}
      <div className="progress-track-inset w-full rounded-full h-3.5 overflow-hidden p-[2px]">
        <div
          className="progress-fill-raised h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${calPercent}%` }}
        />
      </div>

      {/* Macro Grid */}
      <div className="relative grid grid-cols-3 pt-1">
        {/* Protein */}
        <div className="min-w-0 px-2.5 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
              <Beef className="w-3.5 h-3.5" /> Protein
            </span>
            <span className="text-[10px] text-slate-400 max-[400px]:hidden">{proteinPercent}%</span>
          </div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-base font-bold text-white">
              {Math.round(totals.protein * 10) / 10}g
            </span>
            <span className="text-[10px] text-slate-500">/{targets.protein}g</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-rose-400 rounded-full transition-all duration-500"
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
        </div>

        {/* Carbs */}
        <div className="min-w-0 px-2.5 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Wheat className="w-3.5 h-3.5" /> Carbs
            </span>
            <span className="text-[10px] text-slate-400 max-[400px]:hidden">{carbsPercent}%</span>
          </div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-base font-bold text-white">
              {Math.round(totals.carbs * 10) / 10}g
            </span>
            <span className="text-[10px] text-slate-500">/{targets.carbs}g</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
        </div>

        {/* Fats */}
        <div className="min-w-0 px-2.5 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5" /> Fats
            </span>
            <span className="text-[10px] text-slate-400 max-[400px]:hidden">{fatsPercent}%</span>
          </div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-base font-bold text-white">
              {Math.round(totals.fats * 10) / 10}g
            </span>
            <span className="text-[10px] text-slate-500">/{targets.fats}g</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${fatsPercent}%` }}
            />
          </div>
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute left-1/3 top-0 -bottom-2 w-px bg-gradient-to-b from-transparent via-slate-400/35 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute left-2/3 top-0 -bottom-2 w-px bg-gradient-to-b from-transparent via-slate-400/35 to-transparent" />
      </div>
    </div>
    </section>
  );
};
