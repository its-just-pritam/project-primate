import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/authSession';
import { isBackendEnabled } from '@/lib/config';

// With MIGRATE_TO_BACKEND on, the Kotlin backend (see primate-backend/) owns all data. It verifies the same session token, so
// routes forward the caller's cookie value as a bearer token.
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');

export async function callBackend(
  path: string,
  { method = 'GET', body, token }: { method?: string; body?: string; token?: string } = {}
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body || undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(60000),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

export const backendUnavailable = () =>
  NextResponse.json({ error: 'The Platito backend is unavailable.' }, { status: 503 });

/** Forwards an authenticated API request, with its JSON body, to the same path on the backend. */
export async function proxyToBackend(req: NextRequest, path: string) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const body = req.method === 'GET' ? undefined : await req.text();
    const result = await callBackend(path, { method: req.method, body, token });
    return NextResponse.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(`[backend] ${req.method} ${path} failed:`, error instanceof Error ? error.message : error);
    return backendUnavailable();
  }
}

type Handler = (req: NextRequest) => Response | Promise<Response>;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type SheetsRouteModule = Partial<Record<HttpMethod, Handler>>;

/** Forwards every request for this route to the same path on the backend. */
export const proxyRoute = (path: string): Handler => (req) => proxyToBackend(req, path);

/**
 * Chooses a route's implementation from MIGRATE_TO_BACKEND: the backend handler when it is on,
 * otherwise the method's handler from the Google Sheets module. The Sheets module is imported
 * lazily so backend mode never loads it (or googleapis).
 */
export function selectHandler(method: HttpMethod, backend: Handler, loadSheets: () => Promise<SheetsRouteModule>): Handler {
  return async (req) => {
    if (isBackendEnabled) return backend(req);
    const sheetsHandler = (await loadSheets())[method];
    return sheetsHandler ? sheetsHandler(req) : NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  };
}
