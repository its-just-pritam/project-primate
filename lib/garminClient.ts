'use client';

const pendingTokenRequests = new Map<string, Promise<string>>();
let currentCacheScope: string | null = null;

const tokenCacheKey = (scope: string) => `garmin-connect-access-token-${scope}`;

export function setGarminTokenCacheScope(scope: string | null) {
  currentCacheScope = scope;
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
