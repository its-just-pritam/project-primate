'use client';

import { useEffect, useState } from 'react';
import { Copy, Image as ImageIcon, X } from 'lucide-react';
import { PackagedForm, type PackagedInput } from '@/components/PackagedForm';
import type { IncomingShare } from '@/lib/sharedContent';
import { parseSharedPackagedFood } from '@/lib/sharedNutritionParser';

export function ShareInboxDialog({
  share,
  onClose,
  onSavePackaged,
}: {
  share: IncomingShare;
  onClose: () => void;
  onSavePackaged: (entry: PackagedInput) => Promise<boolean>;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const initialValues = parseSharedPackagedFood(share);

  useEffect(() => {
    const urls = share.files.map((file) => URL.createObjectURL(file));
    setImageUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [share]);

  const copyText = async () => {
    const text = [share.title, share.text, share.url].filter(Boolean).join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access may be unavailable; the shared text remains selectable below.
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="shared-content-title" className="app-card-surface max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700/80 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-300">Shared with Platito</p>
            <h2 id="shared-content-title" className="mt-1 text-base font-bold text-white">Add packaged food</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close shared content" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {share.title && <p className="mt-4 text-sm font-semibold text-slate-100">{share.title}</p>}
        {share.text && <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-950/70 p-3 text-sm leading-6 text-slate-200">{share.text}</p>}
        {share.url && <p className="mt-3 break-all text-xs text-emerald-300">{share.url}</p>}

        {imageUrls.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"><ImageIcon className="h-3.5 w-3.5" />{imageUrls.length} shared image{imageUrls.length === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-2 gap-2">
              {imageUrls.map((url, index) => <img key={url} src={url} alt={`Shared image ${index + 1}`} className="max-h-48 w-full rounded-xl border border-slate-700 object-contain bg-slate-950/70" />)}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-400">We filled any clearly labeled nutrition values found in the shared chat text. Review the dish name and nutrition before saving. Shared image files, if present, stay on this device; only packaged-food values are saved to your account.</p>
        {share.text && <button type="button" onClick={() => void copyText()} className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"><Copy className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy shared text'}</button>}
        <PackagedForm
          initialValues={initialValues}
          requireMacros
          onSubmit={async (entry) => {
            const saved = await onSavePackaged(entry);
            if (saved) onClose();
            return saved;
          }}
          onCancel={onClose}
        />
      </section>
    </div>
  );
}
