import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';

export async function GET() {
  const session = await getCurrentSession();
  return NextResponse.json({ user: session ? { name: session.name, username: session.username } : null });
}
