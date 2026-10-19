'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { MealLogEntry, DailyTargets } from '@/types/nutrition';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Award, CalendarDays } from 'lucide-react';
import { toLocalDateKey } from '@/lib/localDate';
import {
  calculateDailyFatMassChangeGrams,
  calculateDailyWetMuscleMassChangeGrams,
  calculateThermicEffectOfFood,
} from '@/lib/bodyComposition';

interface TrendsViewProps {
  logs: MealLogEntry[];
  targets: DailyTargets;
  daysElapsed?: number;
  planStartDate?: string;
  currentWeight?: number;
  restingCalories?: number;
  workoutCaloriesByDate?: Record<string, number>;
}

const parseDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const DayTick = ({ x, y, payload }: any) => {
  const d = parseDay(String(payload.value));
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" y={14} fill="#cbd5e1" fontSize={10} fontWeight={600}>
        {d.toLocaleDateString([], { weekday: 'short' })}
      </text>
      <text textAnchor="middle" y={27} fill="#64748b" fontSize={9}>
        {d.toLocaleDateString([], { day: 'numeric', month: 'short' })}
      </text>
    </g>
  );
};

const CHART_MARGIN = { top: 12, right: 8, left: 0, bottom: 0 };
const BAR_CHART_PROPS = { barCategoryGap: '18%', barGap: 6, maxBarSize: 34 };
const VISIBLE_CHART_DAYS = 7;

const useChartScroller = (dayCount: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const updateWidth = () => setViewportWidth(element.clientWidth);
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    updateWidth();
    return () => observer.disconnect();
  }, []);

  const chartWidth = viewportWidth
    ? `${Math.max(viewportWidth, (viewportWidth * dayCount) / VISIBLE_CHART_DAYS)}px`
    : '100%';

  useLayoutEffect(() => {
    const element = ref.current;
    if (element && viewportWidth) {
      element.scrollLeft = element.scrollWidth - element.clientWidth;
    }
  }, [chartWidth, dayCount, viewportWidth]);

  return { ref, chartWidth };
};

