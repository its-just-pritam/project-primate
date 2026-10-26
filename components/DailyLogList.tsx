'use client';

import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { MealLogEntry, MICRO_FIELDS } from '@/types/nutrition';
import { Clock, UtensilsCrossed, Trash2 } from 'lucide-react';
import { IngredientBreakdown } from './IngredientBreakdown';

interface DailyLogListProps {
  logs: MealLogEntry[];
  onDelete?: (log: MealLogEntry) => void;
}

export const DailyLogList: React.FC<DailyLogListProps> = ({ logs, onDelete }) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const entries = logs.map((item, index) => ({ item, key: item.id || String(index) }));
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

  if (!logs || logs.length === 0) {
    return (
      <div className="app-card-surface rounded-2xl p-8 text-center">
        <UtensilsCrossed className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">No meals logged yet today</p>
        <p className="text-xs text-slate-500 mt-1">
          Tap the "Log" button below to record your first meal!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Meals ({logs.length})
        </h3>
        <span className="text-[11px] text-slate-500">
          {logs.reduce((sum, item) => sum + item.calories, 0)} kcal total
        </span>
      </div>

      <div>
        {rows.map((row, rowIndex) => (
          <div key={row.map(({ key }) => key).join(':')} className="relative flex flex-wrap gap-x-1.5">
            {row.length === 2 && <span aria-hidden="true" className={`recipe-partition-vertical ${rowIndex === firstVerticalRowIndex ? 'recipe-partition-fade-top' : ''} ${rowIndex === lastVerticalRowIndex ? 'recipe-partition-fade-bottom' : ''}`} />}
            {row.map(({ item, key }) => {
              const isOpen = expandedKey === key;
              return (
          <div
            key={key}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button, input, textarea, select')) return;
              toggle(key);
            }}
            style={{ viewTransitionName: `meal-card-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}` }}
            className={`recipe-glass-card cursor-pointer p-3.5 ${isOpen ? 'recipe-glass-card-open w-full rounded-2xl' : 'recipe-glass-card-closed w-[calc(50%-0.1875rem)]'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {item.dish}
                  </h4>
                  {item.portion > 1 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-semibold text-emerald-400">
                      {item.portion}x
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 text-right">
                {onDelete && item.id && (
                  <button
                    type="button"
                    aria-label={`Delete ${item.dish}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    className="h-7 w-7 -mr-1 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}              </div>
            </div>

            <div className="mt-2 space-y-1 border-t border-slate-800/60 pt-2 text-[9px] font-medium">
              <div className="flex justify-start gap-1.5">
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-white/[0.06] px-2 py-1 text-white">
                  {isOpen ? <span>Energy</span> : <><span className="hidden sm:inline">Energy</span><span className="sm:hidden">E:</span></>}
                  <span className="font-bold">{Math.round(item.calories)} kcal</span>
                </span>
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-sky-500/10 px-2 py-1 text-white">
                  {isOpen ? <span>Fats</span> : <><span className="hidden sm:inline">Fats</span><span className="sm:hidden">F:</span></>}
                  <span className="font-bold">{item.fats}g</span>
                </span>
              </div>
              <div className="flex justify-start gap-1.5">
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-rose-500/10 px-2 py-1 text-white">
                  {isOpen ? <span>Protein</span> : <><span className="hidden sm:inline">Protein</span><span className="sm:hidden">P:</span></>}
                  <span className="font-bold">{item.protein}g</span>
                </span>
                <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-500/10 px-2 py-1 text-white">
                  {isOpen ? <span>Carbs</span> : <><span className="hidden sm:inline">Carbs</span><span className="sm:hidden">C:</span></>}
                  <span className="font-bold">{item.carbs}g</span>
                </span>
              </div>
            </div>

            <div aria-hidden={!isOpen} className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${isOpen ? 'mt-2 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
              <div className="min-h-0 overflow-hidden space-y-2">
                {item.micros && (
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total micronutrients
                    </h5>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5">
                      {MICRO_FIELDS.map((f) => (
                        <div key={f.key} className="flex justify-between text-[10px] text-slate-400">
                          <span>{f.label}</span>
                          <span className="text-slate-200 font-medium">
                            {item.micros![f.key]} {f.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <IngredientBreakdown ingredients={item.ingredients} />
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
