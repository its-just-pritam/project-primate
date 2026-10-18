import { NextRequest, NextResponse } from 'next/server';
import { registerSheetUser } from '@/lib/sheets';
import { createSessionToken, SESSION_COOKIE } from '@/lib/authSession';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      return NextResponse.json({ error: 'Sign-up is not configured. Check server settings.' }, { status: 503 });
    }
    const body = await request.json();
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60 || !EMAIL_PATTERN.test(email) || email.length > 254 || password.length < 12 || password.length > 256) {
      return NextResponse.json({ error: 'Enter your first name, last name, a valid email, and a password with at least 12 characters.' }, { status: 400 });
    }
    const user = await registerSheetUser(firstName, lastName, email, password);
    const { token, maxAge } = createSessionToken(user);
    const response = NextResponse.json({ success: true, user: { name: user.name, username: user.username } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account';
    const duplicate = message.includes('already exists');
    if (!duplicate) console.error('Sign-up failed:', error);
    return NextResponse.json({ error: duplicate ? 'An account with those details already exists.' : 'Unable to create account. Check server settings and try again.' }, { status: duplicate ? 409 : 503 });
  }
}
