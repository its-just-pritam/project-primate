'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, LoaderCircle, ShieldCheck } from 'lucide-react';
import { SummaryDashboard } from '@/components/GarminSummaryDashboard';
import { GarminLogo } from '@/components/GarminLogo';
import { cacheGarminAccessToken, cacheGarminDailySummary, clearGarminAccessToken, clearGarminDailySummaryCache, fetchGarminData, getCachedGarminDailySummary, getGarminTokenCacheScope, responseBody, setGarminTokenCacheScope } from '@/lib/garminClient';

function currentLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function GarminCarouselCard({ isActive }: { isActive: boolean }) {
  const [initialSummary] = useState(() => {
    const scope = getGarminTokenCacheScope();
    return scope ? getCachedGarminDailySummary(scope, currentLocalDate()) : null;
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(!initialSummary);
  const [connected, setConnected] = useState<boolean | null>(initialSummary ? true : null);
  const [cacheScope, setCacheScope] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<{ date: string; data: unknown; deviceName: string | null } | null>(initialSummary);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isActive) return;
    let current = true;
    const date = currentLocalDate();
    const knownScope = getGarminTokenCacheScope();
    const hasFreshCachedSummary = Boolean(knownScope && getCachedGarminDailySummary(knownScope, date));
    if (!hasFreshCachedSummary) setLoading(true);
    setError('');

    const loadToday = async () => {
      try {
        const statusResponse = await fetch('/api/garmin/integration', { cache: 'no-store' });
        const status = await responseBody(statusResponse);
        if (!current) return;
        const scope = typeof status.cacheScope === 'string' ? status.cacheScope : null;
        setCacheScope(scope);
        setGarminTokenCacheScope(scope);
        setConnected(Boolean(status.connected));
        if (!status.connected) return;
        if (scope) {
          const cached = getCachedGarminDailySummary(scope, date);
          if (cached) {
            setResult(cached);
            return;
          }
        }

        const response = await fetchGarminData('/api/garmin/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date }),
        });
        const body = await responseBody(response);
        const summary = { date: body.date, data: body.data, deviceName: typeof body.deviceName === 'string' ? body.deviceName : null };
        if (current) {
          setResult(summary);
          if (scope) cacheGarminDailySummary(scope, summary);
        }
      } catch (loadError) {
        if (current) setError(loadError instanceof Error ? loadError.message : 'Could not load today’s Garmin data.');
      } finally {
        if (current) setLoading(false);
      }
    };

    void loadToday();
    return () => { current = false; };
  }, [isActive, reloadKey]);

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey.trim() || connecting) return;
    setConnecting(true);
    setError('');
    try {
      const response = await fetch('/api/garmin/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const body = await responseBody(response);
      const scope = typeof body.cacheScope === 'string' ? body.cacheScope : null;
      setCacheScope(scope);
      setGarminTokenCacheScope(scope);
      clearGarminDailySummaryCache(scope);
      clearGarminAccessToken(scope);
      if (typeof body.accessToken === 'string' && typeof body.expiresAt === 'number' && typeof body.cacheScope === 'string') {
        cacheGarminAccessToken(body.accessToken, body.expiresAt, body.cacheScope);
      }
      setApiKey('');
      setConnected(true);
      setReloadKey((key) => key + 1);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Could not connect Garmin.');
    } finally {
      setConnecting(false);
      setApiKey('');
    }
  };

  if (result) return <SummaryDashboard date={result.date} data={result.data} deviceName={result.deviceName} />;

  return (
    <section className="app-card-surface relative min-h-[230px] overflow-hidden rounded-2xl px-4 pb-4 pt-3 text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
        <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300">Garmin Connect</span>
        <span className="truncate text-xs font-medium text-slate-400">· Today</span>
        </div>
        <GarminLogo className="h-4 w-auto shrink-0 text-slate-200" />
      </div>
      {loading ? (
        <div className="relative z-10 flex min-h-[170px] flex-col items-center justify-center gap-3 text-center">
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-sky-300" />
          <p className="text-sm font-semibold text-slate-200">Loading today’s Garmin data…</p>
        </div>
      ) : connected === false ? (
        <div className="relative z-10 mt-5">
          <div className="flex items-center gap-2">
            <Activity aria-hidden="true" className="h-5 w-5 shrink-0 text-sky-300" />
            <div>
              <h3 className="text-sm font-bold text-white">Connect your Garmin device</h3>
              <p className="text-[11px] leading-4 text-slate-400">Paste your Garmin Personal API key to load today’s health data.</p>
            </div>
          </div>
          <form onSubmit={connect} className="mt-3 space-y-2.5">
            <input type="password" autoComplete="off" spellCheck={false} required value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Garmin Personal API key" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
            <div className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" /><span>The key is saved to your account’s User sheet row and isn’t shown again.</span></div>
            {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
            <button type="submit" disabled={connecting || !apiKey.trim()} className="inline-flex items-center gap-2 rounded-lg bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-50">
              {connecting && <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}{connecting ? 'Verifying and connecting…' : 'Verify and connect'}
            </button>
          </form>
        </div>
      ) : (
        <div className="relative z-10 flex min-h-[170px] flex-col items-center justify-center gap-3 text-center">
          <Activity aria-hidden="true" className="h-6 w-6 text-sky-300" />
          <p className="text-sm font-semibold text-slate-200">{error || 'Garmin data is ready to load.'}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="rounded-lg bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/15">Try again</button>
        </div>
      )}
    </section>
  );
}
