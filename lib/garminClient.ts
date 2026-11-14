'use client';

let currentCacheScope: string | null = null;
type DailySummaryCacheEntry = { date: string; data: unknown; deviceName: string | null };
const dailySummaryCache = new Map<string, DailySummaryCacheEntry>();
type GarminChartCacheKind = 'weekly' | 'sleep';
const chartDataCache = new Map<string, unknown>();

const dailySummaryKey = (scope: string, date: string) => `${scope}:${date}`;
const chartCacheKey = (scope: string, kind: GarminChartCacheKind, date: string) => `${scope}:${kind}:${date}`;

export function getCachedGarminChartData(scope: string, kind: GarminChartCacheKind, date: string) {
  return chartDataCache.has(chartCacheKey(scope, kind, date)) ? chartDataCache.get(chartCacheKey(scope, kind, date)) : null;
}

export function cacheGarminChartData(scope: string, kind: GarminChartCacheKind, date: string, data: unknown) {
  chartDataCache.set(chartCacheKey(scope, kind, date), data);
}

export function getCachedGarminDailySummary(scope: string, date: string) {
  return dailySummaryCache.get(dailySummaryKey(scope, date)) ?? null;
}

export function cacheGarminDailySummary(scope: string, summary: DailySummaryCacheEntry) {
  dailySummaryCache.set(dailySummaryKey(scope, summary.date), summary);
}

export function clearGarminDailySummaryCache(scope?: string | null) {
  if (!scope) {
    dailySummaryCache.clear();
    chartDataCache.clear();
    return;
  }
  const prefix = `${scope}:`;
  dailySummaryCache.forEach((_value, key) => {
    if (key.startsWith(prefix)) dailySummaryCache.delete(key);
  });
  chartDataCache.forEach((_value, key) => {
    if (key.startsWith(prefix)) chartDataCache.delete(key);
  });
}

export function setGarminCacheScope(scope: string | null) {
  currentCacheScope = scope;
}

export function getGarminCacheScope() {
  return currentCacheScope;
}

export async function responseBody(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export async function fetchGarminData(url: string, init: RequestInit) {
  // Garmin credentials and tokens stay on the backend.
  return fetch(url, { ...init, cache: 'no-store' });
}
