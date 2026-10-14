'use client';

import React, { useState } from 'react';
import { Recipe, MealLogEntry } from '@/types/nutrition';
import { Plus, Minus, Check, Sparkles, Utensils, AlertCircle } from 'lucide-react';

interface QuickLoggerProps {
  recipes: Recipe[];
  userName?: string;
  onLogMeal: (entry: MealLogEntry) => Promise<boolean>;
  onNavigateToRecipes: () => void;
}

export const QuickLogger: React.FC<QuickLoggerProps> = ({
  recipes,
  userName,
  onLogMeal,
  onNavigateToRecipes,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    recipes[0]?.id || ''
  );
  const [portion, setPortion] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  // Compute calculated values
  const calPerUnit = selectedRecipe?.calories || 0;
  const proteinPerUnit = selectedRecipe?.protein || 0;
  const carbsPerUnit = selectedRecipe?.carbs || 0;
  const fatsPerUnit = selectedRecipe?.fats || 0;

  const totalCalories = Math.round(calPerUnit * portion);
  const totalProtein = Math.round(proteinPerUnit * portion * 10) / 10;
  const totalCarbs = Math.round(carbsPerUnit * portion * 10) / 10;
  const totalFats = Math.round(fatsPerUnit * portion * 10) / 10;

  const handleAdjustPortion = (delta: number) => {
    setPortion((prev) => Math.max(0.25, Math.round((prev + delta) * 100) / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const dishName = selectedRecipe?.name || '';
    if (!dishName) {
      alert('Please specify a dish name');
      return;
    }

    setIsSubmitting(true);

    const entry: MealLogEntry = {
      dish: dishName,
      portion,
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
      timestamp: new Date().toISOString(),
      user: userName || 'Pritam Mallick',
    };

    const ok = await onLogMeal(entry);
    setIsSubmitting(false);

    if (ok) {
      setSuccessToast(`Logged ${dishName}!`);
      setTimeout(() => setSuccessToast(null), 3000);
      setPortion(1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between shadow-lg shadow-emerald-950/50 animate-in fade-in slide-in-from-top duration-200">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" /> {successToast}
          </span>
          <span className="text-[10px] text-emerald-500">Saved to Sheet</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Recipe Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Select Dish
                </label>
                <button
                  type="button"
                  onClick={onNavigateToRecipes}
                  className="text-[11px] font-medium text-emerald-400 hover:underline"
                >
                  + New Recipe
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {recipes.map((r) => {
                  const isSelected = selectedRecipeId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRecipeId(r.id)}
                      className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-semibold flex items-center gap-2 ${
                            isSelected ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {r.name}
                          {r.isPackaged && (
                            <span className="shrink-0 px-1 py-px rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[8px] font-semibold uppercase leading-none tracking-wide">
                              Pkg
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {r.calories} kcal · {r.protein}g protein ({r.servingUnit})
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Portion Control */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Portion / Servings
                </span>
                <span className="text-xs text-slate-400">
                  Unit: {selectedRecipe?.servingUnit || '1 serving'}
                </span>
              </div>

              <div className="flex items-center justify-center space-x-4 py-2">
                <button
                  type="button"
                  onClick={() => handleAdjustPortion(-0.5)}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 transition-transform"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="text-center min-w-[5rem]">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {portion}
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">servings</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjustPortion(0.5)}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 transition-transform"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Stepper Presets */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {[0.5, 1, 1.5, 2, 3].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPortion(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      portion === val
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients of the selected recipe, scaled to the chosen portion */}
            {selectedRecipe?.ingredients && selectedRecipe.ingredients.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Ingredients ({selectedRecipe.ingredients.length})
                </span>
                <ul className="space-y-1">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <li
                      key={`${ing.name}-${i}`}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-300">{ing.name}</span>
                      <span className="text-slate-400 font-medium">
                        {Math.round(ing.amount * portion * 100) / 100}
                        {ing.unit ? ` ${ing.unit}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

        {/* Live Calculation Preview Card */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Calculated Intake
            </span>
            <span className="font-semibold text-white">
              {totalCalories} kcal
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium pt-1 border-t border-slate-800/60">
            <span className="text-emerald-400">Protein: {totalProtein}g</span>
            <span className="text-amber-400">Carbs: {totalCarbs}g</span>
            <span className="text-sky-400">Fats: {totalFats}g</span>
          </div>
        </div>

        {/* Big Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Recording to Sheet...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Utensils className="w-4 h-4 stroke-[2.5]" />
              Log This Meal
            </span>
          )}
        </button>
      </form>
    </div>
  );
};
