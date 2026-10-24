import { createHash } from 'node:crypto';

const GARMIN_API = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';

export async function obtainGarminAccessToken(apiKey: string): Promise<string> {
  const response = await fetch(`${GARMIN_API}${TOKEN_PATH}`, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${apiKey}`, Accept: '*/*' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const upstreamError = (await response.text()).replaceAll(apiKey, '[redacted]').slice(0, 400);
    throw new Error(`Garmin token exchange failed (${response.status})${upstreamError ? `: ${upstreamError}` : ''}`);
  }
  const token = (await response.text()).trim();
  if (!token) throw new Error('Garmin returned an empty access token.');
  return token;
}

export function garminTokenExpiresAt(accessToken: string): number {
  try {
    const payload = accessToken.split('.')[1];
    if (payload) {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown };
      if (typeof claims.exp === 'number' && Number.isFinite(claims.exp)) return claims.exp * 1000;
    }
  } catch {
    // Use a short browser cache lifetime if Garmin changes the token format.
  }
  return Date.now() + 50 * 60 * 1000;
}

export function garminTokenCacheScope(username: string): string {
  return createHash('sha256').update(username.toLowerCase()).digest('hex').slice(0, 16);
}

export async function getGarminDailySummary(accessToken: string, date: string): Promise<unknown> {
  const params = new URLSearchParams({ startDate: date, endDate: date });
  const response = await fetch(`${GARMIN_API}/usersummary-service/v2/dailysummaries?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Garmin daily summary request failed (${response.status}).`);
  }
  return response.json();
}

export async function getGarminDeviceName(accessToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ start: '0', limit: '5' });
    const response = await fetch(`${GARMIN_API}/activitylist-service/activities/search/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const activities: unknown = await response.json();
    const activityIds = new Set<string>();
    const findActivities = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(findActivities);
        return;
      }
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      if (typeof record.activityId === 'number' || typeof record.activityId === 'string') {
        activityIds.add(String(record.activityId));
      }
      Object.values(record).forEach(findActivities);
    };
    const findDeviceName = (value: unknown): string | null => {
      if (Array.isArray(value)) {
        for (const item of value) {
          const name = findDeviceName(item);
          if (name) return name;
        }
        return null;
      }
      if (!value || typeof value !== 'object') return null;
      const record = value as Record<string, unknown>;
      if (typeof record.deviceName === 'string' && record.deviceName.trim()) return record.deviceName.trim();
      for (const child of Object.values(record)) {
        const name = findDeviceName(child);
        if (name) return name;
      }
      return null;
    };
    const listedName = findDeviceName(activities);
    if (listedName) return listedName;
    const details = await Promise.all(Array.from(activityIds).slice(0, 5).map(async (activityId) => {
      const detailResponse = await fetch(`${GARMIN_API}/activity-service/activity/${encodeURIComponent(activityId)}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      return detailResponse.ok ? detailResponse.json() as Promise<unknown> : null;
    }));
    return findDeviceName(details);
  } catch {
    return null;
  }
}

export async function getGarminDailySummaries(accessToken: string, startDate: string, endDate: string): Promise<unknown> {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`${GARMIN_API}/usersummary-service/v2/dailysummaries?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Garmin weekly summary request failed (${response.status}).`);
  return response.json();
}

export async function getGarminSleepSummaries(accessToken: string, startDate: string, endDate: string): Promise<unknown> {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`${GARMIN_API}/sleep-service/sleep/dailySleepSummariesByDate?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Garmin sleep summary request failed (${response.status}).`);
  return response.json();
}
