'use client';

import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Recipe, MICRO_FIELDS } from '@/types/nutrition';
import { Plus, BookOpen, Check, Trash2, Pencil, Package, Search, X } from 'lucide-react';
import { IngredientBreakdown } from './IngredientBreakdown';
import { PackagedForm, PackagedInput } from './PackagedForm';

interface RecipeManagerProps {
  recipes: Recipe[];
  packaged?: Recipe[];
  ingredientNames: string[];
  ingredientUnits?: Record<string, { baseQuantity: number; unit: string }>;
  onAddPackaged: (p: PackagedInput) => Promise<boolean>;
  onUpdatePackaged: (p: PackagedInput, originalDish?: string) => Promise<boolean>;
  onAddRecipe: (dish: string, items: { ingredient: string; quantity: number }[]) => Promise<boolean>;
  onUpdateRecipe: (originalDish: string, newDish: string, items: { ingredient: string; quantity: number }[]) => Promise<boolean>;
  onboardingHighlight?: boolean;
}

interface RecipeEditorFormProps {
  formId: string;
  editingName: string | null;
  name: string;
  setName: (value: string) => void;
  items: { ingredient: string; quantity: string }[];
  ingredientUnits: Record<string, { baseQuantity: number; unit: string }>;
  knownIngredients: string[];
  isSubmitting: boolean;
  onboardingHighlight: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  onUpdateItem: (index: number, field: 'ingredient' | 'quantity', value: string) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  embedded?: boolean;
}

const PackagedFoodSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-label="Packaged food"
    aria-checked={enabled}
    title="Switch to packaged food"
    onClick={() => onChange(!enabled)}
    className={`relative flex h-4 w-8 shrink-0 items-center rounded-full border border-white/10 p-px transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${enabled ? 'bg-amber-400/30' : 'bg-slate-800'}`}
  >
    <span aria-hidden="true" className={`absolute top-1/2 -translate-y-1/2 text-[6px] font-medium leading-none tracking-normal ${enabled ? 'left-[5px] text-amber-200' : 'right-[4px] text-slate-200'}`}>PKG</span>
    <span aria-hidden="true" className={`z-10 h-3 w-3 rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-[18px] bg-amber-300' : 'translate-x-0 bg-slate-400'}`} />
  </button>
);

