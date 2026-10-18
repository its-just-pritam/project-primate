'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in');
      router.replace('/');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <LockKeyhole className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign in to Primate Fuel</h1>
          <p className="text-sm text-slate-400">Sign in with your email and password.</p>
        </div>
        <label className="block text-sm text-slate-300 space-y-1.5">
          Email
          <input type="email" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
        </label>
        <label className="block text-sm text-slate-300 space-y-1.5">
          Password
          <input autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-slate-400">
          New here? <Link href="/signup" className="font-semibold text-emerald-400 hover:text-emerald-300">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
