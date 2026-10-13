'use client';

import React from 'react';
import { MealLogEntry, DailyTargets } from '@/types/nutrition';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Award, CalendarDays } from 'lucide-react';
import { toLocalDateKey } from '@/lib/localDate';

interface TrendsViewProps {
  logs: MealLogEntry[];
  targets: DailyTargets;
  daysElapsed?: number;
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
  restingCalories,
  workoutCaloriesByDate = {},
}) => {
  // Aggregate logs by date
  const dateMap: {
    [date: string]: {
      date: string;
      calories: number;
      protein: number;
      burnt: number | null;
      resting: number | null;
      workout: number | null;
      deficit: number | null;
      displayDate: string;
    };
  } = {};

  // Charts always span 7 days; averages cover only the days elapsed on the plan.
  const CHART_DAYS = 7;
  const daysToShow =
    daysElapsed === undefined ? CHART_DAYS : Math.min(CHART_DAYS, Math.max(1, Math.floor(daysElapsed)));

  const today = new Date();
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateKey(d);
    const displayDate = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
    dateMap[dateStr] = {
      date: dateStr,
      calories: 0,
      protein: 0,
      burnt: 0,
      resting: 0,
      workout: 0,
      deficit: 0,
      displayDate,
    };
  }

  logs.forEach((log) => {
    const dateStr = toLocalDateKey(log.timestamp);
    const day = dateMap[dateStr];
    if (day) {
      day.calories += log.calories;
      day.protein += log.protein;
    }
  });

  const chartData = Object.values(dateMap)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Days before the plan started have no burn or deficit to report.
  const firstPlanDayIndex = chartData.length - daysToShow;
  if (restingCalories !== undefined) {
    chartData.forEach((day, idx) => {
      if (idx < firstPlanDayIndex) {
        day.burnt = null;
        day.resting = null;
        day.workout = null;
        day.deficit = null;
        return;
      }
      // Today's resting burn accrues in proportion to the time elapsed so far.
      const isToday = idx === chartData.length - 1;
      const dayFraction = isToday
        ? (today.getHours() * 3600 + today.getMinutes() * 60 + today.getSeconds()) / 86400
        : 1;
      day.resting = Math.round(restingCalories * dayFraction);
      day.workout = workoutCaloriesByDate[day.date] || 0;
      day.burnt = day.resting + day.workout;
      day.deficit = day.burnt - day.calories;
    });
  }

  const averagedDays = chartData.slice(firstPlanDayIndex);

  const avgCalories =
    averagedDays.length > 0
      ? Math.round(averagedDays.reduce((s, d) => s + d.calories, 0) / averagedDays.length)
      : 0;

  const avgProtein =
    averagedDays.length > 0
      ? Math.round((averagedDays.reduce((s, d) => s + d.protein, 0) / averagedDays.length) * 10) / 10
      : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" /> Nutrition Analytics
        </h2>
        <p className="text-xs text-slate-400">Daily intake vs your target goals</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
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

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-orange-400" /> Calories Consumed vs Burnt
          </h3>
          <span className="text-[10px] text-slate-400">Target: {targets.calories} kcal</span>
        </div>

        <p className="text-[10px] text-slate-400">
          Consumed (blue) next to burnt: resting (orange) + workout (red).
          {restingCalories === undefined && (
            <span className="text-amber-400"> Plan burn data is unavailable.</span>
          )}
        </p>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={CHART_MARGIN} {...BAR_CHART_PROPS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={<DayTick />} interval={0} height={40} tickLine={false} axisLine={{ stroke: '#334155' }} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                formatter={(value, name) => [`${value} kcal`, name]}
                {...TOOLTIP_PROPS}
              />
              <ReferenceLine y={targets.calories} stroke="#f59e0b" strokeDasharray="3 3" />
              <Bar dataKey="calories" name="Consumed" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="resting" name="Resting" stackId="burnt" fill="#f97316" />
              <Bar
                dataKey="workout"
                name="Workout"
                stackId="burnt"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Daily Calorie Deficit Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
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
              Resting + workout calories burned − calories eaten.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-semibold">
              <span className="flex items-center gap-1.5 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Calorie deficit
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Surplus
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={CHART_MARGIN} {...BAR_CHART_PROPS}>
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
                            {isDeficit ? 'Calorie deficit' : 'Surplus'}: {value} kcal
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
                        fill={day.deficit !== null && day.deficit > 0 ? '#ef4444' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Protein Intake Chart Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-emerald-400" /> Daily Protein Intake
          </h3>
          <span className="text-[10px] text-slate-400">Target: {targets.protein}g</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={CHART_MARGIN} {...BAR_CHART_PROPS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={<DayTick />} interval={0} height={40} tickLine={false} axisLine={{ stroke: '#334155' }} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                {...TOOLTIP_PROPS}
              />
              <ReferenceLine y={targets.protein} stroke="#10b981" strokeDasharray="3 3" />
              <Bar dataKey="protein" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
