'use client';

import React, { useState } from 'react';
import { MealLogEntry, MICRO_FIELDS } from '@/types/nutrition';
import { Clock, UtensilsCrossed, ChevronDown, Trash2 } from 'lucide-react';
import { IngredientBreakdown } from './IngredientBreakdown';

interface DailyLogListProps {
  logs: MealLogEntry[];
  onDelete?: (log: MealLogEntry) => void;
}

export const DailyLogList: React.FC<DailyLogListProps> = ({ logs, onDelete }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
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
          Today's Meals ({logs.length})
        </h3>
        <span className="text-[11px] text-slate-500">
          {logs.reduce((sum, item) => sum + item.calories, 0)} kcal total
        </span>
      </div>

      <div className="space-y-2">
        {logs.map((item, idx) => {
          const key = item.id || String(idx);
          const isOpen = !!expanded[key];
          return (
          <div
            key={key}
            onClick={() => toggle(key)}
            className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all shadow-sm cursor-pointer"
          >
            <div className="flex items-start justify-between">
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

              <div className="flex items-center gap-1 text-right">
                <span className="text-sm font-black text-white">
                  {Math.round(item.calories)} <span className="text-xs font-normal text-slate-400">kcal</span>
                </span>
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

            {/* Macro details pills */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] font-medium">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                P: {item.protein}g
              </span>
              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                C: {item.carbs}g
              </span>
              <span className="text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                F: {item.fats}g
              </span>
              <div className="ml-auto flex items-center gap-1">

                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {isOpen && (
              <div className="mt-2 space-y-2">
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
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
};
