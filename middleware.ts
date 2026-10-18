import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'primate_session';

async function validSession(token: string | undefined) {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const bytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(encoded));
    if (!valid) return false;
    const payload = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
    return Boolean(payload.name && payload.username && payload.exp > Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(path)) return NextResponse.next();
  if (path === '/login' || path === '/signup' || path === '/landing' || path.startsWith('/api/auth/')) return NextResponse.next();
  if (await validSession(request.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (path === '/') return NextResponse.rewrite(new URL('/landing', request.url));
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
