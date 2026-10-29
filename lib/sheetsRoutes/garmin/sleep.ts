import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';
import { getStoredGarminIntegration } from '@/lib/sheets';
import { getGarminSleepSummaries } from '@/lib/garmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { date } = await req.json();
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 });
    }

    const stored = await getStoredGarminIntegration(session.username);
    if (!stored.isLive) return NextResponse.json({ error: 'Google Sheets is not configured.' }, { status: 503 });
    if (stored.integration !== 'Garmin Connect' || !stored.apiKey) {
      return NextResponse.json({ error: 'Connect Garmin first.' }, { status: 409 });
    }

    const end = new Date(`${date}T00:00:00.000Z`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    const startDate = start.toISOString().slice(0, 10);
    const accessToken = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return NextResponse.json({ error: 'Garmin access token required.' }, { status: 401 });
    const data = await getGarminSleepSummaries(accessToken, startDate, date);
    return NextResponse.json({ success: true, startDate, endDate: date, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Garmin sleep request failed';
    console.error('[Garmin sleep] request failed:', message);
    const status = message.startsWith('Garmin ') ? 502 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
