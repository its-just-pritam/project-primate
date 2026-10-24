import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';
import { getStoredGarminIntegration } from '@/lib/sheets';
import { garminTokenCacheScope, garminTokenExpiresAt, obtainGarminAccessToken } from '@/lib/garmin';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const stored = await getStoredGarminIntegration(session.username);
    if (!stored.isLive) return NextResponse.json({ error: 'Google Sheets is not configured.' }, { status: 503 });
    if (stored.integration !== 'Garmin Connect' || !stored.apiKey) {
      return NextResponse.json({ error: 'Connect Garmin first.' }, { status: 409 });
    }

    const accessToken = await obtainGarminAccessToken(stored.apiKey);
    return NextResponse.json({ accessToken, expiresAt: garminTokenExpiresAt(accessToken), cacheScope: garminTokenCacheScope(session.username) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create a Garmin access token.';
    console.error('[Garmin access token] request failed:', message);
    const status = message.startsWith('Garmin token exchange failed') ? 502 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
