'use client';

import React from 'react';
import { DishIngredient, Micronutrients, MICRO_FIELDS } from '@/types/nutrition';

interface IngredientBreakdownProps {
  ingredients?: DishIngredient[];
}

const MicroGrid: React.FC<{ micros: Micronutrients }> = ({ micros }) => (
  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5">
    {MICRO_FIELDS.map((f) => (
      <div key={f.key} className="flex justify-between text-[10px] text-slate-400">
        <span>{f.label}</span>
        <span className="text-slate-200 font-medium">
          {micros[f.key]} {f.unit}
        </span>
      </div>
    ))}
  </div>
);

export const IngredientBreakdown: React.FC<IngredientBreakdownProps> = ({ ingredients }) => {
  if (!ingredients || ingredients.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
        No ingredient details available for this dish.
      </p>
    );
  }

  return (
    <div className="pt-2 border-t border-slate-800/60 space-y-2">
      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Ingredients ({ingredients.length})
      </h5>
      {ingredients.map((ing, i) => (
        <div key={`${ing.name}-${i}`} className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              {ing.name}{' '}
              <span className="text-slate-400 font-normal">
                · {ing.amount}
                {ing.unit ? ` ${ing.unit}` : ''}
              </span>
            </span>
            <span className="text-xs font-bold text-white">{ing.calories} kcal</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-medium">
            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">P: {ing.protein}g</span>
            <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">C: {ing.carbs}g</span>
            <span className="text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">F: {ing.fats}g</span>
          </div>
          <MicroGrid micros={ing.micros} />
        </div>
      ))}
    </div>
  );
};
