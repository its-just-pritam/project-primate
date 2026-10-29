'use client';

import { useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { Activity } from 'lucide-react';
import { GarminLogo } from '@/components/GarminLogo';
import { BatteryChargingIcon } from '@phosphor-icons/react/dist/csr/BatteryCharging';
import { FireIcon } from '@phosphor-icons/react/dist/csr/Fire';
import { FootprintsIcon } from '@phosphor-icons/react/dist/csr/Footprints';
import { GaugeIcon } from '@phosphor-icons/react/dist/csr/Gauge';
import { HeartbeatIcon } from '@phosphor-icons/react/dist/csr/Heartbeat';
import { LightningIcon } from '@phosphor-icons/react/dist/csr/Lightning';
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { PulseIcon } from '@phosphor-icons/react/dist/csr/Pulse';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cacheGarminChartData, fetchGarminData, getCachedGarminChartData, getGarminTokenCacheScope, responseBody } from '@/lib/garminClient';

function previousDate(date: string) {
  const previous = new Date(`${date}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}
type GarminRecord = Record<string, unknown>;
type GarminChartMetric = 'steps' | 'calories' | 'heartRate' | 'bodyBattery' | 'distance' | 'intensity' | 'stress' | 'oxygen' | 'sleep';
const garminChartOrder: GarminChartMetric[] = ['steps', 'calories', 'heartRate', 'bodyBattery', 'distance', 'intensity', 'stress', 'oxygen', 'sleep'];

function asRecord(value: unknown): GarminRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as GarminRecord : {};
}

function metric(record: GarminRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function formatNumber(value: number | undefined, digits = 0) {
  return value === undefined ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function SummaryCard({ icon: Icon, label, value, unit, tint = 'sky', active = false, onClick }: {
  icon: ElementType;
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tint?: 'sky' | 'orange' | 'yellow' | 'red' | 'rose' | 'violet' | 'cyan' | 'emerald';
  active?: boolean;
  onClick: () => void;
}) {
  const colors = {
    sky: { color: '#7dd3fc', glow: 'rgba(56,189,248,.58)' },
    orange: { color: '#f97316', glow: 'rgba(249,115,22,.62)' },
    yellow: { color: '#facc15', glow: 'rgba(250,204,21,.58)' },
    red: { color: '#ef4444', glow: 'rgba(239,68,68,.62)' },
    rose: { color: '#fda4af', glow: 'rgba(251,113,133,.58)' },
    violet: { color: '#c4b5fd', glow: 'rgba(167,139,250,.58)' },
    cyan: { color: '#67e8f9', glow: 'rgba(34,211,238,.58)' },
    emerald: { color: '#b0d67a', glow: 'rgba(147,195,90,.58)' },
  };
  const iconColor = colors[tint];
  return (
    <button type="button" aria-expanded={active} onClick={onClick} className="flex min-h-[64px] min-w-0 items-center gap-2.5 px-2.5 py-3 text-left transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
      <span key={`${label}-${active}`} className={`flex h-8 w-8 shrink-0 items-center justify-center ${active ? 'metric-selection-enter' : ''}`}><Icon aria-hidden="true" size={23} weight="fill" color={iconColor.color} style={{ filter: `drop-shadow(0 0 6px ${iconColor.glow})` }} /></span>
      <div className="min-w-0">
        <span className="block truncate text-[10px] font-medium text-slate-400" style={active ? { color: iconColor.color } : undefined}>{label}</span>
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="min-w-0 truncate whitespace-nowrap text-sm font-black text-white" style={active ? { color: iconColor.color } : undefined}>{value}</span>
          {unit && <span className="shrink-0 text-[10px] text-slate-400">{unit}</span>}
        </div>
      </div>
    </button>
  );
}

const chartMetricLabels: Record<Exclude<GarminChartMetric, 'sleep'>, { label: string; unit: string; color: string }> = {
  steps: { label: 'Steps', unit: 'steps', color: '#93c35a' },
  calories: { label: 'Calories burned', unit: 'kcal', color: '#f97316' },
  heartRate: { label: 'Heart rate', unit: 'bpm', color: '#ef4444' },
  bodyBattery: { label: 'Body Battery', unit: '/ 100', color: '#a78bfa' },
  distance: { label: 'Distance', unit: 'km', color: '#22d3ee' },
  intensity: { label: 'Intensity minutes', unit: 'min', color: '#93c35a' },
  stress: { label: 'Stress', unit: '/ 100', color: '#facc15' },
  oxygen: { label: 'Blood oxygen', unit: '%', color: '#fb7185' },
};

function extractDailySummaryRows(data: unknown) {
  if (Array.isArray(data)) return data.map(asRecord);
  const envelope = asRecord(data);
  for (const key of ['data', 'dailySummaries', 'summaries']) {
    if (Array.isArray(envelope[key])) return (envelope[key] as unknown[]).map(asRecord);
  }
  return Object.keys(envelope).length ? [envelope] : [];
}

function dailyMetricValues(record: GarminRecord, kind: Exclude<GarminChartMetric, 'sleep'>) {
  const movement = asRecord(record.movement);
  const steps = asRecord(movement.steps ?? record.steps);
  const calories = asRecord(record.calories);
  const heartRate = asRecord(record.heartRate);
  const bodyBattery = asRecord(record.bodyBattery);
  const stress = asRecord(record.stress);
  const intensity = asRecord(record.intensityMinutes);
  const pulseOx = asRecord(record.pulseOx);
  switch (kind) {
    case 'steps': return { value: metric(steps, 'value', 'totalSteps') ?? metric(record, 'totalSteps') };
    case 'calories': {
      const active = metric(calories, 'burnedActive', 'activeKilocalories', 'activeCalories') ?? metric(record, 'activeKilocalories');
      const resting = metric(calories, 'burnedResting', 'restingKilocalories', 'restingCalories') ?? metric(record, 'bmrKilocalories');
      return { value: metric(calories, 'burnedTotal', 'totalKilocalories', 'totalCalories') ?? metric(record, 'totalKilocalories') ?? (active !== undefined || resting !== undefined ? (active ?? 0) + (resting ?? 0) : undefined) };
    }
    case 'heartRate': return { value: metric(heartRate, 'restingValue', 'restingHeartRate') ?? metric(record, 'restingHeartRate') };
    case 'bodyBattery': return { value: metric(bodyBattery, 'latestValue', 'endOfDayValue', 'bodyBatteryMostRecentValue') ?? metric(record, 'bodyBatteryMostRecentValue') };
    case 'distance': {
      const meters = metric(steps, 'distanceInMeters', 'totalDistance') ?? metric(record, 'wellnessDistanceMeters');
      return { value: meters === undefined ? undefined : meters / 1000 };
    }
    case 'intensity': return {
      value: metric(intensity, 'moderate', 'moderateIntensityMinutes') ?? metric(record, 'moderateIntensityMinutes'),
      secondary: metric(intensity, 'vigorous', 'vigorousIntensityMinutes') ?? metric(record, 'vigorousIntensityMinutes'),
    };
    case 'stress': return { value: metric(stress, 'avgLevel', 'averageStressLevel') ?? metric(record, 'averageStressLevel') };
    case 'oxygen': return { value: metric(pulseOx, 'avgValue', 'averageSpo2') ?? metric(record, 'averageSpo2') };
    default: return { value: undefined };
  }
}

function MetricWeekChart({ metric: kind, date, data, loading, error }: { metric: Exclude<GarminChartMetric, 'sleep'>; date: string; data: unknown; loading: boolean; error: string }) {
  const end = new Date(`${date}T00:00:00.000Z`);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - (6 - index));
    return day.toISOString().slice(0, 10);
  });
  const rows = extractDailySummaryRows(data);
  const byDate = new Map(rows.map((record) => [String(record.calendarDate ?? record.date ?? record.summaryDate ?? ''), record]));
  const values = dates.map((dayDate) => ({ date: dayDate, ...dailyMetricValues(byDate.get(dayDate) ?? {}, kind) }));
  const hasValues = values.some((day) => day.value !== undefined || day.secondary !== undefined);
  const meta = chartMetricLabels[kind];
  return (
    <section className="relative z-10 rounded-xl border border-white/[0.07] bg-slate-950/35 p-3" aria-live="polite">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-200">{meta.label} · 7 days</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">{dates[0]} – {dates[6]}</p>
        </div>
        <span className="text-[10px] text-slate-400">{meta.unit}</span>
      </div>
      {loading ? <p className="py-5 text-center text-xs text-slate-400">Loading your 7-day data…</p>
        : error ? <p role="alert" className="py-4 text-center text-xs text-rose-200">{error}</p>
          : hasValues ? (
            <div className="h-48 w-full" role="region" aria-label={`Seven day ${meta.label.toLowerCase()} chart`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={values} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%" barGap={6} maxBarSize={34}>
                  <defs>
                    <linearGradient id={`garmin-${kind}-gradient`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={meta.color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={meta.color} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" tick={<SleepDayTick />} interval={0} height={40} tickLine={false} axisLine={{ stroke: '#334155' }} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    formatter={(value, name) => [`${formatNumber(Number(value), kind === 'distance' ? 2 : 0)} ${meta.unit}`, name]}
                    labelFormatter={(iso) => {
                      const [year, month, day] = String(iso).split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                    }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  />
                  {kind === 'intensity' ? <>
                    <Bar dataKey="value" name="Moderate" stackId="intensity" fill="#93c35a" />
                    <Bar dataKey="secondary" name="Vigorous" stackId="intensity" fill="#5a8c36" radius={[6, 6, 0, 0]} />
                  </> : <Bar dataKey="value" name={meta.label} fill={`url(#garmin-${kind}-gradient)`} radius={[6, 6, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-4 text-center text-xs text-slate-400">No {meta.label.toLowerCase()} data returned for these seven days.</p>}
    </section>
  );
}

type SleepDay = { date: string; seconds: number; deep?: number; light?: number; rem?: number; awake?: number };

function collectSleepDays(value: unknown): SleepDay[] {
  const found: SleepDay[] = [];
  const durationKeys = ['sleepTimeSeconds', 'sleepingSeconds', 'sleepDurationSeconds', 'sleepDurationInSeconds', 'totalSleepSeconds'];
  const stageKeys = {
    deep: ['deepSleepSeconds'],
    light: ['lightSleepSeconds'],
    rem: ['remSleepSeconds'],
    awake: ['awakeSleepSeconds'],
  };
  const dateKeys = ['calendarDate', 'date', 'summaryDate', 'sleepDate'];
  const visit = (current: unknown, inheritedDate?: string) => {
    if (Array.isArray(current)) {
      current.forEach((item) => visit(item, inheritedDate));
      return;
    }
    if (!current || typeof current !== 'object') return;
    const record = current as GarminRecord;
    const ownDate = dateKeys.map((key) => record[key]).find((value): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value));
    const date = (ownDate ?? inheritedDate)?.slice(0, 10);
    const deep = metric(record, ...stageKeys.deep);
    const light = metric(record, ...stageKeys.light);
    const rem = metric(record, ...stageKeys.rem);
    const awake = metric(record, ...stageKeys.awake);
    const stageTotal = [deep, light, rem].reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const seconds = metric(record, ...durationKeys) ?? (stageTotal > 0 ? stageTotal : undefined);
    if (date && (seconds !== undefined || awake !== undefined)) found.push({ date, seconds: seconds ?? stageTotal + (awake ?? 0), deep, light, rem, awake });
    Object.values(record).forEach((child) => {
      if (child && typeof child === 'object') visit(child, date);
    });
  };
  visit(value);
  return Array.from(new Map(found.map((day) => [day.date, day])).values());
}

function SleepDayTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const [year, month, day] = String(payload?.value ?? '').split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text textAnchor="middle" y={14} fill="#cbd5e1" fontSize={10} fontWeight={600}>
        {date.toLocaleDateString([], { weekday: 'short' })}
      </text>
      <text textAnchor="middle" y={27} fill="#64748b" fontSize={9}>
        {date.toLocaleDateString([], { day: 'numeric', month: 'short' })}
      </text>
    </g>
  );
}

function SleepWeekDetails({ date, data, loading, error }: { date: string; data: unknown; loading: boolean; error: string }) {
  const end = new Date(`${date}T00:00:00.000Z`);
  const week = Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(end);
    dayDate.setUTCDate(dayDate.getUTCDate() - (6 - index));
    const key = dayDate.toISOString().slice(0, 10);
    return { date: key };
  });
  const sleepDays = collectSleepDays(data);
  const byDate = new Map(sleepDays.map((day) => [day.date, day.seconds]));
  const sleepByDate = new Map(sleepDays.map((day) => [day.date, day]));
  const values = week.map((day) => {
    const record = sleepByDate.get(day.date);
    const seconds = byDate.get(day.date) ?? 0;
    return {
      ...day,
      seconds,
      hours: seconds / 3600,
      deepHours: (record?.deep ?? 0) / 3600,
      lightHours: (record?.light ?? 0) / 3600,
      remHours: (record?.rem ?? 0) / 3600,
      awakeHours: (record?.awake ?? 0) / 3600,
    };
  });
  const recorded = values.filter((day) => day.seconds > 0);
  const hasStageData = sleepDays.some((day) => day.deep !== undefined || day.light !== undefined || day.rem !== undefined || day.awake !== undefined);
  const average = recorded.length ? recorded.reduce((sum, day) => sum + day.seconds, 0) / recorded.length : undefined;

  return (
    <section className="relative z-10 rounded-xl border border-violet-300/10 bg-slate-950/35 p-3" aria-live="polite">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-200">Sleep · last 7 days</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">{week[0].date} – {week[6].date}{hasStageData ? ' · Sleep stages' : ''}</p>
        </div>
        {average !== undefined && <p className="text-right text-[10px] text-slate-400">Average <span className="font-bold text-violet-200">{formatDuration(average)}</span></p>}
      </div>
      {loading ? (
        <p className="py-5 text-center text-xs text-slate-400">Loading your sleep week…</p>
      ) : error ? (
        <p role="alert" className="py-4 text-center text-xs text-rose-200">{error}</p>
      ) : recorded.length ? (
        <div>
          {hasStageData && <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1" aria-label="Sleep stage legend">
            {[['Deep', '#4c1d95'], ['Light', '#8b5cf6'], ['REM', '#c026d3'], ['Awake', '#f0abfc']].map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1 text-[9px] text-slate-400"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />{label}</span>
            ))}
          </div>}
          <div className="h-48 w-full" role="region" aria-label="Seven day sleep duration chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={values} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%" barGap={6} maxBarSize={34}>
              <defs>
                <linearGradient id="garmin-sleep-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={<SleepDayTick />} interval={0} height={40} tickLine={false} axisLine={{ stroke: '#334155' }} />
              <YAxis tickFormatter={(hours: number) => `${hours}h`} domain={[0, 'auto']} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                formatter={(hours, name) => [formatDuration(Number(hours) * 3600), name]}
                labelFormatter={(iso) => {
                  const [year, month, day] = String(iso).split('-').map(Number);
                  return new Date(year, month - 1, day).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                }}
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
              />
              {hasStageData ? (
                <>
                  <Bar dataKey="deepHours" name="Deep" stackId="sleep" fill="#4c1d95" />
                  <Bar dataKey="lightHours" name="Light" stackId="sleep" fill="#8b5cf6" />
                  <Bar dataKey="remHours" name="REM" stackId="sleep" fill="#c026d3" />
                  <Bar dataKey="awakeHours" name="Awake" stackId="sleep" fill="#f0abfc" radius={[6, 6, 0, 0]} />
                </>
              ) : <Bar dataKey="hours" name="Sleep" fill="url(#garmin-sleep-gradient)" radius={[6, 6, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-slate-400">No sleep records were returned for these seven days.</p>
      )}
    </section>
  );
}

