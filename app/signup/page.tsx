'use client';

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create account');
      router.replace('/');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
        <div className="text-center space-y-2 pb-1">
          <div className="mx-auto w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-slate-400">Your email will be your username.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-slate-300 space-y-1.5">
            First name
            <input autoComplete="given-name" required maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
          </label>
          <label className="block text-sm text-slate-300 space-y-1.5">
            Last name
            <input autoComplete="family-name" required maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
          </label>
        </div>
        <label className="block text-sm text-slate-300 space-y-1.5">
          Email
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
        </label>
        <label className="block text-sm text-slate-300 space-y-1.5">
          Password
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
          <span className="block text-xs text-slate-500">Use at least 12 characters.</span>
        </label>
        <label className="block text-sm text-slate-300 space-y-1.5">
          Confirm password
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-400">
          Already have an account? <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
