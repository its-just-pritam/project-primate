'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="fixed inset-0 z-50 min-h-dvh overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <LockKeyhole className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign in to Platito</h1>
          <p className="text-sm text-slate-400">Sign in with your email and password.</p>
        </div>
        <label className="block text-sm text-slate-300 space-y-1.5">
          Email
          <input type="email" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
        </label>
        <label className="block text-sm text-slate-300 space-y-1.5">
          Password
          <span className="relative block">
            <input autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-11 text-white outline-none focus:border-emerald-500" />
            <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
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
