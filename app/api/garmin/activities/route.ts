import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';
import { getStoredGarminIntegration, reconcileGarminWorkoutsForDate } from '@/lib/sheets';
import { getGarminActivitiesForDate, obtainGarminAccessToken } from '@/lib/garmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { date, timeZone } = await req.json();
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 });
    }
    if (typeof timeZone !== 'string' || !timeZone) return NextResponse.json({ error: 'A time zone is required.' }, { status: 400 });
    try { new Intl.DateTimeFormat('en-US', { timeZone }); } catch { return NextResponse.json({ error: 'Choose a valid time zone.' }, { status: 400 }); }
    console.info(`[Garmin activities] Sync triggered for ${session.username} (${date}).`);
    const stored = await getStoredGarminIntegration(session.username);
    if (!stored.isLive) return NextResponse.json({ error: 'Google Sheets is not configured.' }, { status: 503 });
    if (stored.integration !== 'Garmin Connect' || !stored.apiKey) {
      return NextResponse.json({ error: 'Connect Garmin first.' }, { status: 409 });
    }

    const token = await obtainGarminAccessToken(stored.apiKey);
    const activities = await getGarminActivitiesForDate(token, date);
    const entries = [];
    for (const activity of activities) {
      const name = String(activity.activityName || activity.name || '').trim();
      const rawTimestamp = String(activity.startTimeGMT || activity.startTime || activity.startTimeLocal || '');
      const calories = Number(activity.calories ?? activity.caloriesBurned ?? activity.caloriesBurnt);
      const timestamp = new Date(rawTimestamp);
      if (!name || !Number.isFinite(calories) || calories < 0 || Number.isNaN(timestamp.getTime())) continue;
      entries.push({ name, caloriesBurnt: calories, timestamp: timestamp.toISOString(), user: session.name });
    }
    const sync = await reconcileGarminWorkoutsForDate(entries, session.username, date, timeZone);
    console.info(`[Garmin activities] Sync completed for ${session.username} (${date}); imported ${sync.imported}, removed ${sync.deleted} workout(s).`);
    return NextResponse.json({ success: true, date, ...sync }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Garmin workout sync failed';
    console.error('[Garmin activities] sync failed:', message);
    const status = message.startsWith('Garmin ') ? 502 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