const RecipeEditorForm: React.FC<RecipeEditorFormProps> = ({
  formId, editingName, name, setName, items, ingredientUnits, knownIngredients,
  isSubmitting, onboardingHighlight, onSubmit, onCancel, onUpdateItem,
  onRemoveItem, onAddItem, embedded = false,
}) => (
  <form id={formId} onSubmit={onSubmit} className={`space-y-4 ${embedded ? 'pt-3' : 'border-y border-slate-700/70 py-3'} animate-in fade-in slide-in-from-top-2 duration-200 ${onboardingHighlight ? 'onboarding-glow-fields' : ''}`}>
    {!embedded && (
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
        <BookOpen className="h-4 w-4 text-emerald-400" /> New Recipe
      </h3>
    )}
    <div className="space-y-2.5">
      {!embedded && <div>
        <label className="mb-1 block text-xs font-medium text-slate-300">Dish</label>
        <input type="text" placeholder="e.g. your recipe name" value={name} onChange={(event) => setName(event.target.value)} required className="log-input h-11 w-full rounded-xl px-3 text-sm text-white focus:outline-none" />
      </div>}
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_80px_32px] gap-2 text-xs font-medium text-slate-300"><span>Ingredient</span><span>Quantity</span><span /></div>
        {items.map((item, index) => {
          const info = ingredientUnits[item.ingredient.trim()];
          const quantity = parseFloat(item.quantity);
          const unitHint = info
            ? `1 qty = ${info.baseQuantity}${info.unit ? ` ${info.unit}` : ''}${quantity > 0 ? ` · ${Math.round(quantity * info.baseQuantity * 100) / 100}${info.unit ? ` ${info.unit}` : ''} total` : ''}`
            : '';
          return (
            <div key={index} className="space-y-1">
              <div className="grid grid-cols-[1fr_80px_32px] items-center gap-2">
                <input type="text" list="known-ingredients" placeholder="e.g. Egg" value={item.ingredient} onChange={(event) => onUpdateItem(index, 'ingredient', event.target.value)} required className="log-input h-10 w-full rounded-xl px-3 text-sm text-white focus:outline-none" />
                <input type="number" step="any" min="0" placeholder="1" value={item.quantity} onChange={(event) => onUpdateItem(index, 'quantity', event.target.value)} required className="log-input h-10 w-full rounded-xl px-3 text-sm text-white focus:outline-none" />
                <button type="button" aria-label="Remove ingredient" disabled={items.length === 1} onClick={() => onRemoveItem(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
              </div>
              {unitHint && <p className="pl-1 text-[10px] text-slate-500">{unitHint}</p>}
            </div>
          );
        })}
        <datalist id="known-ingredients">{knownIngredients.map((ingredient) => <option key={ingredient} value={ingredient} />)}</datalist>
      </div>
    </div>
    <div className="flex items-center justify-between gap-2 pt-1">
      <button type="button" onClick={onAddItem} className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-xl px-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"><Plus className="h-3.5 w-3.5" /> Add</button>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onCancel} className="h-9 w-[4.4rem] rounded-xl bg-white/[0.05] text-xs font-semibold text-slate-300 hover:bg-white/[0.09]">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="h-9 w-[4.4rem] rounded-xl bg-gradient-to-br from-emerald-200 to-emerald-400 text-xs font-bold text-slate-950 shadow-[0_6px_16px_rgba(116,170,69,0.14)] transition-all disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none">{isSubmitting ? 'Saving...' : editingName ? (embedded ? 'Update' : 'Update Recipe') : 'Save'}</button>
      </div>
    </div>
  </form>
);

const NEW_RECIPE_DRAFT_ID = '__new_recipe_draft__';
const NEW_PACKAGED_DRAFT_ID = '__new_packaged_draft__';
// Shared by the recipe and packaged drafts' name rows, so the PKG toggle leaves the row in place
const DRAFT_NAME_ROW_TRANSITION = 'recipe-draft-name-row';

export const RecipeManager: React.FC<RecipeManagerProps> = ({ recipes, packaged = [], ingredientNames, ingredientUnits = {}, onAddPackaged, onUpdatePackaged, onAddRecipe, onUpdateRecipe, onboardingHighlight = false }) => {
  const [showPackagedForm, setShowPackagedForm] = useState(false);
  const [editingPackaged, setEditingPackaged] = useState<Recipe | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemKind, setNewItemKind] = useState<'recipe' | 'packaged' | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [packagedName, setPackagedName] = useState('');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [items, setItems] = useState<{ ingredient: string; quantity: string }[]>([
    { ingredient: '', quantity: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const knownIngredients = ingredientNames;
  const catalog = [...recipes, ...packaged];
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const draftRecipe: Recipe | null = newItemKind ? {
    id: newItemKind === 'recipe' ? NEW_RECIPE_DRAFT_ID : NEW_PACKAGED_DRAFT_ID,
    name: newItemKind === 'recipe' ? name || 'New Recipe' : 'New Packaged Food',
    servingUnit: '1 serving',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    isPackaged: newItemKind === 'packaged',
  } : null;
  const filteredCatalog = normalizedSearch
    ? catalog.filter((recipe) => recipe.name.toLocaleLowerCase().includes(normalizedSearch))
    : catalog;
  const expandedRecipeIndex = filteredCatalog.findIndex((recipe) => expandedIds[recipe.id]);
  const hiddenSiblingIndex = expandedRecipeIndex < 0
    ? -1
    : expandedRecipeIndex % 2 === 0
      ? expandedRecipeIndex + 1
      : expandedRecipeIndex - 1;
  const visibleCatalog = filteredCatalog.filter((_, index) => index !== hiddenSiblingIndex);
  const catalogRows: Recipe[][] = [];
  let closedRow: Recipe[] = [];
  visibleCatalog.forEach((recipe) => {
    if (expandedIds[recipe.id]) {
      if (closedRow.length) catalogRows.push(closedRow);
      closedRow = [];
      catalogRows.push([recipe]);
      return;
    }
    closedRow.push(recipe);
    if (closedRow.length === 2) {
      catalogRows.push(closedRow);
      closedRow = [];
    }
  });
  if (closedRow.length) catalogRows.push(closedRow);
  if (draftRecipe) catalogRows.unshift([draftRecipe]);
  const verticalRowIndexes = catalogRows.flatMap((row, index) =>
    row.length === 2 && !row.some((recipe) => expandedIds[recipe.id]) ? [index] : []
  );
  const firstVerticalRowIndex = verticalRowIndexes[0] ?? -1;
  const lastVerticalRowIndex = verticalRowIndexes.at(-1) ?? -1;

  const animateRecipeLayout = (recipeId: string, updateState: () => void) => {
    const update = () => flushSync(updateState);
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(update);
    } else {
      update();
    }
  };

  const toggleRecipe = (recipeId: string) => animateRecipeLayout(recipeId, () => {
    setExpandedIds((previous) => previous[recipeId] ? {} : { [recipeId]: true });
  });

  const startNewRecipe = () => animateRecipeLayout(NEW_RECIPE_DRAFT_ID, () => {
    setNewItemKind('recipe');
    setShowAddForm(true);
    setShowPackagedForm(false);
    setEditingName(null);
    setEditingRecipeId(null);
    setEditingPackaged(null);
    setName('');
    setItems([{ ingredient: '', quantity: '' }]);
    setExpandedIds({ [NEW_RECIPE_DRAFT_ID]: true });
  });

  const startNewPackaged = () => animateRecipeLayout(NEW_PACKAGED_DRAFT_ID, () => {
    setNewItemKind('packaged');
    setShowPackagedForm(true);
    setShowAddForm(false);
    setEditingName(null);
    setEditingRecipeId(null);
    setEditingPackaged(null);
    setPackagedName('');
    setExpandedIds({ [NEW_PACKAGED_DRAFT_ID]: true });
  });

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
      const updatedRecipeId = editingRecipeId;
      setSuccessToast(editingName ? `Updated "${name.trim()}"!` : `Saved "${name.trim()}" to recipes!`);
      setTimeout(() => setSuccessToast(null), 3000);
      const reset = () => {
        setName('');
        setItems([{ ingredient: '', quantity: '' }]);
        setShowAddForm(false);
        setEditingName(null);
        setEditingRecipeId(null);
        setNewItemKind(null);
        if (updatedRecipeId || newItemKind) setExpandedIds({});
      };
      if (updatedRecipeId) animateRecipeLayout(updatedRecipeId, reset);
      else reset();
    }
  };

  const closeForm = () => {
    const editedRecipe = editingName ? catalog.find((recipe) => recipe.name === editingName) : undefined;
    const reset = () => {
      setShowAddForm(false);
      setEditingName(null);
      setEditingRecipeId(null);
      setName('');
      setItems([{ ingredient: '', quantity: '' }]);
      const wasNewDraft = newItemKind === 'recipe';
      setNewItemKind(null);
      if (editedRecipe || wasNewDraft) setExpandedIds({});
    };
    if (editedRecipe) animateRecipeLayout(editedRecipe.id, reset);
    else reset();
  };

  const cancelPackagedEdit = () => {
    const edited = editingPackaged;
    const reset = () => {
      setShowPackagedForm(false);
      setEditingPackaged(null);
      setPackagedName('');
      const wasNewDraft = newItemKind === 'packaged';
      setNewItemKind(null);
      if (edited || wasNewDraft) setExpandedIds({});
    };
    if (edited) animateRecipeLayout(edited.id, reset);
    else reset();
  };

  const startEdit = (r: Recipe) => {
    animateRecipeLayout(r.id, () => {
      setEditingName(r.name);
      setEditingRecipeId(r.id);
      setName(r.name);
      setItems(
        r.ingredients && r.ingredients.length > 0
          ? r.ingredients.map((i) => ({ ingredient: i.name, quantity: String(i.quantity ?? 1) }))
          : [{ ingredient: '', quantity: '' }]
      );
      setShowAddForm(true);
      setNewItemKind(null);
      setExpandedIds({ [r.id]: true });
    });
  };

  const startEditPackaged = (r: Recipe) => {
    animateRecipeLayout(r.id, () => {
      setEditingPackaged(r);
      setPackagedName(r.name);
      setNewItemKind(null);
      setShowPackagedForm(true);
      setExpandedIds({ [r.id]: true });
    });
  };

  const recipeEditorForm = showAddForm ? (
    <div className="space-y-2">
      <RecipeEditorForm
        formId={editingRecipeId ? `recipe-editor-${editingRecipeId.replace(/[^a-zA-Z0-9_-]/g, '-')}` : newItemKind === 'recipe' ? `recipe-editor-${NEW_RECIPE_DRAFT_ID}` : 'new-recipe-editor'}
        editingName={editingName}
        name={name}
        setName={setName}
        items={items}
        ingredientUnits={ingredientUnits}
        knownIngredients={knownIngredients}
        isSubmitting={isSubmitting}
        onboardingHighlight={onboardingHighlight}
        onSubmit={handleSubmit}
        onCancel={closeForm}
        onUpdateItem={updateItem}
        onRemoveItem={(index) => setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
        onAddItem={() => setItems((previous) => [...previous, { ingredient: '', quantity: '' }])}
        embedded={!!editingName || newItemKind === 'recipe'}
      />
    </div>
  ) : null;

  const packagedEditorForm = showPackagedForm ? (
    <div className="space-y-2">
      <PackagedForm
      formId={editingPackaged ? `packaged-editor-${editingPackaged.id.replace(/[^a-zA-Z0-9_-]/g, '-')}` : newItemKind === 'packaged' ? `packaged-editor-${NEW_PACKAGED_DRAFT_ID}` : 'new-packaged-editor'}
      editingName={editingPackaged?.name}
      initialValues={editingPackaged ? {
        dish: editingPackaged.name,
        calories: editingPackaged.calories,
        protein: editingPackaged.protein,
        carbs: editingPackaged.carbs,
        fats: editingPackaged.fats,
        quantity: 1,
        micros: editingPackaged.micros,
      } : undefined}
      dishName={editingPackaged ? packagedName : undefined}
      onDishNameChange={editingPackaged ? setPackagedName : undefined}
      hideNameField={!!editingPackaged}
      nameRowTransitionName={newItemKind === 'packaged' ? DRAFT_NAME_ROW_TRANSITION : undefined}
      nameAccessory={newItemKind === 'packaged' ? <PackagedFoodSwitch enabled onChange={(enabled) => { if (!enabled) startNewRecipe(); }} /> : null}
      onCancel={cancelPackagedEdit}
      onSubmit={async (value, originalDish) => {
        const edited = editingPackaged;
        const ok = edited ? await onUpdatePackaged(value, originalDish ?? edited.name) : await onAddPackaged(value);
        if (ok) {
          const reset = () => {
            setShowPackagedForm(false);
            setEditingPackaged(null);
            setPackagedName('');
            const wasNewDraft = newItemKind === 'packaged';
            setNewItemKind(null);
            if (edited || wasNewDraft) setExpandedIds({});
          };
          if (edited) animateRecipeLayout(edited.id, reset);
          else reset();
          setSuccessToast(edited ? `Updated "${value.dish}"!` : `Saved "${value.dish}" as packaged food!`);
          setTimeout(() => setSuccessToast(null), 3000);
        }
        return ok;
      }}
      embedded={!!editingPackaged || newItemKind === 'packaged'}
      embeddedDivider={!!editingPackaged}
      />
    </div>
  ) : null;

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

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Recipe Catalog</h2>
          <p className="text-xs text-slate-400">Pre-saved meals with standard macro values</p>
        </div>
      </div>

      {showPackagedForm && !editingPackaged && newItemKind !== 'packaged' && packagedEditorForm}

      {showAddForm && !editingName && newItemKind !== 'recipe' && recipeEditorForm}

      {/* Recipe List Cards */}
      {!showAddForm && !showPackagedForm && (
        <div className="relative rounded-full bg-gradient-to-r from-slate-900/90 via-slate-800/75 to-slate-900/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl">
            <Search aria-hidden="true" className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            <input
              type="text"
              role="searchbox"
              aria-label="Search recipes"
              placeholder="Search recipes and packaged foods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="relative w-full rounded-full border-0 bg-transparent py-3 pl-10 pr-20 text-sm text-white outline-none transition placeholder:text-slate-400/80 focus:bg-white/[0.025] focus:ring-2 focus:ring-inset focus:ring-emerald-400/20"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear recipe search"
                onClick={() => setSearchQuery('')}
                className="absolute right-10 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          <button
            type="button"
            aria-label="Add recipe"
            title="Add recipe"
            onClick={startNewRecipe}
            className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-emerald-300 transition-colors hover:text-emerald-200 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${onboardingHighlight ? 'onboarding-glow onboarding-recipe-glow-b' : ''}`}
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      )}
      <div>
        {recipes.length === 0 && packaged.length === 0 && !draftRecipe && (
          <div className="app-card-surface w-full rounded-2xl px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-100">Let’s add your first favorites</p>
            <p className="mt-1 text-xs text-slate-400">Build a personal food catalog to make logging meals quicker.</p>
            <div className="mt-3 space-y-2 text-left text-xs text-slate-400 sm:mx-auto sm:w-fit">
              <p className="flex items-center gap-2"><Plus className="h-4 w-4 shrink-0 text-emerald-400" /><span><strong className="text-slate-200">New recipe:</strong> combine ingredients into a meal you make.</span></p>
              <p className="flex items-center gap-2"><Package className="h-4 w-4 shrink-0 text-amber-400" /><span><strong className="text-slate-200">Packaged:</strong> add a ready-made food using its nutrition label.</span></p>
            </div>
          </div>
        )}
        {catalogRows.map((row, rowIndex) => {
          const hasVerticalDivider = verticalRowIndexes.includes(rowIndex);
          const fadesTop = rowIndex === firstVerticalRowIndex;
          const fadesBottom = rowIndex === lastVerticalRowIndex;
          return (
              <div key={row.map((recipe) => recipe.id).join(':')} className="relative flex flex-wrap gap-x-1.5">
                {hasVerticalDivider && <span aria-hidden="true" className={`recipe-partition-vertical ${fadesTop ? 'recipe-partition-fade-top' : ''} ${fadesBottom ? 'recipe-partition-fade-bottom' : ''}`} />}
                {row.map((r) => {
                  const isOpen = !!expandedIds[r.id];
                  const isRecipeDraftCard = newItemKind === 'recipe' && r.id === NEW_RECIPE_DRAFT_ID;
                  const isPackagedDraftCard = newItemKind === 'packaged' && r.id === NEW_PACKAGED_DRAFT_ID;
                  const isPackagedEditCard = editingPackaged?.id === r.id;
                  const isEditingCard = editingRecipeId === r.id || isPackagedEditCard || isRecipeDraftCard || isPackagedDraftCard;
                  const recipeFormId = `recipe-editor-${r.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
                  const packagedFormId = `packaged-editor-${r.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
                  return (
          <div
            key={r.id}
            onClick={(event) => {
              if (isEditingCard) return;
              if ((event.target as HTMLElement).closest('button, input, textarea, select, form, label, summary')) return;
              toggleRecipe(r.id);
            }}
            // The recipe and packaged drafts share one name, so the PKG toggle morphs the card instead of cross-fading two cards
            style={{ viewTransitionName: isRecipeDraftCard || isPackagedDraftCard ? 'recipe-card-new-draft' : `recipe-card-${r.id.replace(/[^a-zA-Z0-9_-]/g, '-')}` }}
            className={`recipe-glass-card cursor-pointer p-3.5 ${isOpen ? 'recipe-glass-card-open w-full rounded-2xl' : 'recipe-glass-card-closed w-[calc(50%-0.1875rem)]'}`}
          >
            {!isPackagedDraftCard && <div className="flex items-center justify-between" style={isRecipeDraftCard ? { viewTransitionName: DRAFT_NAME_ROW_TRANSITION } : undefined}>
              <div className="min-w-0 flex-1">
                <h4 className="flex min-w-0 items-center gap-1.5 text-sm font-bold tracking-tight text-white">
                  {isPackagedEditCard ? (
                    <input
                      form={packagedFormId}
                      aria-label="Packaged food name"
                      autoFocus
                      required
                      value={packagedName}
                      onChange={(event) => setPackagedName(event.target.value)}
                      className="min-w-0 w-full border-b border-amber-400/50 bg-transparent text-sm font-bold tracking-tight text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
                    />
                  ) : editingRecipeId === r.id || isRecipeDraftCard ? (
                    <input
                      form={recipeFormId}
                      aria-label="Recipe name"
                      autoFocus
                      required
                      value={name}
                      placeholder="New recipe name"
                      onChange={(event) => setName(event.target.value)}
                      className="min-w-0 w-full border-b border-emerald-400/50 bg-transparent text-sm font-bold tracking-tight text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                    />
                  ) : <span className="truncate">{r.name}</span>}
                  {r.isPackaged && !isPackagedEditCard && (
                    <span className="shrink-0 px-1 py-px rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase leading-none tracking-wide">
                      Pkg
                    </span>
                  )}
                </h4>
              </div>
              <div className="ml-5 flex shrink-0 items-center gap-1 text-right">
                {isRecipeDraftCard && <PackagedFoodSwitch enabled={false} onChange={(enabled) => { if (enabled) startNewPackaged(); }} />}
                {!isEditingCard && !r.isPackaged && (
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
                {!isEditingCard && r.isPackaged && (
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
            </div>}

            {(editingRecipeId === r.id || isRecipeDraftCard) && recipeEditorForm}
            {(editingPackaged?.id === r.id || isPackagedDraftCard) && packagedEditorForm}

            {!isEditingCard && <div className="space-y-1 pt-1 border-t border-slate-800/60 text-[9px] font-medium">
              <div className="flex justify-start gap-1.5">
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-white/[0.06] px-2 py-1 text-white">
                  {isOpen ? <span>Energy</span> : <><span className="hidden sm:inline">Energy</span><span className="sm:hidden">E:</span></>}
                  <span className="font-bold">{r.calories} kcal</span>
                </span>
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-sky-500/10 px-2 py-1 text-white">
                  {isOpen ? <span>Fats</span> : <><span className="hidden sm:inline">Fats</span><span className="sm:hidden">F:</span></>}
                  <span className="font-bold">{r.fats}g</span>
                </span>
              </div>
              <div className="flex justify-start gap-1.5">
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-rose-500/10 px-2 py-1 text-white">
                  {isOpen ? <span>Protein</span> : <><span className="hidden sm:inline">Protein</span><span className="sm:hidden">P:</span></>}
                  <span className="font-bold">{r.protein}g</span>
                </span>
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-500/10 px-2 py-1 text-white">
                  {isOpen ? <span>Carbs</span> : <><span className="hidden sm:inline">Carbs</span><span className="sm:hidden">C:</span></>}
                  <span className="font-bold">{r.carbs}g</span>
                </span>
              </div>
            </div>}

            {!isEditingCard && <div
              aria-hidden={!isOpen}
              className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${isOpen ? 'mt-2 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}
            >
              <div className="min-h-0 overflow-hidden space-y-2">
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
            </div>}
          </div>
                  );
                })}
                {rowIndex < catalogRows.length - 1 && <div aria-hidden="true" className="my-2 h-px w-full bg-gradient-to-r from-transparent via-slate-400/35 to-transparent" />}
              </div>
          );
        })}
        {normalizedSearch && filteredCatalog.length === 0 && !draftRecipe && (
          <div className="app-card-surface w-full rounded-2xl px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-100">No matching recipes</p>
            <p className="mt-1 text-xs text-slate-400">Try another name or clear your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
