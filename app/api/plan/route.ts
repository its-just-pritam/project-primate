import { NextResponse } from 'next/server';
import { fetchPlanAnalytics } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchPlanAnalytics();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch plan analytics' },
      { status: 500 }
    );
  }
}
