import { NextRequest, NextResponse } from 'next/server';
import { authenticateSheetUser } from '@/lib/sheets';
import { createSessionToken, SESSION_COOKIE } from '@/lib/authSession';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    const user = await authenticateSheetUser(username, password);
    if (!user) return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
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
    console.error('Authentication failed:', error);
    return NextResponse.json({ error: 'Sign-in is not configured. Check server settings.' }, { status: 503 });
  }
}
