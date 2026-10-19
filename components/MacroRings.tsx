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
    <div className="bg-[#0b1220] rounded-2xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_34px_rgba(0,0,0,0.2)] space-y-4">
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
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
              calSurplus > 0
              ? 'bg-rose-500/10 text-rose-400'
              : 'bg-orange-500/10 text-orange-400'
            }`}
          >
            {calSurplus > 0 ? `${calSurplus} surplus` : calRemaining > 0 ? `${calRemaining} left` : 'Target met'}
          </span>
        </div>
      </div>

      {/* Main Calorie Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${calPercent}%` }}
        />
      </div>

      {/* Macro Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* Protein */}
        <div className="min-w-0 bg-[linear-gradient(155deg,#182438,#101827)] shadow-[5px_6px_14px_rgba(0,0,0,0.22),-2px_-2px_8px_rgba(255,255,255,0.025)] rounded-xl p-2.5 flex flex-col justify-between">
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
        <div className="min-w-0 bg-[linear-gradient(155deg,#182438,#101827)] shadow-[5px_6px_14px_rgba(0,0,0,0.22),-2px_-2px_8px_rgba(255,255,255,0.025)] rounded-xl p-2.5 flex flex-col justify-between">
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
        <div className="min-w-0 bg-[linear-gradient(155deg,#182438,#101827)] shadow-[5px_6px_14px_rgba(0,0,0,0.22),-2px_-2px_8px_rgba(255,255,255,0.025)] rounded-xl p-2.5 flex flex-col justify-between">
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
      </div>
    </div>
    </section>
  );
};
