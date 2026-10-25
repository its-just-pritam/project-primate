'use client';

import React, { useState } from 'react';
import { WorkoutEntry } from '@/types/nutrition';
import { Check, Dumbbell } from 'lucide-react';

interface WorkoutLoggerProps {
  workoutNames: string[];
  userName?: string;
  onLogWorkout: (entry: WorkoutEntry) => Promise<boolean>;
  onboardingHighlight?: boolean;
  isBottomNavHidden?: boolean;
}

export const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ workoutNames, userName, onLogWorkout, onboardingHighlight = false, isBottomNavHidden = false }) => {
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
    <form onSubmit={handleSubmit} className="workout-log-form space-y-4">
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

      <div className={`px-1 py-2 space-y-3 ${onboardingHighlight ? 'onboarding-workout-glow-fields' : ''}`}>
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Workout</label>
          <input
            type="text"
            list="known-workouts"
            placeholder="e.g. Upper Body"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="log-input w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
          />
          <datalist id="known-workouts">
            {workoutNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Calories Burnt (kcal)</label>
          <input
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 500"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            required
            className="log-input w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Timestamp</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            required
            max={getLocalDateTime()}
            className="log-input w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
          />
        </div>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-30 bg-[#090d16] px-4 pt-3 transition-[padding] duration-300 ${isBottomNavHidden ? 'pb-[max(1rem,env(safe-area-inset-bottom))]' : 'pb-[calc(5rem+env(safe-area-inset-bottom))]'}`}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`relative -translate-y-3 mx-auto w-full max-w-2xl py-4 rounded-2xl bg-gradient-to-br from-orange-300 via-orange-400 to-rose-400 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-[0_12px_30px_rgba(251,146,60,0.16),inset_0_1px_0_rgba(255,255,255,0.42)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${onboardingHighlight ? 'onboarding-workout-glow' : ''}`}
        >
          <Dumbbell className="w-4 h-4 stroke-[2.5]" />
          {isSubmitting ? 'Recording to Sheet...' : 'Log This Workout'}
        </button>
      </div>
    </form>
  );
};
