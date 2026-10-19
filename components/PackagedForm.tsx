'use client';

import React, { useRef, useState } from 'react';
import { Package, Camera, ImageUp } from 'lucide-react';
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
  /** When set, the form operates in edit mode (dish name is locked). */
  editingName?: string;
  /** Pre-populated values when editing an existing item. */
  initialValues?: Partial<PackagedInput>;
}

const inputCls =
  'log-input w-full h-11 rounded-xl px-3 text-sm text-white focus:outline-none';

const MACROS = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fats', label: 'Fat (g)' },
] as const;

export const PackagedForm: React.FC<PackagedFormProps> = ({ onSubmit, onCancel, editingName, initialValues }) => {
  const [name, setName] = useState(initialValues?.dish ?? '');
  const [quantity, setQuantity] = useState(initialValues?.quantity != null ? String(initialValues.quantity) : '1');
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
  const [scanState, setScanState] = useState<{ busy: boolean; msg: string | null }>({
    busy: false,
    msg: null,
  });
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleScan = async (file?: File) => {
    if (!file) return;
    setScanState({ busy: true, msg: 'Reading label…' });
    try {
      const [{ createWorker }, { parseNutritionLabel, guessProductName }] = await Promise.all([
        import('tesseract.js'),
        import('@/lib/nutritionLabel'),
      ]);
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(file, {}, { text: true, blocks: true });
      await worker.terminate();

      const ocrLines = (data.blocks || []).flatMap((b) =>
        b.paragraphs.flatMap((p) =>
          p.lines.map((l) => ({ text: l.text, height: l.bbox.y1 - l.bbox.y0 }))
        )
      );
      const productName = guessProductName(ocrLines);
      if (productName) setName(productName);

      const parsed = parseNutritionLabel(data.text);
      const toStr = (o: Record<string, number | undefined>) =>
        Object.fromEntries(
          Object.entries(o)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        );
      const m = toStr(parsed.macros);
      const mi = toStr(parsed.micros);
      setMacros((p) => ({ ...p, ...m }));
      setMicros((p) => ({ ...p, ...mi }));
      const count = Object.keys(m).length + Object.keys(mi).length;
      setScanState({
        busy: false,
        msg:
          count || productName
            ? `Filled ${productName ? 'name and ' : ''}${count} value${count === 1 ? '' : 's'}. Please check them before saving.`
            : 'Could not read the label. Try a clearer, flatter photo.',
      });
    } catch (err) {
      console.error(err);
      setScanState({ busy: false, msg: 'Scan failed. Check your connection and try again.' });
    }
  };

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
      className="space-y-4 border-y border-slate-700/70 py-3 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
        <Package className="w-4 h-4 text-amber-400" /> {editingName ? 'Edit Packaged Food' : 'New Packaged Food'}
      </h3>

      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={scanState.busy}
            onClick={() => cameraRef.current?.click()}
            className="log-control-button flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-slate-200 text-xs font-semibold disabled:opacity-50"
          >
            <Camera className="w-4 h-4" /> Take photo
          </button>
          <button
            type="button"
            disabled={scanState.busy}
            onClick={() => uploadRef.current?.click()}
            className="log-control-button flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-slate-200 text-xs font-semibold disabled:opacity-50"
          >
            <ImageUp className="w-4 h-4" /> Upload label
          </button>
        </div>
        {[cameraRef, uploadRef].map((ref, i) => (
          <input
            key={i}
            ref={ref}
            type="file"
            accept="image/*"
            capture={i === 0 ? 'environment' : undefined}
            className="hidden"
            onChange={(e) => {
              handleScan(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        ))}
        {scanState.msg && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            {scanState.busy && (
              <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            )}
            {scanState.msg}
          </p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_80px] gap-2">
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1">Name</label>
          <input
            type="text"
            placeholder="e.g. Classic Chicken Egg Roll"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={!!editingName}
            className={`${inputCls} disabled:opacity-60`}
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
          className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 font-semibold text-xs hover:bg-white/[0.09]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-400 text-slate-950 font-bold text-xs shadow-[0_6px_16px_rgba(245,158,11,0.16)] disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting ? 'Saving...' : editingName ? 'Update Packaged Food' : 'Save Packaged Food'}
        </button>
      </div>
    </form>
  );
};
