'use client';

import React, { useState } from 'react';
import { WorkoutEntry } from '@/types/nutrition';
import { Check, Dumbbell } from 'lucide-react';

interface WorkoutLoggerProps {
  workoutNames: string[];
  userName?: string;
  onLogWorkout: (entry: WorkoutEntry) => Promise<boolean>;
}

export const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ workoutNames, userName, onLogWorkout }) => {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [timestamp, setTimestamp] = useState(getLocalDateTime());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kcal = parseFloat(calories);
    if (!name.trim() || !(kcal > 0) || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const ok = await onLogWorkout({
      name: name.trim(),
      caloriesBurnt: kcal,
      timestamp: new Date(timestamp).toISOString(),
      user: userName || 'Pritam Mallick',
    });
    setIsSubmitting(false);

    if (ok) {
      setToast(`Logged ${name.trim()}!`);
      setTimeout(() => setToast(null), 3000);
      setName('');
      setCalories('');
    } else {
      setError('Could not save the workout. Please try again.');
    }
  };

  function getLocalDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const localDateTime = now.toISOString().slice(0, 16);
    return localDateTime;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {toast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Workout</label>
          <input
            type="text"
            list="known-workouts"
            placeholder="e.g. Upper Body"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <datalist id="known-workouts">
            {workoutNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-xs font-semibold text-red-400 block mb-1">Calories Burnt (kcal)</label>
          <input
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 500"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-white block mb-1">Timestamp</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            required
            max={getLocalDateTime()}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-400 hover:from-red-400 hover:to-orange-300 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Dumbbell className="w-4 h-4 stroke-[2.5]" />
        {isSubmitting ? 'Recording to Sheet...' : 'Log This Workout'}
      </button>
    </form>
  );
};
