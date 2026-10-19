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
import type { PackagedInput } from '@/components/PackagedForm';
import { TrendsView } from '@/components/TrendsView';
import { PlanCarousel } from '@/components/PlanCarousel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { toLocalDateKey, parseLocalDateKey } from '@/lib/localDate';
import { ProfileScreen } from '@/components/ProfileScreen';
import { StartupSplash } from '@/components/StartupSplash';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import {
  MealLogEntry,
  WorkoutEntry,
  ProfileUpdate,
  PlanInput,
  Recipe,
  DailyTargets,
  PlanAnalytics,
  DEFAULT_TARGETS,
} from '@/types/nutrition';

type OnboardingTaskId = 'profile' | 'plan' | 'recipe' | 'meal' | 'workout';
const ONBOARDING_TASKS: { id: OnboardingTaskId; title: string; description: string }[] = [
  { id: 'profile', title: 'Complete your profile', description: 'Add your profile details, then select Save to personalize your nutrition targets.' },
  { id: 'plan', title: 'Add a new plan', description: 'Enter a goal and start date, then select Add Plan to save it.' },
  { id: 'recipe', title: 'Add a recipe', description: 'Add a dish and its ingredients, then save the recipe to your catalog.' },
  { id: 'meal', title: 'Log a meal', description: 'Choose a dish and portion, then select Log This Meal to save your food log.' },
  { id: 'workout', title: 'Log a workout', description: 'Enter a workout and calories, then select Log This Workout to save it.' },
];

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
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const [profileSaveNotice, setProfileSaveNotice] = useState<string | null>(null);
  const profileSaveNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [completedOnboardingTasks, setCompletedOnboardingTasks] = useState<OnboardingTaskId[]>([]);
  const [logMode, setLogMode] = useState<'meal' | 'workout'>('meal');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [packaged, setPackaged] = useState<Recipe[]>([]);
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const [ingredientUnits, setIngredientUnits] = useState<Record<string, { baseQuantity: number; unit: string }>>({});
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

  const announceProfileSave = (message: string) => {
    setProfileSaveNotice(message);
    if (profileSaveNoticeTimer.current) clearTimeout(profileSaveNoticeTimer.current);
    profileSaveNoticeTimer.current = setTimeout(() => setProfileSaveNotice(null), 3000);
  };
  const profileSaveToast = profileSaveNotice ? (
    <div role="status" aria-live="polite" className="mx-auto my-2 flex w-[calc(100%-2rem)] max-w-2xl items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300">
      <CheckCircle2 className="h-4 w-4 shrink-0" /> {profileSaveNotice}
    </div>
  ) : null;

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
      const [mealsRes, workoutsRes, recipesRes, planRes, onboardingRes] = await Promise.all([
        fetch('/api/meals'),
        fetch('/api/workouts'),
        fetch('/api/recipes'),
        fetch('/api/plan'),
        fetch('/api/onboarding'),
      ]);

      if (onboardingRes.ok) {
        const onboardingData = await onboardingRes.json();
        setOnboardingStep(Number(onboardingData.step) === 0 ? 0 : 1);
      }

      if (mealsRes.ok) {
        const mealsData = await mealsRes.json();
        setLogs(mealsData.logs || []);
      }

      if (workoutsRes.ok) {
        const workoutsData = await workoutsRes.json();
        setWorkouts(workoutsData.workouts || []);
      }

      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        setIngredientNames(recipesData.ingredientNames || []);
        setPackaged(recipesData.packaged || []);
        setIngredientUnits(recipesData.ingredientUnits || {});
        setRecipes(recipesData.recipes || []);
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

  const markOnboardingComplete = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/onboarding', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to save onboarding status');
      setOnboardingStep(1);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const completeOnboardingTask = async (task: OnboardingTaskId) => {
    const updated = new Set(completedOnboardingTasks);
    updated.add(task);
    setCompletedOnboardingTasks(Array.from(updated));
    if (updated.size === ONBOARDING_TASKS.length) await markOnboardingComplete();
  };

  const goToOnboardingTask = (task: OnboardingTaskId) => {
    switch (task) {
      case 'profile':
        setOpenNewPlan(false);
        setShowProfile(true);
        break;
      case 'plan':
        setOpenNewPlan(true);
        setShowProfile(true);
        break;
      case 'recipe':
        setShowProfile(false);
        setOpenNewPlan(false);
        setActiveTab('recipes');
        break;
      case 'meal':
        setShowProfile(false);
        setOpenNewPlan(false);
        setLogMode('meal');
        setActiveTab('log');
        break;
      case 'workout':
        setShowProfile(false);
        setOpenNewPlan(false);
        setLogMode('workout');
        setActiveTab('log');
        break;
    }
  };

  const activeOnboardingTask = ONBOARDING_TASKS[onboardingIndex];
  const continueOnboarding = () => {
    if (!activeOnboardingTask) return;
    if (!onboardingStarted) {
      setOnboardingStarted(true);
      goToOnboardingTask(activeOnboardingTask.id);
      return;
    }
    if (onboardingIndex >= ONBOARDING_TASKS.length - 1) {
      void markOnboardingComplete();
      return;
    }
    const nextIndex = onboardingIndex + 1;
    setOnboardingIndex(nextIndex);
    goToOnboardingTask(ONBOARDING_TASKS[nextIndex].id);
  };
  const onboardingGuide = onboardingStep === 0 && activeOnboardingTask ? (
    <OnboardingGuide
      step={onboardingIndex + 1}
      title={activeOnboardingTask.title}
      description={activeOnboardingTask.description}
      actionLabel={onboardingIndex === ONBOARDING_TASKS.length - 1 ? 'Done' : onboardingStarted ? 'Next' : 'Get started'}
      onContinue={continueOnboarding}
    />
  ) : null;

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

      await completeOnboardingTask('meal');
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
      await completeOnboardingTask('workout');
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
      announceProfileSave(profile.planRow ? 'Plan updated' : 'Profile saved');
      await loadData();
      if (!profile.planRow) await completeOnboardingTask('profile');
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
      announceProfileSave(method === 'PUT' ? 'Plan added' : 'Plan deleted');
      await loadData();
      if (method === 'PUT') await completeOnboardingTask('plan');
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
      await completeOnboardingTask('recipe');
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleAddPackaged = async (p: PackagedInput): Promise<boolean> => {
    try {
      const res = await fetch('/api/packaged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, user: plan?.userName }),
      });
      if (!res.ok) throw new Error('Failed to save packaged food');
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleUpdatePackaged = async (p: PackagedInput): Promise<boolean> => {
    try {
      const res = await fetch('/api/packaged', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, user: plan?.userName }),
      });
      if (!res.ok) throw new Error('Failed to update packaged food');
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleAvatarChange = async (next: string) => {
    setAvatar(next);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: next }),
      });
      if (!response.ok) throw new Error('Failed to save avatar');
      announceProfileSave('Profile picture saved');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRecipe = async (
    originalDish: string,
    dish: string,
    items: { ingredient: string; quantity: number }[]
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalDish, dish, items }),
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
      <>
        <ProfileScreen
          avatar={avatar}
          onAvatarChange={handleAvatarChange}
          plan={plan}
          startWithNewPlan={openNewPlan}
          onboardingHighlight={onboardingStep === 0 ? (activeOnboardingTask?.id === 'profile' ? 'profile' : activeOnboardingTask?.id === 'plan' ? 'plan' : null) : null}
          onboardingGuide={onboardingGuide}
          successToast={profileSaveToast}
          onProfileSaveSuccess={announceProfileSave}
          keepOpenDuringOnboarding={onboardingStep === 0}
          onClose={() => {
            if (onboardingStep === 0) void markOnboardingComplete();
            setShowProfile(false);
            setOpenNewPlan(false);
          }}
          onSave={handleSaveProfile}
          onAddPlan={(p: PlanInput) => handlePlanRequest('PUT', p)}
          onDeletePlan={(rowNumber, comment) => handlePlanRequest('DELETE', { rowNumber, comment })}
          onSignOut={async () => {
            if (onboardingStep === 0) await fetch('/api/onboarding', { method: 'POST' });
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.assign('/');
          }}
        />
      </>
    );
  }

  return (
    <>
      <Header
        onRefresh={loadData}
        isLoading={isLoading}
        userName={plan?.userName}
      />
      {profileSaveToast}
      {onboardingGuide}

      <div className="flex-1 px-4 md:px-8 py-4 space-y-4 overflow-y-auto">
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
                <p className="text-sm text-slate-400">Set a goal and start tracking your progress.</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenNewPlan(true);
                    setShowProfile(true);
                  }}
                  className="group inline-flex items-center gap-2.5 rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-105 hover:shadow-xl hover:shadow-emerald-500/30 active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                >
                  <Plus className="h-7 w-7 rounded-full bg-white/25 p-1.5 transition-transform group-hover:rotate-90" /> Add Plan
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
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-[linear-gradient(155deg,#182438,#101827)] text-slate-300 shadow-[4px_5px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:text-white active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayKey}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="rounded-xl bg-[linear-gradient(155deg,#182438,#101827)] px-2.5 py-1.5 text-center text-xs text-slate-200 shadow-[4px_5px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  type="button"
                  aria-label="Next day"
                  onClick={() => shiftSelectedDate(1)}
                  disabled={selectedDate >= todayKey}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-[linear-gradient(155deg,#182438,#101827)] text-slate-300 shadow-[4px_5px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:text-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {initialLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <MacroRingsSkeleton />
                <div className="space-y-4">
                  <ListSkeleton label="Loading meals" rows={2} />
                  <ListSkeleton label="Loading workouts" rows={1} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <MacroRings totals={dailyTotals} targets={targets} />
            <div className="space-y-4 min-w-0">
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
            </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Tab 2: Log Meal Form */}
        {activeTab === 'log' && (
          <div className="space-y-4 animate-in fade-in duration-200 md:max-w-2xl md:mx-auto">
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
                recipes={[...recipes, ...packaged]}
                userName={plan?.userName}
                onboardingHighlight={onboardingStep === 0 && activeOnboardingTask?.id === 'meal'}
                onLogMeal={handleLogMeal}
                onNavigateToRecipes={() => setActiveTab('recipes')}
              />
            ) : (
              <WorkoutLogger
                workoutNames={workoutNames}
                userName={plan?.userName}
                onboardingHighlight={onboardingStep === 0 && activeOnboardingTask?.id === 'workout'}
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
              <RecipeManager recipes={recipes} packaged={packaged} ingredientNames={ingredientNames} ingredientUnits={ingredientUnits} onboardingHighlight={onboardingStep === 0 && activeOnboardingTask?.id === 'recipe'} onAddRecipe={handleAddRecipe} onAddPackaged={handleAddPackaged} onUpdateRecipe={handleUpdateRecipe} onUpdatePackaged={handleUpdatePackaged} />
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
