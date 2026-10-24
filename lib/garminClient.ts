'use client';

const pendingTokenRequests = new Map<string, Promise<string>>();
let currentCacheScope: string | null = null;
type DailySummaryCacheEntry = { date: string; data: unknown; deviceName: string | null };
const dailySummaryCache = new Map<string, DailySummaryCacheEntry>();
type GarminChartCacheKind = 'weekly' | 'sleep';
const chartDataCache = new Map<string, unknown>();

const tokenCacheKey = (scope: string) => `garmin-connect-access-token-${scope}`;
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

export function setGarminTokenCacheScope(scope: string | null) {
  currentCacheScope = scope;
}

export function getGarminTokenCacheScope() {
  return currentCacheScope;
}

export function cacheGarminAccessToken(accessToken: string, expiresAt: number, scope: string) {
  sessionStorage.setItem(tokenCacheKey(scope), JSON.stringify({ accessToken, expiresAt }));
}

export function clearGarminAccessToken(scope: string | null) {
  if (scope) sessionStorage.removeItem(tokenCacheKey(scope));
}

async function getCachedGarminAccessToken() {
  const scope = currentCacheScope;
  if (!scope) throw new Error('Garmin connection status has not loaded yet.');
  const cacheKey = tokenCacheKey(scope);
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { accessToken?: unknown; expiresAt?: unknown };
      if (typeof parsed.accessToken === 'string' && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
        return parsed.accessToken;
      }
    } catch {
      sessionStorage.removeItem(cacheKey);
    }
  }

  const pending = pendingTokenRequests.get(scope);
  if (pending) return pending;
  const request = (async () => {
    const response = await fetch('/api/garmin/access-token', { method: 'POST', cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    if (typeof body.accessToken !== 'string' || typeof body.expiresAt !== 'number' || body.cacheScope !== scope) {
      throw new Error('Garmin did not return an access token.');
    }
    cacheGarminAccessToken(body.accessToken, body.expiresAt, scope);
    return body.accessToken;
  })();
  pendingTokenRequests.set(scope, request);
  try {
    return await request;
  } finally {
    pendingTokenRequests.delete(scope);
  }
}

export async function responseBody(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export async function fetchGarminData(url: string, init: RequestInit) {
  const accessToken = await getCachedGarminAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(url, { ...init, headers, cache: 'no-store' });
}