export function SummaryDashboard({ date, data, deviceName }: { date: string; data: unknown; deviceName: string | null }) {
  const [activeChart, setActiveChart] = useState<GarminChartMetric | null>(null);
  const chartTouchStart = useRef<{ x: number; y: number } | null>(null);
  const [initialSleepData] = useState(() => {
    const scope = getGarminTokenCacheScope();
    return scope ? getCachedGarminChartData(scope, 'sleep', previousDate(date)) : null;
  });
  const [initialWeekData] = useState(() => {
    const scope = getGarminTokenCacheScope();
    return scope ? getCachedGarminChartData(scope, 'weekly', date) : null;
  });
  const [sleepLoading, setSleepLoading] = useState(false);
  const [sleepData, setSleepData] = useState<unknown>(initialSleepData);
  const [sleepError, setSleepError] = useState('');
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekData, setWeekData] = useState<unknown>(initialWeekData);
  const [weekError, setWeekError] = useState('');
  const [weekLoaded, setWeekLoaded] = useState(initialWeekData !== null);
  const sleepDate = previousDate(date);
  const envelope = asRecord(data);
  const days = Array.isArray(data) ? data : Array.isArray(envelope.data) ? envelope.data : [];
  const summary = asRecord(days[0] ?? envelope.summary ?? data);
  const movement = asRecord(summary.movement);
  const steps = asRecord(movement.steps);
  const calories = asRecord(summary.calories);
  const heartRate = asRecord(summary.heartRate);
  const bodyBattery = asRecord(summary.bodyBattery);
  const stress = asRecord(summary.stress);
  const intensity = asRecord(summary.intensityMinutes);
  const pulseOx = asRecord(summary.pulseOx);

  const stepCount = metric(steps, 'value', 'totalSteps') ?? metric(summary, 'totalSteps');
  const stepGoal = metric(steps, 'goal', 'dailyStepGoal') ?? metric(summary, 'dailyStepGoal');
  const stepProgress = stepCount !== undefined && stepGoal ? Math.min(100, Math.round(stepCount / stepGoal * 100)) : undefined;
  const activeCalories = metric(calories, 'burnedActive', 'activeKilocalories', 'activeCalories') ?? metric(summary, 'activeKilocalories');
  const restingCalories = metric(calories, 'burnedResting', 'restingKilocalories', 'restingCalories') ?? metric(summary, 'bmrKilocalories');
  const totalCalories = metric(calories, 'burnedTotal', 'totalKilocalories', 'totalCalories') ?? metric(summary, 'totalKilocalories');
  const distanceMeters = metric(steps, 'distanceInMeters', 'totalDistance') ?? metric(summary, 'wellnessDistanceMeters');
  const movementFloors = asRecord(movement.floorsAscended);
  const floors = metric(movementFloors, 'value', 'floorsAscended') ?? metric(summary, 'floorsAscended');
  const restingHeartRate = metric(heartRate, 'restingValue', 'restingHeartRate') ?? metric(summary, 'restingHeartRate');
  const minHeartRate = metric(heartRate, 'minValue', 'minimumHeartRate') ?? metric(summary, 'minHeartRate');
  const maxHeartRate = metric(heartRate, 'maxValue', 'maximumHeartRate') ?? metric(summary, 'maxHeartRate');
  const battery = metric(bodyBattery, 'latestValue', 'endOfDayValue', 'bodyBatteryMostRecentValue') ?? metric(summary, 'bodyBatteryMostRecentValue');
  const moderateMinutes = metric(intensity, 'moderate', 'moderateIntensityMinutes') ?? metric(summary, 'moderateIntensityMinutes');
  const vigorousMinutes = metric(intensity, 'vigorous', 'vigorousIntensityMinutes') ?? metric(summary, 'vigorousIntensityMinutes');
  const intensityGoal = metric(intensity, 'goal', 'intensityMinutesGoal');
  const stressAverage = metric(stress, 'avgLevel', 'averageStressLevel') ?? metric(summary, 'averageStressLevel');
  const oxygenAverage = metric(pulseOx, 'avgValue', 'averageSpo2') ?? metric(summary, 'averageSpo2');
  useEffect(() => {
    let current = true;
    const scope = getGarminTokenCacheScope();
    const cached = scope ? getCachedGarminChartData(scope, 'sleep', sleepDate) : null;
    if (cached !== null) {
      setSleepData(cached);
      setSleepError('');
      setSleepLoading(false);
      return () => { current = false; };
    }
    setSleepLoading(true);
    setSleepError('');
    setSleepData(null);
    fetchGarminData('/api/garmin/sleep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ date: sleepDate }),
    })
      .then(responseBody)
      .then((body) => {
        if (current) {
          setSleepData(body.data);
          if (scope) cacheGarminChartData(scope, 'sleep', sleepDate, body.data);
        }
      })
      .catch((err: unknown) => {
        if (current) setSleepError(err instanceof Error ? err.message : 'Could not load your sleep week.');
      })
      .finally(() => {
        if (current) setSleepLoading(false);
      });
    return () => { current = false; };
  }, [sleepDate]);

  const chooseChart = (kind: GarminChartMetric) => {
    if (activeChart === kind) {
      setActiveChart(null);
      return;
    }
    setActiveChart(kind);
    if (kind === 'sleep' || weekLoaded || weekLoading) return;
    const scope = getGarminTokenCacheScope();
    const cached = scope ? getCachedGarminChartData(scope, 'weekly', date) : null;
    if (cached !== null) {
      setWeekData(cached);
      setWeekLoaded(true);
      setWeekError('');
      return;
    }
    setWeekLoading(true);
    setWeekError('');
    fetchGarminData('/api/garmin/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ date }),
    })
      .then(responseBody)
      .then((body) => {
        setWeekData(body.data);
        setWeekLoaded(true);
        if (scope) cacheGarminChartData(scope, 'weekly', date, body.data);
      })
      .catch((err: unknown) => setWeekError(err instanceof Error ? err.message : 'Could not load your 7-day data.'))
      .finally(() => setWeekLoading(false));
  };

  const handleChartSwipe = (endX: number, endY: number) => {
    const start = chartTouchStart.current;
    chartTouchStart.current = null;
    if (!start || !activeChart) return;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    const currentIndex = garminChartOrder.indexOf(activeChart);
    const direction = deltaX < 0 ? 1 : -1;
    const nextIndex = (currentIndex + direction + garminChartOrder.length) % garminChartOrder.length;
    chooseChart(garminChartOrder[nextIndex]);
  };
  const sleepSeconds = collectSleepDays(sleepData).find((day) => day.date === sleepDate)?.seconds;
  const previousDayLabel = new Date(`${sleepDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const hasData = Object.keys(summary).length > 0;
  const readableDate = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (!hasData) {
    return (
      <section className="app-card-surface rounded-2xl px-4 py-6 text-center">
        <Activity className="mx-auto h-8 w-8 text-slate-500" />
        <h2 className="mt-3 text-base font-bold text-white">No daily summary for this date</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">Sync your Garmin device with Garmin Connect, then try another date.</p>
      </section>
    );
  }

  return (
    <section className="app-card-surface relative space-y-3.5 overflow-hidden rounded-2xl px-4 pb-4 pt-2">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">Garmin Connect</span>
              <span className="truncate text-xs font-medium text-slate-400">· {deviceName || 'Garmin device'}</span>
            </div>
            <h2 className="mt-1 truncate text-sm font-bold text-white">{readableDate}</h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <GarminLogo className="h-4 w-auto text-slate-200" />
          </div>
        </div>

        <button type="button" aria-expanded={activeChart === 'steps'} onClick={() => chooseChart('steps')} className="mt-3 w-full rounded-lg p-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400" style={activeChart === 'steps' ? { color: '#93c35a' } : undefined}>Steps</p>
                <p key={`steps-${activeChart === 'steps'}`} className={`mt-1 text-3xl font-extrabold leading-none text-white ${activeChart === 'steps' ? 'metric-selection-enter' : ''}`} style={activeChart === 'steps' ? { color: '#93c35a' } : undefined}>{formatNumber(stepCount)}</p>
              </div>
              <p className="text-right text-[11px] leading-tight text-slate-400">
                {stepProgress !== undefined ? <><span className="text-lg font-extrabold text-emerald-400">{stepProgress}%</span><br /></> : null}
                {stepGoal !== undefined ? `${formatNumber(stepGoal)} step goal` : stepCount !== undefined ? 'Daily total' : 'Tap for 7-day chart'}
              </p>
            </div>
            {stepProgress !== undefined && <div className="progress-track-inset relative mt-3 h-3.5 w-full overflow-hidden rounded-full p-[2px]"><div className="progress-fill-raised h-full max-w-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-700" style={{ width: `${stepProgress}%` }} /></div>}
        </button>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-x-1.5">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-slate-400/35 to-transparent" />
        <div className="col-span-2 grid grid-cols-2 gap-x-1.5">
          <SummaryCard icon={FireIcon} label="Calories" value={formatNumber(totalCalories ?? (activeCalories !== undefined || restingCalories !== undefined ? (activeCalories ?? 0) + (restingCalories ?? 0) : undefined))} unit="kcal" detail={activeCalories !== undefined ? `${formatNumber(activeCalories)} active${restingCalories !== undefined ? ` · ${formatNumber(restingCalories)} rest` : ''}` : totalCalories !== undefined ? 'Total burned' : 'No data recorded'} tint="orange" active={activeChart === 'calories'} onClick={() => chooseChart('calories')} />
          <SummaryCard icon={HeartbeatIcon} label="Heart rate" value={formatNumber(restingHeartRate ?? minHeartRate ?? maxHeartRate)} unit="bpm" detail={restingHeartRate !== undefined ? `Resting${minHeartRate !== undefined || maxHeartRate !== undefined ? ` · ${formatNumber(minHeartRate)}–${formatNumber(maxHeartRate)} range` : ''}` : restingHeartRate !== undefined || minHeartRate !== undefined || maxHeartRate !== undefined ? 'Daily range' : 'No data recorded'} tint="red" active={activeChart === 'heartRate'} onClick={() => chooseChart('heartRate')} />
        </div>
        <div aria-hidden="true" className="col-span-2 h-px w-full bg-gradient-to-r from-transparent via-slate-400/35 to-transparent" />
        <div className="col-span-2 grid grid-cols-2 gap-x-1.5">
          <SummaryCard icon={BatteryChargingIcon} label="Body Battery" value={formatNumber(battery)} unit="/ 100" detail={metric(bodyBattery, 'chargedValue') !== undefined ? `+${formatNumber(metric(bodyBattery, 'chargedValue'))} today` : battery !== undefined ? 'Latest level' : 'No data recorded'} tint="violet" active={activeChart === 'bodyBattery'} onClick={() => chooseChart('bodyBattery')} />
          <SummaryCard icon={FootprintsIcon} label="Distance" value={formatNumber(distanceMeters !== undefined ? distanceMeters / 1000 : undefined, 2)} unit={distanceMeters !== undefined ? 'km' : ''} detail={floors !== undefined ? `${formatNumber(floors)} floors climbed` : distanceMeters !== undefined ? 'Daily total' : 'No data recorded'} tint="cyan" active={activeChart === 'distance'} onClick={() => chooseChart('distance')} />
        </div>
        <div aria-hidden="true" className="col-span-2 h-px w-full bg-gradient-to-r from-transparent via-slate-400/35 to-transparent" />
        <div className="col-span-2 grid grid-cols-2 gap-x-1.5">
          <SummaryCard icon={LightningIcon} label="Intensity" value={moderateMinutes !== undefined || vigorousMinutes !== undefined ? formatNumber((moderateMinutes ?? 0) + (vigorousMinutes ?? 0)) : '—'} unit="min" detail={moderateMinutes !== undefined || vigorousMinutes !== undefined ? `${formatNumber(moderateMinutes)} moderate · ${formatNumber(vigorousMinutes)} vigorous${intensityGoal !== undefined ? ` · ${formatNumber(intensityGoal)} goal` : ''}` : 'No data recorded'} tint="emerald" active={activeChart === 'intensity'} onClick={() => chooseChart('intensity')} />
          <SummaryCard icon={GaugeIcon} label="Stress" value={formatNumber(stressAverage)} unit="/ 100" detail={stressAverage !== undefined ? (stress.qualifier ? String(stress.qualifier).replaceAll('_', ' ') : 'Daily average') : 'No data recorded'} tint="yellow" active={activeChart === 'stress'} onClick={() => chooseChart('stress')} />
        </div>
        <div aria-hidden="true" className="col-span-2 h-px w-full bg-gradient-to-r from-transparent via-slate-400/35 to-transparent" />
        <div className="col-span-2 grid grid-cols-2 gap-x-1.5">
          <SummaryCard icon={PulseIcon} label="Blood oxygen" value={formatNumber(oxygenAverage)} unit="%" detail={oxygenAverage !== undefined ? 'Average SpO₂' : 'No data recorded'} tint="rose" active={activeChart === 'oxygen'} onClick={() => chooseChart('oxygen')} />
          <button type="button" aria-expanded={activeChart === 'sleep'} onClick={() => chooseChart('sleep')} className="flex min-h-[64px] min-w-0 items-center gap-2.5 px-2.5 py-3 text-left transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60">
            <span key={`sleep-${activeChart === 'sleep'}`} className={`flex h-8 w-8 shrink-0 items-center justify-center ${activeChart === 'sleep' ? 'metric-selection-enter' : ''}`}><MoonIcon aria-hidden="true" size={23} weight="fill" color="#c4b5fd" style={{ filter: 'drop-shadow(0 0 6px rgba(167,139,250,.58))' }} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-medium text-slate-400" style={activeChart === 'sleep' ? { color: '#c4b5fd' } : undefined}>Sleep · {previousDayLabel}</span>
              <span className="flex items-baseline gap-1">
                <span className="block truncate whitespace-nowrap text-sm font-black text-white" style={activeChart === 'sleep' ? { color: '#c4b5fd' } : undefined}>{sleepSeconds !== undefined ? formatDuration(sleepSeconds) : '—'}</span>
              </span>
            </span>
          </button>
        </div>
      </div>
      {activeChart && <div className="touch-pan-y" onTouchStart={(event) => { const touch = event.touches[0]; chartTouchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={(event) => { const touch = event.changedTouches[0]; handleChartSwipe(touch.clientX, touch.clientY); }}>
        {activeChart === 'sleep' ? <SleepWeekDetails date={sleepDate} data={sleepData} loading={sleepLoading} error={sleepError} /> : <MetricWeekChart metric={activeChart} date={date} data={weekData} loading={weekLoading} error={weekError} />}
      </div>}
      <p className="relative z-10 px-1 text-[10px] leading-4 text-slate-500">Metrics appear when recorded by your device. Sync Garmin Connect to refresh this day.</p>
    </section>
  );
}


