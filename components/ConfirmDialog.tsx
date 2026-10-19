'use client';

import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}) => (
  <div
    className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex items-center justify-center bg-black/60 p-3"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    onClick={() => !busy && onCancel()}
  >
    <div
      className="app-card-surface w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-4 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      <h4 className="text-sm font-bold text-white">{title}</h4>
      {message && <p className="text-[11px] text-slate-400">{message}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs disabled:opacity-50"
        >
          {busy ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
