'use client';

import React, { useState } from 'react';
import { Package } from 'lucide-react';
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
  onSubmit: (p: PackagedInput) => Promise<boolean>;
  onCancel: () => void;
}

const inputCls =
  'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';

const MACROS = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fats', label: 'Fat (g)' },
] as const;

export const PackagedForm: React.FC<PackagedFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [macros, setMacros] = useState<Record<string, string>>({});
  const [micros, setMicros] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const n = (v?: string) => parseFloat(v || '') || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const ok = await onSubmit({
      dish: name.trim(),
      quantity: n(quantity) > 0 ? n(quantity) : 1,
      calories: n(macros.calories),
      protein: n(macros.protein),
      carbs: n(macros.carbs),
      fats: n(macros.fats),
      micros: Object.fromEntries(
        MICRO_FIELDS.map((f) => [f.key, n(micros[f.key])])
      ) as unknown as Micronutrients,
    });
    setIsSubmitting(false);
    if (!ok) alert('Failed to save packaged food');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-3.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
        <Package className="w-4 h-4 text-amber-400" /> New Packaged Food
      </h3>

      <div className="grid grid-cols-[1fr_80px] gap-2">
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Name</label>
          <input
            type="text"
            placeholder="e.g. Classic Chicken Egg Roll"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Servings</label>
          <input
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <p className="text-[10px] text-slate-500 -mt-2">
        Enter the nutrition values for this many servings; they are saved as-is.
      </p>

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
          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Packaged Food'}
        </button>
      </div>
    </form>
  );
};
