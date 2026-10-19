'use client';

import React from 'react';
import { WorkoutEntry } from '@/types/nutrition';
import { Clock, Dumbbell, Trash2 } from 'lucide-react';

export const WorkoutList: React.FC<{
  workouts: WorkoutEntry[];
  onDelete?: (w: WorkoutEntry) => void;
}> = ({ workouts, onDelete }) => {
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
      <div className="space-y-2">
        {workouts.map((w, idx) => (
          <div
            key={w.id || idx}
            className="app-card-raised rounded-2xl p-3.5 flex items-start justify-between"
          >
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">{w.name}</h4>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatTime(w.timestamp)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-red-400">
                {Math.round(w.caloriesBurnt)}{' '}
                <span className="text-xs font-normal text-slate-400">kcal</span>
              </span>
              {onDelete && w.id && (
                <button
                  type="button"
                  aria-label={`Delete ${w.name}`}
                  onClick={() => onDelete(w)}
                  className="h-7 w-7 -mr-1 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
