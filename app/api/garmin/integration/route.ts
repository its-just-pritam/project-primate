import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/authSession';
import { garminTokenCacheScope, garminTokenExpiresAt } from '@/lib/garmin';
import {
  getStoredGarminIntegration,
  removeGarminIntegration,
  saveGarminIntegration,
} from '@/lib/sheets';
import { obtainGarminAccessToken } from '@/lib/garmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const stored = await getStoredGarminIntegration(session.username);
    if (stored.integration !== 'Garmin Connect') {
      return NextResponse.json({
        integration: stored.integration,
        connected: false,
        isLive: stored.isLive,
        apiKeyMasked: '',
        cacheScope: garminTokenCacheScope(session.username),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const apiKey = stored.apiKey;
    const apiKeyMasked = apiKey.length <= 8 ? `••••${apiKey.slice(-4)}` : `${apiKey.slice(0, 4)}••••••${apiKey.slice(-4)}`;
    return NextResponse.json({
      integration: stored.integration,
      connected: stored.integration === 'Garmin Connect' && Boolean(apiKey),
      isLive: stored.isLive,
      apiKeyMasked,
      cacheScope: garminTokenCacheScope(session.username),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Garmin integration] status read failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load Garmin integration' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const apiKey = String(body.apiKey || '')
      .trim()
      .replace(/^Authorization\s*:\s*/i, '')
      .replace(/^ApiKey\s+/i, '')
      .trim();
    if (!apiKey) return NextResponse.json({ error: 'Paste your Garmin Personal API key.' }, { status: 400 });

    const accessToken = await obtainGarminAccessToken(apiKey);
    const isLive = await saveGarminIntegration(session.username, apiKey);
    if (!isLive) return NextResponse.json({ error: 'Google Sheets is not configured; the key was not saved.' }, { status: 503 });
    return NextResponse.json({
      success: true,
      connected: true,
      accessToken,
      expiresAt: garminTokenExpiresAt(accessToken),
      cacheScope: garminTokenCacheScope(session.username),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect Garmin';
    console.error('[Garmin integration] connect failed:', message);
    const status = message.startsWith('Garmin token exchange failed') ? 502 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const isLive = await removeGarminIntegration(session.username);
    if (!isLive) return NextResponse.json({ error: 'Google Sheets is not configured; no changes were made.' }, { status: 503 });
    return NextResponse.json({ success: true, connected: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect Garmin';
    console.error('[Garmin integration] disconnect failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