const TOOLTIP_PROPS = {
  cursor: { fill: 'rgba(148, 163, 184, 0.08)' },
  labelFormatter: (iso: any) =>
    parseDay(String(iso)).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
  contentStyle: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#fff',
  },
};
export const TrendsView: React.FC<TrendsViewProps> = ({
  logs,
  targets,
  daysElapsed,
  planStartDate,
  currentWeight,
  restingCalories,
  workoutCaloriesByDate = {},
}) => {
  // Aggregate logs by date
  const dateMap: {
    [date: string]: {
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      burnt: number | null;
      resting: number | null;
      workout: number | null;
      tef: number | null;
      deficit: number | null;
      fatChange: number | null;
      muscleChange: number | null;
      displayDate: string;
    };
  } = {};

  // Charts cover the active plan period; KPI averages stay on the recent window.
  const CHART_DAYS = 7;
  const daysToShow =
    daysElapsed === undefined ? CHART_DAYS : Math.min(CHART_DAYS, Math.max(1, Math.floor(daysElapsed)));
  const planStartDateKey = planStartDate ? toLocalDateKey(planStartDate) : undefined;

  const today = new Date();
  const todayDateKey = toLocalDateKey(today);
  const recentStart = new Date(today);
  recentStart.setHours(0, 0, 0, 0);
  recentStart.setDate(recentStart.getDate() - (CHART_DAYS - 1));
  const chartStart =
    planStartDateKey && planStartDateKey <= todayDateKey
      ? parseDay(planStartDateKey)
      : recentStart;
  for (let d = new Date(chartStart); toLocalDateKey(d) <= todayDateKey; d.setDate(d.getDate() + 1)) {
    const dateStr = toLocalDateKey(d);
    const displayDate = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
    dateMap[dateStr] = {
      date: dateStr,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      burnt: 0,
      resting: 0,
      workout: 0,
      tef: 0,
      deficit: 0,
      fatChange: 0,
      muscleChange: 0,
      displayDate,
    };
  }

  logs.forEach((log) => {
    const dateStr = toLocalDateKey(log.timestamp);
    const day = dateMap[dateStr];
    if (day) {
      day.calories += log.calories;
      day.protein += log.protein;
      day.carbs += log.carbs;
      day.fats += log.fats;
    }
  });

  const chartData = Object.values(dateMap)
    .sort((a, b) => a.date.localeCompare(b.date));
  const caloriesChartScroll = useChartScroller(chartData.length);
  const deficitChartScroll = useChartScroller(chartData.length);
  const bodyCompositionChartScroll = useChartScroller(chartData.length);
  const proteinChartScroll = useChartScroller(chartData.length);

  // Days before the plan started have no burn, deficit, or composition change to report.
  if (restingCalories !== undefined) {
    chartData.forEach((day, idx) => {
      if (planStartDateKey !== undefined && day.date < planStartDateKey) {
        day.burnt = null;
        day.resting = null;
        day.workout = null;
        day.tef = null;
        day.deficit = null;
        day.fatChange = null;
        day.muscleChange = null;
        return;
      }
      // Today's resting burn accrues in proportion to the time elapsed so far.
      const isToday = idx === chartData.length - 1;
      const dayFraction = isToday
        ? (today.getHours() * 3600 + today.getMinutes() * 60 + today.getSeconds()) / 86400
        : 1;
      const restingBurn = restingCalories * dayFraction;
      day.resting = Math.round(restingBurn);
      day.workout = workoutCaloriesByDate[day.date] || 0;
      const thermicEffect = calculateThermicEffectOfFood({
        proteinG: day.protein,
        carbohydrateG: day.carbs,
        dietaryFatG: day.fats,
      });
      day.tef = thermicEffect;
      day.burnt = day.resting + day.workout + thermicEffect;
      day.deficit = day.burnt - day.calories;
      if (currentWeight !== undefined) {
        const compositionInputs = {
          weightKg: currentWeight,
          proteinG: day.protein,
          carbohydrateG: day.carbs,
          dietaryFatG: day.fats,
          calorieIntake: day.calories,
          workoutCalories: day.workout ?? 0,
          restingCalories: restingBurn,
        };
        day.fatChange = calculateDailyFatMassChangeGrams(compositionInputs);
        day.muscleChange = calculateDailyWetMuscleMassChangeGrams(compositionInputs);
      } else {
        day.fatChange = null;
        day.muscleChange = null;
      }
    });
  }

  const recentChartData = chartData.slice(-daysToShow);
  const averagedDays = planStartDateKey === undefined
    ? recentChartData
    : recentChartData.filter((day) => day.date >= planStartDateKey);

  const avgCalories =
    averagedDays.length > 0
      ? Math.round(averagedDays.reduce((s, d) => s + d.calories, 0) / averagedDays.length)
      : 0;

  const avgProtein =
    averagedDays.length > 0
      ? Math.round((averagedDays.reduce((s, d) => s + d.protein, 0) / averagedDays.length) * 10) / 10
      : 0;
  return (
    <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-stretch [&>*]:min-w-0">
      <div className="md:col-span-2">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" /> Nutrition Analytics
        </h2>
        <p className="text-xs text-slate-400">Daily intake vs your target goals</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-2.5 md:col-span-2">
        <div className="app-card-raised rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
            {daysToShow}-Day Avg Calories
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{avgCalories}</span>
            <span className="text-xs text-slate-500">kcal/day</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <Award className="w-3 h-3" /> Limit: {targets.calories} kcal
          </p>
        </div>

        <div className="app-card-raised rounded-2xl p-3.5">
          <span className="text-[11px] font-semibold text-emerald-400 block mb-1">
            {daysToShow}-Day Avg Protein
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{avgProtein}</span>
            <span className="text-xs text-slate-500">g/day</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <Award className="w-3 h-3" /> Target: {targets.protein}g
          </p>
        </div>
      </div>

      {/* Calorie Consumed vs Burnt Chart Card */}
      <div className="app-card-surface rounded-2xl p-4 space-y-3 flex flex-col md:h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-orange-400" /> Calories Consumed vs Burnt
          </h3>
          <span className="text-[10px] text-slate-400">Target: {targets.calories} kcal</span>
        </div>

        <p className="text-[10px] text-slate-400">
          Consumed (blue) beside burnt, stacked as resting (yellow), workout (red), and TEF (orange).
          {restingCalories === undefined && (
            <span className="text-amber-400"> Plan burn data is unavailable.</span>
          )}
        </p>

        <div ref={caloriesChartScroll.ref} className="h-48 w-full mt-auto overflow-x-auto overscroll-x-contain" role="region" aria-label="Scrollable calories consumed and burnt chart">
          <div className="h-full" style={{ width: caloriesChartScroll.chartWidth }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={CHART_MARGIN} {...BAR_CHART_PROPS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" tick={<DayTick />} interval={0} height={40} tickLine={false} axisLine={{ stroke: '#334155' }} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  formatter={(value, name) => [
                    `${name === 'TEF' ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 }) : value} kcal`,
                    name,
                  ]}
                  {...TOOLTIP_PROPS}
                />
                <ReferenceLine y={targets.calories} stroke="#f8fafc" strokeDasharray="3 3" />
                <Bar dataKey="calories" name="Consumed" fill="#4e79a7" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resting" name="Resting" stackId="burnt" fill="#fbbf24" />
                <Bar dataKey="tef" name="TEF" stackId="burnt" fill="#fb923c" />
                <Bar
                  dataKey="workout"
                  name="Workout"
                  stackId="burnt"
                  fill="#f87171"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Daily Calorie Deficit Chart */}
      <div className="app-card-surface rounded-2xl p-4 space-y-3 flex flex-col md:h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Daily Calorie Deficit
          </h3>
          {restingCalories !== undefined && (
            <span className="text-[10px] text-slate-400">
              Resting burn: {restingCalories} kcal/day
            </span>
          )}
        </div>

        {restingCalories === undefined ? (
          <p className="text-xs text-amber-400">Plan burn data is unavailable.</p>
        ) : (
          <>
            <p className="text-[10px] text-slate-400">
              Resting + workout + TEF calories burned − calories eaten.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-semibold">
              <span className="flex items-center gap-1.5 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Calorie deficit
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Surplus
              </span>
            </div>
            <div ref={deficitChartScroll.ref} className="h-48 w-full mt-auto overflow-x-auto overscroll-x-contain" role="region" aria-label="Scrollable daily calorie deficit chart">
              <div className="h-full" style={{ width: deficitChartScroll.chartWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={CHART_MARGIN} {...BAR_CHART_PROPS}>
                    <defs>
                      <linearGradient id="trend-deficit-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b91c1c" /><stop offset="100%" stopColor="#f87171" /></linearGradient>
                      <linearGradient id="trend-surplus-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#6ee7b7" /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={<DayTick />} interval={0} height={40} tickLine={false} axisLine={{ stroke: '#334155' }} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length || payload[0].value == null) return null;
                        const value = Number(payload[0].value);
                        const isDeficit = value > 0;
                        const color = isDeficit ? '#ef4444' : '#10b981';
                        return (
                          <div
                            style={{ ...TOOLTIP_PROPS.contentStyle, border: '1px solid #334155', padding: '8px 12px' }}
                          >
                            <p style={{ margin: 0, marginBottom: 4, color: '#fff' }}>
                              {TOOLTIP_PROPS.labelFormatter(label)}
                            </p>
                            <p style={{ margin: 0, color, fontWeight: 600 }}>
                              {isDeficit ? 'Calorie deficit' : 'Surplus'}: {value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kcal
                            </p>
                          </div>
                        );
                      }}
                      {...TOOLTIP_PROPS}
                    />
                    <ReferenceLine y={0} stroke="#64748b" />
                    <Bar dataKey="deficit" radius={[6, 6, 0, 0]}>
                      {chartData.map((day) => (
                        <Cell
                          key={day.date}
                          fill={day.deficit !== null && day.deficit > 0 ? 'url(#trend-deficit-gradient)' : 'url(#trend-surplus-gradient)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Daily Body Composition Change Chart */}
      <div className="app-card-surface rounded-2xl p-4 space-y-3 flex flex-col md:h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-violet-400" /> Daily Fat &amp; Muscle Change
          </h3>
          <span className="text-[10px] text-slate-400">Modelled mass change</span>
        </div>

        {restingCalories === undefined || currentWeight === undefined ? (
          <p className="text-xs text-amber-400">Plan body-composition data is unavailable.</p>
        ) : (
          <>
            <p className="text-[10px] text-slate-400">
              Daily predicted change from the active plan&apos;s fat and protein-balance models. Values above zero indicate gain.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-semibold">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Fat
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> Muscle
              </span>
            </div>
            <div ref={bodyCompositionChartScroll.ref} className="h-48 w-full mt-auto overflow-x-auto overscroll-x-contain" role="region" aria-label="Scrollable daily fat and muscle change chart">
              <div className="h-full" style={{ width: bodyCompositionChartScroll.chartWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={<DayTick />}
                    interval={0}
                    height={40}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    padding={{ left: 16, right: 16 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(value) => `${value}g`}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(1)} g`, name]}
                    {...TOOLTIP_PROPS}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Line
                    type="monotone"
                    dataKey="fatChange"
                    name="Fat"
                    stroke="#fb7185"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#fb7185' }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="muscleChange"
                    name="Muscle"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#38bdf8' }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Protein Intake Chart Card */}
      <div className="app-card-surface rounded-2xl p-4 space-y-3 flex flex-col md:h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-emerald-400" /> Daily Protein Intake
          </h3>
          <span className="text-[10px] text-slate-400">Target: {targets.protein}g</span>
        </div>

        <div ref={proteinChartScroll.ref} className="h-48 w-full mt-auto overflow-x-auto overscroll-x-contain" role="region" aria-label="Scrollable daily protein intake chart">
          <div className="h-full" style={{ width: proteinChartScroll.chartWidth }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={CHART_MARGIN} {...BAR_CHART_PROPS}>
                <defs>
                  <linearGradient id="trend-protein-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#6ee7b7" /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" tick={<DayTick />} interval={0} height={40} tickLine={false} axisLine={{ stroke: '#334155' }} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })} g`,
                    name,
                  ]}
                  {...TOOLTIP_PROPS}
                />
                <ReferenceLine y={targets.protein} stroke="#10b981" strokeDasharray="3 3" />
                <Bar dataKey="protein" fill="url(#trend-protein-gradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
