import { NextRequest, NextResponse } from 'next/server';
import { backendUnavailable, callBackend } from '@/lib/backend';
import { createSessionToken, SESSION_COOKIE } from '@/lib/authSession';

// Backend-mode handlers that need more than a plain proxy: the backend checks credentials and
// this app issues the session cookie.

async function authenticate(request: NextRequest, path: string) {
  let result;
  try {
    result = await callBackend(path, { method: 'POST', body: await request.text() });
  } catch (error) {
    console.error(`[backend] ${path} failed:`, error);
    return backendUnavailable();
  }
  if (result.status !== 200) return NextResponse.json(result.body, { status: result.status });
  const user = { name: String(result.body.user.name), username: String(result.body.user.username) };
  const { token, maxAge } = createSessionToken(user);
  const response = NextResponse.json({ success: true, user });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return response;
}

export const login = (request: NextRequest) => authenticate(request, '/api/auth/login');

export async function signup(request: NextRequest) {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return NextResponse.json({ error: 'Sign-up is not configured. Check server settings.' }, { status: 503 });
  }
  return authenticate(request, '/api/auth/signup');
}

export async function status() {
  try {
    const { body } = await callBackend('/api/status');
    return NextResponse.json({ connected: Boolean(body.connected), database: body.database ?? null });
  } catch {
    return NextResponse.json({ connected: false, database: null });
  }
}

/** Garmin tokens stay inside the backend, so this Sheets-mode endpoint does not exist there. */
export const notAvailable = () => NextResponse.json({ error: 'Not available' }, { status: 404 });
