'use client';

import React from 'react';
import { DishIngredient } from '@/types/nutrition';

interface IngredientBreakdownProps {
  ingredients?: DishIngredient[];
}

export const IngredientBreakdown: React.FC<IngredientBreakdownProps> = ({ ingredients }) => {
  if (!ingredients || ingredients.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
        No ingredient details available for this dish.
      </p>
    );
  }

  return (
    <div className="log-ingredients-accent app-card-surface relative overflow-hidden rounded-2xl p-2.5">
      <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
        Ingredients <span className="ml-1 font-medium normal-case text-slate-400">· {ingredients.length} items</span>
      </h5>
      <div className="mt-1">
        {ingredients.map((ing, i) => (
          <div key={`${ing.name}-${i}`} className={`py-1 ${i > 0 ? 'border-t border-slate-400/10' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white">
                {ing.name}{' '}
                <span className="text-white font-normal">
                  · {ing.amount}
                  {ing.unit ? ` ${ing.unit}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-white">{ing.calories} kcal</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-medium">
              <span className="text-white bg-rose-500/10 px-1.5 py-0.5 rounded">P: {ing.protein}g</span>
              <span className="text-white bg-amber-500/10 px-1.5 py-0.5 rounded">C: {ing.carbs}g</span>
              <span className="text-white bg-sky-500/10 px-1.5 py-0.5 rounded">F: {ing.fats}g</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
