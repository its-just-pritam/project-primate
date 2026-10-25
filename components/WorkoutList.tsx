'use client';

import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { WorkoutEntry } from '@/types/nutrition';
import { Clock, Dumbbell, Trash2 } from 'lucide-react';

export const WorkoutList: React.FC<{
  workouts: WorkoutEntry[];
  onDelete?: (w: WorkoutEntry) => void;
}> = ({ workouts, onDelete }) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const entries = workouts.map((workout, index) => ({ workout, key: workout.id || String(index) }));
  const expandedIndex = entries.findIndex(({ key }) => key === expandedKey);
  const hiddenSiblingIndex = expandedIndex < 0 ? -1 : expandedIndex % 2 === 0 ? expandedIndex + 1 : expandedIndex - 1;
  const visibleEntries = entries.filter((_, index) => index !== hiddenSiblingIndex);
  const rows: typeof entries[] = [];
  let closedRow: typeof entries = [];
  visibleEntries.forEach((entry) => {
    if (entry.key === expandedKey) {
      if (closedRow.length) rows.push(closedRow);
      closedRow = [];
      rows.push([entry]);
      return;
    }
    closedRow.push(entry);
    if (closedRow.length === 2) {
      rows.push(closedRow);
      closedRow = [];
    }
  });
  if (closedRow.length) rows.push(closedRow);
  const verticalRowIndexes = rows.flatMap((row, index) => row.length === 2 ? [index] : []);
  const firstVerticalRowIndex = verticalRowIndexes[0] ?? -1;
  const lastVerticalRowIndex = verticalRowIndexes.at(-1) ?? -1;

  const toggle = (key: string) => {
    const update = () => flushSync(() => setExpandedKey((current) => current === key ? null : key));
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(update);
    } else {
      update();
    }
  };

  if (workouts.length === 0) {
    return (
      <div className="app-card-surface rounded-2xl p-6 text-center">
        <Dumbbell className="w-7 h-7 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">No workouts logged</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Workouts ({workouts.length})
        </h3>
        <span className="text-[11px] text-red-400 font-semibold">
          {Math.round(workouts.reduce((s, w) => s + w.caloriesBurnt, 0))} kcal burnt
        </span>
      </div>
      <div>
        {rows.map((row, rowIndex) => (
          <div key={row.map(({ key }) => key).join(':')} className="relative flex flex-wrap gap-x-1.5">
            {row.length === 2 && <span aria-hidden="true" className={`recipe-partition-vertical ${rowIndex === firstVerticalRowIndex ? 'recipe-partition-fade-top' : ''} ${rowIndex === lastVerticalRowIndex ? 'recipe-partition-fade-bottom' : ''}`} />}
            {row.map(({ workout: w, key }) => {
              const isOpen = expandedKey === key;
              return (
          <div
            key={key}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button, input, textarea, select')) return;
              toggle(key);
            }}
            style={{ viewTransitionName: `workout-card-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}` }}
            className={`recipe-glass-card cursor-pointer p-3.5 ${isOpen ? 'recipe-glass-card-open w-full rounded-2xl' : 'recipe-glass-card-closed w-[calc(50%-0.1875rem)]'}`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="min-w-0 flex-1 text-sm font-bold tracking-tight text-white">{w.name}</h4>
                {onDelete && w.id && (
                  <button
                    type="button"
                    aria-label={`Delete ${w.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(w);
                    }}
                    className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatTime(w.timestamp)}</span>
              </div>
            </div>
            <div className="mt-2 border-t border-slate-800/60 pt-2 text-[9px] font-medium">
              <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-rose-500/10 px-2 py-1 text-rose-300">
                <span>Burned</span><span className="font-bold">{Math.round(w.caloriesBurnt)} kcal</span>
              </span>
            </div>
            <div aria-hidden={!isOpen} className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${isOpen ? 'mt-2 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
              <div className="min-h-0 overflow-hidden border-t border-white/10 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workout details</p>
                <p className="mt-1 text-xs text-slate-300">{new Date(w.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
              );
            })}
            {rowIndex < rows.length - 1 && <div aria-hidden="true" className="my-2 h-px w-full bg-gradient-to-r from-transparent via-slate-400/35 to-transparent" />}
          </div>
        ))}
      </div>
    </div>
  );
};
