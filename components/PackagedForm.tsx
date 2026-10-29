'use client';

import React, { useState } from 'react';
import { MICRO_FIELDS, Micronutrients } from '@/types/nutrition';

export interface PackagedInput {
  dish: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micros: Micronutrients;
}

interface PackagedFormProps {
  onSubmit: (p: PackagedInput, originalDish?: string) => Promise<boolean>;
  onCancel: () => void;
  /** Original name used to identify the row when editing. */
  editingName?: string;
  /** Pre-populated values when editing an existing item. */
  initialValues?: Partial<PackagedInput>;
  /** Render inside an existing recipe card. */
  embedded?: boolean;
  embeddedDivider?: boolean;
  formId?: string;
  dishName?: string;
  onDishNameChange?: (value: string) => void;
  hideNameField?: boolean;
  /** Shown beside the name input, matching the recipe card header, e.g. the packaged-food toggle. */
  nameAccessory?: React.ReactNode;
  /** View-transition name for the name row, so it can stay in place while the rest of the card changes. */
  nameRowTransitionName?: string;
}

const inputCls =
  'log-input w-full h-11 rounded-xl px-3 text-sm text-white focus:outline-none';

const MACROS = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fats', label: 'Fat (g)' },
] as const;

export const PackagedForm: React.FC<PackagedFormProps> = ({ onSubmit, onCancel, editingName, initialValues, embedded = false, embeddedDivider = false, formId, dishName, onDishNameChange, hideNameField = false, nameAccessory, nameRowTransitionName }) => {
  const [name, setName] = useState(initialValues?.dish ?? '');
  const currentName = dishName ?? name;
  const changeName = onDishNameChange ?? setName;
  const [macros, setMacros] = useState<Record<string, string>>(() => {
    if (!initialValues) return {};
    const { calories, protein, carbs, fats } = initialValues;
    return {
      ...(calories != null ? { calories: String(calories) } : {}),
      ...(protein != null ? { protein: String(protein) } : {}),
      ...(carbs != null ? { carbs: String(carbs) } : {}),
      ...(fats != null ? { fats: String(fats) } : {}),
    };
  });
  const [micros, setMicros] = useState<Record<string, string>>(() => {
    if (!initialValues?.micros) return {};
    return Object.fromEntries(
      Object.entries(initialValues.micros)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    );
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const n = (v?: string) => parseFloat(v || '') || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const ok = await onSubmit({
      dish: currentName.trim(),
      quantity: 1,
      calories: n(macros.calories),
      protein: n(macros.protein),
      carbs: n(macros.carbs),
      fats: n(macros.fats),
      micros: Object.fromEntries(
        MICRO_FIELDS.map((f) => [f.key, n(micros[f.key])])
      ) as unknown as Micronutrients,
    }, editingName);
    setIsSubmitting(false);
    if (!ok) alert('Failed to save packaged food');
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className={`space-y-4 ${embedded ? embeddedDivider ? 'border-t border-white/10 pt-3' : '' : 'border-y border-slate-700/70 py-3'} animate-in fade-in slide-in-from-top-2 duration-200`}
    >
      {(!hideNameField || nameAccessory) && <div className="flex items-center justify-between" style={nameRowTransitionName ? { viewTransitionName: nameRowTransitionName } : undefined}>
        <div className="min-w-0 flex-1">
          {!hideNameField && <input
            type="text"
            aria-label="Packaged food name"
            placeholder="New packaged food name"
            value={currentName}
            onChange={(e) => changeName(e.target.value)}
            required
            className="min-w-0 w-full border-b border-amber-400/50 bg-transparent text-sm font-bold tracking-tight text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
          />}
        </div>
        {nameAccessory && <div className="ml-5 flex shrink-0 items-center gap-1">{nameAccessory}</div>}
      </div>}

      <div className="grid grid-cols-2 gap-2">
        {MACROS.map((m) => (
          <div key={m.key}>
            <label className="text-xs font-medium text-slate-300 block mb-1">{m.label}</label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={macros[m.key] || ''}
              onChange={(e) => setMacros((p) => ({ ...p, [m.key]: e.target.value }))}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      <details className="group">
        <summary className="text-xs font-semibold text-emerald-400 cursor-pointer">
          Micronutrients (optional)
        </summary>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {MICRO_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                {f.label} ({f.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={micros[f.key] || ''}
                onChange={(e) => setMicros((p) => ({ ...p, [f.key]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </details>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 font-semibold text-xs hover:bg-white/[0.09]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-400 text-slate-950 font-bold text-xs shadow-[0_6px_16px_rgba(245,158,11,0.16)] disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting ? 'Saving...' : editingName ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
};
