import { NextResponse } from 'next/server';
import { fetchPlanAnalytics } from '@/lib/sheets';
import { getCurrentSession } from '@/lib/authSession';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const data = await fetchPlanAnalytics(session.username, session.name);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch plan analytics' },
      { status: 500 }
    );
  }
}
