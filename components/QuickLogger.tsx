'use client';

import React, { useState } from 'react';
import { Recipe, MealLogEntry } from '@/types/nutrition';
import { Plus, Minus, Check, Sparkles, Utensils, AlertCircle, Search, X } from 'lucide-react';

interface QuickLoggerProps {
  recipes: Recipe[];
  userName?: string;
  onLogMeal: (entry: MealLogEntry) => Promise<boolean>;
  onNavigateToRecipes: () => void;
  onboardingHighlight?: boolean;
}

export const QuickLogger: React.FC<QuickLoggerProps> = ({
  recipes,
  userName,
  onLogMeal,
  onNavigateToRecipes,
  onboardingHighlight = false,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    recipes[0]?.id || ''
  );
  const [portion, setPortion] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timestamp, setTimestamp] = useState(getLocalDateTime());

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const showSearch = recipes.length >= 10;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredRecipes = normalizedSearch
    ? recipes.filter((recipe) => recipe.name.toLocaleLowerCase().includes(normalizedSearch))
    : recipes;

  // Compute calculated values
  const calPerUnit = selectedRecipe?.calories || 0;
  const proteinPerUnit = selectedRecipe?.protein || 0;
  const carbsPerUnit = selectedRecipe?.carbs || 0;
  const fatsPerUnit = selectedRecipe?.fats || 0;

  const totalCalories = Math.round(calPerUnit * portion);
  const totalProtein = Math.round(proteinPerUnit * portion * 10) / 10;
  const totalCarbs = Math.round(carbsPerUnit * portion * 10) / 10;
  const totalFats = Math.round(fatsPerUnit * portion * 10) / 10;

  function getLocalDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const localDateTime = now.toISOString().slice(0, 16);
    return localDateTime;
  }

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
      timestamp: new Date(timestamp).toISOString(),
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

              {showSearch && (
                <div className="relative rounded-full bg-gradient-to-r from-slate-900/90 via-slate-800/75 to-slate-900/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                  <Search aria-hidden="true" className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  <input
                    type="search"
                    aria-label="Search foods to log"
                    placeholder="Search foods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="relative w-full rounded-full border-0 bg-transparent py-3 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-slate-400/80 focus:bg-white/[0.025] focus:ring-2 focus:ring-inset focus:ring-emerald-400/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Clear food search"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 md:max-h-72 overflow-y-auto pr-1 ${onboardingHighlight ? 'onboarding-glow-fields' : ''}`}>
                {filteredRecipes.map((r) => {
                  const isSelected = selectedRecipeId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRecipeId(r.id)}
                      className={`log-choice text-left p-3 rounded-2xl transition-all flex items-center justify-between ${
                        isSelected
                          ? 'log-choice-selected text-white'
                          : 'text-slate-300 hover:bg-white/[0.045]'
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
                            <span className="shrink-0 px-1 py-px rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase leading-none tracking-wide">
                              Pkg
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {r.calories} kcal · {r.protein}g protein ({r.servingUnit})
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-emerald-300 text-slate-950 shadow-[0_0_12px_rgba(110,231,183,0.4)]'
                            : 'bg-white/[0.06] text-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
                {normalizedSearch && filteredRecipes.length === 0 && (
                  <div className="app-card-surface md:col-span-2 rounded-xl px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-slate-100">No matching foods</p>
                    <p className="mt-1 text-xs text-slate-400">Try another name or clear your search.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Portion Control */}
              <div className={`p-1 space-y-3 ${onboardingHighlight ? 'onboarding-glow-fields' : ''}`}>
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
                  className={`log-control-button w-11 h-11 rounded-2xl active:scale-95 text-white flex items-center justify-center transition-transform ${onboardingHighlight ? 'onboarding-glow' : ''}`}
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
                  className={`log-control-button w-11 h-11 rounded-2xl active:scale-95 text-white flex items-center justify-center transition-transform ${onboardingHighlight ? 'onboarding-glow' : ''}`}
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
                        ? 'bg-emerald-300/15 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(16,185,129,0.08)]'
                        : 'bg-white/[0.035] text-slate-400 hover:bg-white/[0.07]'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4 pt-3">
                <label className="text-xs font-semibold text-slate-300">Timestamp</label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  required
                  max={getLocalDateTime()}
                  className="log-input w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <hr className="w-full border-slate-700/70" />

            {/* Ingredients of the selected recipe, scaled to the chosen portion */}
            {selectedRecipe?.ingredients && selectedRecipe.ingredients.length > 0 && (
              <div className="px-1 py-2 space-y-2">
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
        <div className="app-card-raised rounded-2xl p-3.5 space-y-2">
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
        <div className="fixed inset-x-0 bottom-0 z-30 bg-[#090d16] px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={isSubmitting}
            className="mx-auto w-full max-w-2xl py-4 rounded-2xl bg-gradient-to-br from-emerald-200 via-emerald-300 to-teal-400 hover:brightness-105 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-[0_12px_30px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.58)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
        </div>
      </form>
    </div>
  );
};
