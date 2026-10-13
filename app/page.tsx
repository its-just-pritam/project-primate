'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from '@/components/Header';
import { AVATARS, DEFAULT_AVATAR } from '@/lib/avatars';
import {
  PlanCardSkeleton,
  MacroRingsSkeleton,
  ListSkeleton,
  ChartSkeleton,
  LogFormSkeleton,
} from '@/components/Skeletons';
import { BottomNav, TabType } from '@/components/BottomNav';
import { MacroRings } from '@/components/MacroRings';
import { DailyLogList } from '@/components/DailyLogList';
import { QuickLogger } from '@/components/QuickLogger';
import { WorkoutLogger } from '@/components/WorkoutLogger';
import { WorkoutList } from '@/components/WorkoutList';
import { RecipeManager } from '@/components/RecipeManager';
import { TrendsView } from '@/components/TrendsView';
import { PlanCarousel } from '@/components/PlanCarousel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toLocalDateKey, parseLocalDateKey } from '@/lib/localDate';
import { ProfileScreen } from '@/components/ProfileScreen';
import { StartupSplash } from '@/components/StartupSplash';
import {
  MealLogEntry,
  WorkoutEntry,
  ProfileUpdate,
  PlanInput,
  Recipe,
  DailyTargets,
  PlanAnalytics,
  DEFAULT_TARGETS,
  DEFAULT_RECIPES,
} from '@/types/nutrition';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [logs, setLogs] = useState<MealLogEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: 'meal' | 'workout';
    id: string;
    name: string;
    timestamp: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openNewPlan, setOpenNewPlan] = useState(false);
  const [logMode, setLogMode] = useState<'meal' | 'workout'>('meal');
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const initialLoading = isLoading && !hasLoaded;
  const [targets, setTargets] = useState<DailyTargets>(DEFAULT_TARGETS);
  const [plan, setPlan] = useState<PlanAnalytics | null>(null);
  const [activePlans, setActivePlans] = useState<PlanAnalytics[]>([]);
  const [planIdx, setPlanIdx] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalDateKey(new Date())
  );
  const todayKey = toLocalDateKey(new Date());
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // Moves the selected day by delta days, never past today.
  const shiftSelectedDate = (delta: number) => {
    const d = parseLocalDateKey(selectedDate);
    d.setDate(d.getDate() + delta);
    const next = toLocalDateKey(d);
    if (next > todayKey) return;
    setSelectedDate(next);
  };

  // Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mealsRes, workoutsRes, recipesRes, planRes] = await Promise.all([
        fetch('/api/meals'),
        fetch('/api/workouts'),
        fetch('/api/recipes'),
        fetch('/api/plan'),
      ]);

      if (mealsRes.ok) {
        const mealsData = await mealsRes.json();
        setLogs(mealsData.logs || []);
        setIsLive(Boolean(mealsData.isLive));
      }

      if (workoutsRes.ok) {
        const workoutsData = await workoutsRes.json();
        setWorkouts(workoutsData.workouts || []);
      }

      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        setIngredientNames(recipesData.ingredientNames || []);
        if (recipesData.recipes && recipesData.recipes.length > 0) {
          setRecipes(recipesData.recipes);
        }
      }

      if (planRes.ok) {
        const planData = await planRes.json();
        if (planData.plan) {
          setPlan(planData.plan);
          if (planData.plan.avatar && AVATARS.includes(planData.plan.avatar)) setAvatar(planData.plan.avatar);
          setActivePlans(planData.plan.hasPlan ? planData.activePlans || [planData.plan] : []);
          setPlanIdx(0);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // The plan currently shown in the swipeable cards drives the budget and trends
  const currentPlan = activePlans[planIdx] ?? plan;

  useEffect(() => {
    if (currentPlan?.hasPlan && currentPlan.restingCalories) {
      setTargets((prev) => ({ ...prev, calories: currentPlan.restingCalories }));
    }
  }, [currentPlan?.hasPlan, currentPlan?.restingCalories]);

  // Filter logs for selected date
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      return toLocalDateKey(log.timestamp) === selectedDate;
    });
  }, [logs, selectedDate]);

  const filteredWorkouts = useMemo(
    () => workouts.filter((w) => toLocalDateKey(w.timestamp) === selectedDate),
    [workouts, selectedDate]
  );

  const workoutCaloriesByDate = useMemo(() => {
    const byDate: Record<string, number> = {};
    workouts.forEach((w) => {
      if (Number.isNaN(new Date(w.timestamp).getTime())) return;
      const key = toLocalDateKey(w.timestamp);
      byDate[key] = (byDate[key] || 0) + (Number(w.caloriesBurnt) || 0);
    });
    return byDate;
  }, [workouts]);

  const workoutNames = useMemo(() => Array.from(new Set(workouts.map((w) => w.name))), [workouts]);

  // Compute daily totals
  const dailyTotals = useMemo(() => {
    return filteredLogs.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fats: acc.fats + item.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [filteredLogs]);

  // Handlers
  const handleLogMeal = async (entry: MealLogEntry): Promise<boolean> => {
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!res.ok) throw new Error('Failed to log meal');

      // Reload so the new entry carries its sheet row id (needed for deletion)
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      // Still log locally so user isn't blocked
      setLogs((prev) => [entry, ...prev]);
      return true;
    }
  };

  const handleLogWorkout = async (entry: WorkoutEntry): Promise<boolean> => {
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error('Failed to log workout');
      // Reload so the plan totals and trends include the new workout
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const confirmDeleteLog = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(pendingDelete.kind === 'meal' ? '/api/meals' : '/api/workouts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pendingDelete.id,
          dish: pendingDelete.name,
          name: pendingDelete.name,
          timestamp: pendingDelete.timestamp,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      await loadData();
      setPendingDelete(null);
    } catch (err) {
      console.error(err);
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the entry');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSaveProfile = async (profile: ProfileUpdate): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handlePlanRequest = async (method: 'PUT' | 'DELETE', body: object): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Plan request failed');
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleAddRecipe = async (
    dish: string,
    items: { ingredient: string; quantity: number }[]
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish, items }),
      });
      if (!res.ok) throw new Error('Failed to save recipe');
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleAvatarChange = (next: string) => {
    setAvatar(next);
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: next }),
    }).catch((err) => console.error(err));
  };

  const handleUpdateRecipe = async (
    dish: string,
    items: { ingredient: string; quantity: number }[]
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish, items }),
      });
      if (!res.ok) throw new Error('Failed to update recipe');
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  if (initialLoading) {
    return <StartupSplash />;
  }

  if (showProfile) {
    return (
      <ProfileScreen
        avatar={avatar}
        onAvatarChange={handleAvatarChange}
        plan={plan}
        startWithNewPlan={openNewPlan}
        onClose={() => {
          setShowProfile(false);
          setOpenNewPlan(false);
        }}
        onSave={handleSaveProfile}
        onAddPlan={(p: PlanInput) => handlePlanRequest('PUT', p)}
        onDeletePlan={(rowNumber, comment) => handlePlanRequest('DELETE', { rowNumber, comment })}
      />
    );
  }

  return (
    <>
      <Header
        isLive={isLive}
        onRefresh={loadData}
        isLoading={isLoading}
        userName={plan?.userName}
      />

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Tab 1: Today Dashboard */}
        {activeTab === 'today' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {initialLoading ? (
              <PlanCardSkeleton />
            ) : (
              <PlanCarousel plans={activePlans} index={planIdx} onIndexChange={setPlanIdx} />
            )}
            {!initialLoading && plan && !plan.hasPlan && (
              <div className="flex flex-col items-center gap-3 py-3">
                <p className="text-sm text-slate-400">No active plan right now.</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenNewPlan(true);
                    setShowProfile(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add a new Plan
                </button>
              </div>
            )}

            {/* Date Selector Header */}
            <div
              className="space-y-4 touch-pan-y"
              onTouchStart={(e) => {
                const t = e.touches[0];
                swipeStart.current = { x: t.clientX, y: t.clientY };
              }}
              onTouchEnd={(e) => {
                const start = swipeStart.current;
                swipeStart.current = null;
                if (!start) return;
                const t = e.changedTouches[0];
                const dx = t.clientX - start.x;
                const dy = t.clientY - start.y;
                if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                shiftSelectedDate(dx < 0 ? 1 : -1);
              }}
            >
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Daily Nutrition
                </p>
                <h2 className="text-lg font-extrabold text-white">
                  {selectedDate === todayKey
                    ? 'Today'
                    : parseLocalDateKey(selectedDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                </h2>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  aria-label="Previous day"
                  onClick={() => shiftSelectedDate(-1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayKey}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  aria-label="Next day"
                  onClick={() => shiftSelectedDate(1)}
                  disabled={selectedDate >= todayKey}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {initialLoading ? (
              <>
                <MacroRingsSkeleton />
                <ListSkeleton label="Loading meals" rows={2} />
                <ListSkeleton label="Loading workouts" rows={1} />
              </>
            ) : (
              <>
            <MacroRings totals={dailyTotals} targets={targets} />
            <DailyLogList
              logs={filteredLogs}
              onDelete={(l) =>
                setPendingDelete({ kind: 'meal', id: l.id!, name: l.dish, timestamp: l.timestamp })
              }
            />
            <WorkoutList
              workouts={filteredWorkouts}
              onDelete={(w) =>
                setPendingDelete({ kind: 'workout', id: w.id!, name: w.name, timestamp: w.timestamp })
              }
            />
              </>
            )}
            </div>
          </div>
        )}

        {/* Tab 2: Log Meal Form */}
        {activeTab === 'log' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {(['meal', 'workout'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLogMode(m)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    logMode === m
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'meal' ? 'Meal' : 'Workout'}
                </button>
              ))}
            </div>
            {initialLoading ? (
              <LogFormSkeleton />
            ) : logMode === 'meal' ? (
              <QuickLogger
                recipes={recipes}
                userName={plan?.userName}
                onLogMeal={handleLogMeal}
                onNavigateToRecipes={() => setActiveTab('recipes')}
              />
            ) : (
              <WorkoutLogger
                workoutNames={workoutNames}
                userName={plan?.userName}
                onLogWorkout={handleLogWorkout}
              />
            )}
          </div>
        )}

        {/* Tab 3: Recipes Catalog */}
        {activeTab === 'recipes' && (
          <div className="animate-in fade-in duration-200">
            {initialLoading ? (
              <ListSkeleton label="Loading recipes" rows={3} />
            ) : (
              <RecipeManager recipes={recipes} ingredientNames={ingredientNames} onAddRecipe={handleAddRecipe} onUpdateRecipe={handleUpdateRecipe} />
            )}
          </div>
        )}

        {/* Tab 4: Trends & Analytics */}
        {activeTab === 'trends' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {initialLoading ? (
              <ChartSkeleton />
            ) : (
            <TrendsView
              logs={logs}
              targets={targets}
              daysElapsed={currentPlan?.hasPlan ? currentPlan.daysElapsed : undefined}
              planStartDate={currentPlan?.hasPlan ? currentPlan.startDate : undefined}
              currentWeight={currentPlan?.hasPlan ? currentPlan.currentWeight : undefined}
              restingCalories={currentPlan?.hasPlan ? currentPlan.restingCalories : undefined}
              workoutCaloriesByDate={workoutCaloriesByDate}
            />
            )}
          </div>
        )}
      </div>

      <BottomNav
        currentTab={activeTab}
        onChangeTab={setActiveTab}
        avatar={avatar}
        onOpenProfile={() => {
          setOpenNewPlan(false);
          setShowProfile(true);
        }}
      />

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete ${pendingDelete.kind === 'meal' ? 'meal' : 'workout'} "${pendingDelete.name}"?`}
          message={deleteError ?? 'The entry is removed from the sheet.'}
          busy={deleteBusy}
          onConfirm={confirmDeleteLog}
          onCancel={() => {
            setPendingDelete(null);
            setDeleteError(null);
          }}
        />
      )}
    </>
  );
}
