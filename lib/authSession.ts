import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'primate_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type AuthSession = { name: string; username: string; exp: number };

const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET must be set to a random value of at least 32 characters');
  return value;
};

export function createSessionToken(user: { name: string; username: string }) {
  const payload: AuthSession = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret()).update(encoded).digest('base64url');
  return { token: `${encoded}.${signature}`, maxAge: SESSION_SECONDS };
}

export function verifySessionToken(token?: string | null): AuthSession | null {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  try {
    const expected = createHmac('sha256', secret()).update(encoded).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return null;
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AuthSession;
    if (!session.name || !session.username || !Number.isFinite(session.exp) || session.exp <= Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export { SESSION_SECONDS };
