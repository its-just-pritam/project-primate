'use client';

import React, { useState } from 'react';
import { Recipe, MICRO_FIELDS } from '@/types/nutrition';
import { Plus, BookOpen, Check, ChefHat, ChevronDown, Trash2, Pencil, Package, Search, X } from 'lucide-react';
import { IngredientBreakdown } from './IngredientBreakdown';
import { PackagedForm, PackagedInput } from './PackagedForm';

interface RecipeManagerProps {
  recipes: Recipe[];
  packaged?: Recipe[];
  ingredientNames: string[];
  ingredientUnits?: Record<string, { baseQuantity: number; unit: string }>;
  onAddPackaged: (p: PackagedInput) => Promise<boolean>;
  onUpdatePackaged: (p: PackagedInput) => Promise<boolean>;
  onAddRecipe: (dish: string, items: { ingredient: string; quantity: number }[]) => Promise<boolean>;
  onUpdateRecipe: (originalDish: string, newDish: string, items: { ingredient: string; quantity: number }[]) => Promise<boolean>;
  onboardingHighlight?: boolean;
}

export const RecipeManager: React.FC<RecipeManagerProps> = ({ recipes, packaged = [], ingredientNames, ingredientUnits = {}, onAddPackaged, onUpdatePackaged, onAddRecipe, onUpdateRecipe, onboardingHighlight = false }) => {
  const [showPackagedForm, setShowPackagedForm] = useState(false);
  const [editingPackaged, setEditingPackaged] = useState<Recipe | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [items, setItems] = useState<{ ingredient: string; quantity: string }[]>([
    { ingredient: '', quantity: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const knownIngredients = ingredientNames;
  const catalog = [...recipes, ...packaged];
  const showSearch = catalog.length >= 10;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredCatalog = normalizedSearch
    ? catalog.filter((recipe) => recipe.name.toLocaleLowerCase().includes(normalizedSearch))
    : catalog;

  const updateItem = (idx: number, field: 'ingredient' | 'quantity', value: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = items
      .map((i) => ({ ingredient: i.ingredient.trim(), quantity: parseFloat(i.quantity) }))
      .filter((i) => i.ingredient && i.quantity > 0);
    if (!name.trim() || cleaned.length === 0) return;

    setIsSubmitting(true);
    const ok = editingName
      ? await onUpdateRecipe(editingName, name.trim(), cleaned)
      : await onAddRecipe(name.trim(), cleaned);
    setIsSubmitting(false);

    if (ok) {
      setSuccessToast(editingName ? `Updated "${name.trim()}"!` : `Saved "${name.trim()}" to recipes!`);
      setTimeout(() => setSuccessToast(null), 3000);
      setName('');
      setItems([{ ingredient: '', quantity: '' }]);
      setShowAddForm(false);
      setEditingName(null);
    }
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingName(null);
    setName('');
    setItems([{ ingredient: '', quantity: '' }]);
  };

  const startEdit = (r: Recipe) => {
    setEditingName(r.name);
    setName(r.name);
    setItems(
      r.ingredients && r.ingredients.length > 0
        ? r.ingredients.map((i) => ({ ingredient: i.name, quantity: String(i.quantity ?? 1) }))
        : [{ ingredient: '', quantity: '' }]
    );
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditPackaged = (r: Recipe) => {
    setEditingPackaged(r);
    setShowPackagedForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between shadow-lg shadow-emerald-950/50">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" /> {successToast}
          </span>
          <span className="text-[10px] text-emerald-500">Saved</span>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-400" /> Recipe Catalog
          </h2>
          <p className="text-xs text-slate-400">Pre-saved meals with standard macro values</p>
        </div>

        {!showAddForm && !showPackagedForm && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Add packaged food"
              title="Add packaged food with its nutrition information"
              onClick={() => setShowPackagedForm(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-amber-500/10 text-amber-300 text-xs font-semibold active:scale-95 transition-all ${onboardingHighlight ? 'onboarding-glow onboarding-recipe-glow-a' : ''}`}
            >
              <Package className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Add new recipe"
              title="Create a new recipe from ingredients"
              onClick={() => setShowAddForm(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all ${onboardingHighlight ? 'onboarding-glow onboarding-recipe-glow-b' : ''}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {showPackagedForm && (
        <PackagedForm
          editingName={editingPackaged?.name}
          initialValues={
            editingPackaged
              ? {
                  dish: editingPackaged.name,
                  // The stored per-serving values are scaled back; the form saves as-is for 1 serving
                  calories: editingPackaged.calories,
                  protein: editingPackaged.protein,
                  carbs: editingPackaged.carbs,
                  fats: editingPackaged.fats,
                  quantity: 1,
                  micros: editingPackaged.micros,
                }
              : undefined
          }
          onCancel={() => {
            setShowPackagedForm(false);
            setEditingPackaged(null);
          }}
          onSubmit={async (p) => {
            const ok = editingPackaged
              ? await onUpdatePackaged(p)
              : await onAddPackaged(p);
            if (ok) {
              setShowPackagedForm(false);
              setEditingPackaged(null);
              setSuccessToast(
                editingPackaged
                  ? `Updated "${p.dish}"!`
                  : `Saved "${p.dish}" as packaged food!`
              );
              setTimeout(() => setSuccessToast(null), 3000);
            }
            return ok;
          }}
        />
      )}

      {/* Add Recipe Form Modal / Card */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className={`space-y-4 border-y border-slate-700/70 py-3 animate-in fade-in slide-in-from-top-2 duration-200 ${onboardingHighlight ? 'onboarding-glow-fields' : ''}`}
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-400" /> {editingName ? 'Edit Recipe' : 'New Recipe'}
          </h3>

          <div className="space-y-2.5">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Dish</label>
              <input
                type="text"
                placeholder="e.g. your recipe name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="log-input w-full h-11 rounded-xl px-3 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_32px] gap-2 text-xs font-medium text-slate-300">
                <span>Ingredient</span>
                <span>Quantity</span>
                <span />
              </div>
              {items.map((it, idx) => {
                const info = ingredientUnits[it.ingredient.trim()];
                const qty = parseFloat(it.quantity);
                const unitHint = info
                  ? `1 qty = ${info.baseQuantity}${info.unit ? ` ${info.unit}` : ''}` +
                    (qty > 0 ? ` · ${Math.round(qty * info.baseQuantity * 100) / 100}${info.unit ? ` ${info.unit}` : ''} total` : '')
                  : '';
                return (
                <div key={idx} className="space-y-1">
                <div className="grid grid-cols-[1fr_80px_32px] gap-2 items-center">
                  <input
                    type="text"
                    list="known-ingredients"
                    placeholder="e.g. Egg"
                    value={it.ingredient}
                    onChange={(e) => updateItem(idx, 'ingredient', e.target.value)}
                    required
                    className="log-input w-full h-11 rounded-xl px-3 text-sm text-white focus:outline-none"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="1"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    required
                    className="log-input w-full h-11 rounded-xl px-3 text-sm text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Remove ingredient"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {unitHint && <p className="text-[10px] text-slate-500 pl-1">{unitHint}</p>}
                </div>
                );
              })}
              <datalist id="known-ingredients">
                {knownIngredients.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, { ingredient: '', quantity: '' }])}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" /> Add ingredient
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 font-semibold text-xs hover:bg-white/[0.09]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-emerald-200 to-emerald-400 text-slate-950 font-bold text-xs shadow-[0_6px_16px_rgba(16,185,129,0.14)] transition-all disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
            >
              {isSubmitting ? 'Saving...' : editingName ? 'Update Recipe' : 'Save Recipe'}
            </button>
          </div>
        </form>
      )}

      {/* Recipe List Cards */}
      {showSearch && (
          <div className="relative rounded-full bg-gradient-to-r from-slate-900/90 via-slate-800/75 to-slate-900/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-emerald-400" />
          <input
            type="search"
            aria-label="Search recipes"
            placeholder="Search recipes and packaged foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="relative w-full rounded-full border-0 bg-transparent py-3 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-slate-400/80 focus:bg-white/[0.025] focus:ring-2 focus:ring-inset focus:ring-emerald-400/20"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear recipe search"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
        {recipes.length === 0 && packaged.length === 0 && (
          <div className="app-card-surface md:col-span-2 rounded-2xl px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-100">Let’s add your first favorites</p>
            <p className="mt-1 text-xs text-slate-400">Build a personal food catalog to make logging meals quicker.</p>
            <div className="mt-3 space-y-2 text-left text-xs text-slate-400 sm:mx-auto sm:w-fit">
              <p className="flex items-center gap-2"><Plus className="h-4 w-4 shrink-0 text-emerald-400" /><span><strong className="text-slate-200">New recipe:</strong> combine ingredients into a meal you make.</span></p>
              <p className="flex items-center gap-2"><Package className="h-4 w-4 shrink-0 text-amber-400" /><span><strong className="text-slate-200">Packaged:</strong> add a ready-made food using its nutrition label.</span></p>
            </div>
          </div>
        )}
        {filteredCatalog.map((r) => {
          const isOpen = !!expandedIds[r.id];
          return (
          <div
            key={r.id}
            onClick={() => setExpandedIds((p) => ({ ...p, [r.id]: !p[r.id] }))}
            className="app-card-raised rounded-2xl p-3.5 space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  {r.name}
                  {r.isPackaged && (
                    <span className="shrink-0 px-1 py-px rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase leading-none tracking-wide">
                      Pkg
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Unit: {r.servingUnit}
                </p>
              </div>
              <div className="flex items-center gap-1 text-right">
                <span className="text-base font-black text-white">
                  {r.calories} <span className="text-xs font-normal text-slate-400">kcal</span>
                </span>
                {!r.isPackaged && (
                <button
                  type="button"
                  aria-label={`Edit ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(r);
                  }}
                  className="h-7 w-7 -mr-1 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                )}
                {r.isPackaged && (
                <button
                  type="button"
                  aria-label={`Edit ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditPackaged(r);
                  }}
                  className="h-7 w-7 -mr-1 flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-[11px] font-medium">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Protein: {r.protein}g
              </span>
              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                Carbs: {r.carbs}g
              </span>
              <span className="text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                Fats: {r.fats}g
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>

            {isOpen && (
              <div className="space-y-2">
                {r.micros && (
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total micronutrients
                    </h5>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5">
                      {MICRO_FIELDS.map((f) => (
                        <div key={f.key} className="flex justify-between text-[10px] text-slate-400">
                          <span>{f.label}</span>
                          <span className="text-slate-200 font-medium">
                            {r.micros![f.key]} {f.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!r.isPackaged && <IngredientBreakdown ingredients={r.ingredients} />}
              </div>
            )}
          </div>
          );
        })}
        {normalizedSearch && filteredCatalog.length === 0 && (
          <div className="app-card-surface md:col-span-2 rounded-2xl px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-100">No matching recipes</p>
            <p className="mt-1 text-xs text-slate-400">Try another name or clear your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
