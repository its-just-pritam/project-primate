'use client';

import React, { useEffect, useState } from 'react';
import { PlanAnalytics, PlanInput, PlanSummary, ProfileUpdate } from '@/types/nutrition';
import { ChevronDown, Eye, EyeOff, Info, LogOut, Mail, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { cacheGarminAccessToken, clearGarminAccessToken, clearGarminDailySummaryCache, responseBody, setGarminTokenCacheScope } from '@/lib/garminClient';
import { Header } from './Header';

interface ProfileScreenProps {
  plan: PlanAnalytics | null;
  onClose: () => void;
  startWithNewPlan?: boolean;
  onboardingHighlight?: 'profile' | 'plan' | null;
  onboardingGuide?: React.ReactNode;
  successToast?: React.ReactNode;
  onProfileSaveSuccess?: (message: string) => void;
  keepOpenDuringOnboarding?: boolean;
  onRefresh: () => void;
  onExport: () => void;
  isLoading: boolean;
  onContentScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onSave: (profile: ProfileUpdate) => Promise<boolean>;
  onAddPlan: (plan: PlanInput) => Promise<boolean>;
  onDeletePlan: (rowNumber: number, comment: string) => Promise<boolean>;
  onSignOut: () => void;
}

const inputCls =
  'log-input w-full h-11 rounded-xl px-3 text-sm text-white focus:outline-none';

const localDateTimeInputValue = (timestamp?: string) => {
  const parsed = timestamp ? new Date(timestamp) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timePart = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  return `${datePart}T${timePart}`;
};

const localDateTimeToUtc = (value: string) => {
  return new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z');
};

const describeDate = (iso: string) => {
  const datePart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return '';
  const [y, m, d] = datePart.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const days = Math.round((date.getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 86400000);
  const rel = days === 0 ? 'today' : days > 0 ? `in ${days} day${days === 1 ? '' : 's'}` : `${-days} day${days === -1 ? '' : 's'} ago`;
  return `${label} · ${rel}`;
};

const DateField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <div>
    <label className="text-xs font-medium text-slate-300 block mb-1">{label}</label>
    <input
      type="datetime-local"
      step="1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className={`${inputCls} [color-scheme:dark]`}
    />
    <p className="mt-1.5 text-[11px] text-slate-500">{describeDate(value)}</p>
  </div>
);

const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  props?: React.InputHTMLAttributes<HTMLInputElement>;
}> = ({ label, value, onChange, props = {} }) => (
  <div>
    <label className="text-xs font-medium text-slate-300 block mb-1">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className={inputCls}
      {...props}
    />
  </div>
);

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
}> = ({ label, value, onChange, visible, onToggleVisibility }) => (
  <div>
    <label className="text-xs font-medium text-slate-300 block mb-1">{label}</label>
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        minLength={12}
        maxLength={256}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} pr-11`}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

const PlanCard: React.FC<{
  plan: PlanSummary;
  busy: boolean;
  onSave: (p: PlanSummary, v: PlanInput) => Promise<boolean>;
  onDelete: (p: PlanSummary) => void;
}> = ({ plan, busy, onSave, onDelete }) => {
  const [open, setOpen] = useState(false);
  const isDeleted = plan.status === 'DELETED';
  const [name, setName] = useState(plan.name);
  const [target, setTarget] = useState(String(plan.targetWeight));
  const [resting, setResting] = useState(String(plan.restingCalories));
  const [start, setStart] = useState(localDateTimeInputValue(plan.startDate));
  const [comment, setComment] = useState(plan.comment);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = await onSave(plan, {
      planName: name.trim(),
      userName: '',
      targetWeightKg: parseFloat(target),
      restingCalories: parseFloat(resting),
      startDate: localDateTimeToUtc(start),
      comment: comment.trim(),
    });
    if (!ok) setError('Could not save the plan. Please check the values.');
  };

  return (
    <div className={`border-b border-slate-700/70 pb-2 ${isDeleted ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => !isDeleted && setOpen((o) => !o)}
        aria-expanded={open}
        disabled={isDeleted}
        className="w-full py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <span className="truncate">{plan.name}</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                plan.status === 'ACTIVE'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : isDeleted
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-slate-400 bg-slate-700/40'
              }`}
            >
              {plan.status === 'ACTIVE' ? 'Active' : isDeleted ? 'Deleted' : 'Inactive'}
            </span>
          </p>
          <p className="text-[11px] text-slate-400">
            Target {plan.targetWeight} kg · {plan.restingCalories} kcal/d · from {localDateTimeInputValue(plan.startDate).slice(0, 10)}
          </p>
          {plan.comment && <p className="text-[11px] text-slate-500 italic mt-0.5">{plan.comment}</p>}
        </div>
        {!isDeleted && <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />}
      </button>

      {open && !isDeleted && (
        <form onSubmit={submit} className="pt-3 space-y-3 border-t border-slate-700/70">
          <div className="pt-2.5">
            <FormField label="Plan name" value={name} onChange={setName} props={{ type: 'text' }} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField
              label="Target weight (kg)"
              value={target}
              onChange={setTarget}
              props={{ type: 'number', step: 'any', min: '1' }}
            />
            <FormField
              label="Resting calories (kcal)"
              value={resting}
              onChange={setResting}
              props={{ type: 'number', min: '1' }}
            />
          </div>
          <DateField label="Start date" value={start} onChange={setStart} />
          <FormField
            label="Comment (optional)"
            value={comment}
            onChange={setComment}
            props={{ type: 'text', required: false, placeholder: 'Notes about this plan' }}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              aria-label={`Delete ${plan.name}`}
              disabled={busy}
              onClick={() => onDelete(plan)}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] text-red-300 hover:bg-rose-500/10 disabled:opacity-30 flex items-center gap-1.5 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-emerald-200 to-emerald-400 text-slate-950 font-bold text-xs shadow-[0_6px_16px_rgba(16,185,129,0.14)] disabled:opacity-50"
            >
              Save plan
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  plan,
  onClose,
  startWithNewPlan = false,
  onboardingHighlight = null,
  onboardingGuide,
  successToast,
  onProfileSaveSuccess,
  keepOpenDuringOnboarding = false,
  onRefresh,
  onExport,
  isLoading,
  onContentScroll,
  onSave,
  onAddPlan,
  onDeletePlan,
  onSignOut,
}) => {
  const [userName, setUserName] = useState(plan?.userName || '');
  const [weight, setWeight] = useState(String(plan?.currentWeight ?? ''));
  const [height, setHeight] = useState(String(plan?.heightCm ?? ''));
  const [perWeek, setPerWeek] = useState(String(plan?.workoutsPerWeek ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false);
  const [garminConnected, setGarminConnected] = useState(false);
  const [garminLive, setGarminLive] = useState(false);
  const [garminMaskedKey, setGarminMaskedKey] = useState('');
  const [garminKeyDraft, setGarminKeyDraft] = useState('');
  const [garminKeyVisible, setGarminKeyVisible] = useState(false);
  const [garminKeyBusy, setGarminKeyBusy] = useState(false);
  const [garminKeyLoading, setGarminKeyLoading] = useState(true);
  const [garminSectionOpen, setGarminSectionOpen] = useState(false);
  const [garminKeyError, setGarminKeyError] = useState('');
  const [garminKeyNotice, setGarminKeyNotice] = useState('');
  const [garminCacheScope, setGarminCacheScope] = useState<string | null>(null);

  const loadGarminStatus = async () => {
    setGarminKeyLoading(true);
    try {
      const response = await fetch('/api/garmin/integration', { cache: 'no-store' });
      const body = await responseBody(response);
      const scope = typeof body.cacheScope === 'string' ? body.cacheScope : null;
      setGarminConnected(Boolean(body.connected));
      setGarminLive(Boolean(body.isLive));
      setGarminMaskedKey(typeof body.apiKeyMasked === 'string' ? body.apiKeyMasked : '');
      setGarminCacheScope(scope);
      setGarminTokenCacheScope(scope);
    } catch (statusError) {
      setGarminKeyError(statusError instanceof Error ? statusError.message : 'Could not load Garmin settings.');
    } finally {
      setGarminKeyLoading(false);
    }
  };

  useEffect(() => { void loadGarminStatus(); }, []);

  const saveGarminKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!garminKeyDraft.trim() || garminKeyBusy) return;
    setGarminKeyBusy(true);
    setGarminKeyError('');
    setGarminKeyNotice('');
    try {
      const response = await fetch('/api/garmin/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ apiKey: garminKeyDraft.trim() }),
      });
      const body = await responseBody(response);
      const scope = typeof body.cacheScope === 'string' ? body.cacheScope : garminCacheScope;
      setGarminCacheScope(scope);
      setGarminTokenCacheScope(scope);
      clearGarminDailySummaryCache(scope);
      clearGarminAccessToken(scope);
      if (typeof body.accessToken === 'string' && typeof body.expiresAt === 'number' && typeof body.cacheScope === 'string') {
        cacheGarminAccessToken(body.accessToken, body.expiresAt, body.cacheScope);
      }
      setGarminKeyDraft('');
      setGarminKeyVisible(false);
      setGarminKeyNotice('Garmin API key verified and saved.');
      await loadGarminStatus();
    } catch (saveError) {
      setGarminKeyError(saveError instanceof Error ? saveError.message : 'Could not save the Garmin API key.');
    } finally {
      setGarminKeyBusy(false);
    }
  };

  const disconnectGarmin = async () => {
    if (!window.confirm('Disconnect Garmin and remove the saved API key from your account?')) return;
    setGarminKeyBusy(true);
    setGarminKeyError('');
    setGarminKeyNotice('');
    try {
      const response = await fetch('/api/garmin/integration', { method: 'DELETE', cache: 'no-store' });
      await responseBody(response);
      clearGarminAccessToken(garminCacheScope);
      clearGarminDailySummaryCache(garminCacheScope);
      setGarminConnected(false);
      setGarminMaskedKey('');
      setGarminKeyDraft('');
      setGarminKeyNotice('Garmin disconnected and the saved key was removed.');
    } catch (disconnectError) {
      setGarminKeyError(disconnectError instanceof Error ? disconnectError.message : 'Could not disconnect Garmin.');
    } finally {
      setGarminKeyBusy(false);
    }
  };

  // ACTIVE first, then INACTIVE, then DELETED; within a status, earliest start date first.
  const STATUS_ORDER = { ACTIVE: 0, INACTIVE: 1, DELETED: 2 } as const;
  const plans = [...(plan?.plans || [])].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const [showNew, setShowNew] = useState(startWithNewPlan);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newResting, setNewResting] = useState(String(plan?.restingCalories ?? ''));
  const [newStart, setNewStart] = useState(localDateTimeInputValue());
  const [newComment, setNewComment] = useState('');
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showRestingCaloriesInfo, setShowRestingCaloriesInfo] = useState(false);

  // User details and a plan row are written together, so the other half is sent unchanged.
  const savedUser = {
    userName: plan?.userName || '',
    weightKg: plan?.currentWeight ?? 0,
    heightCm: plan?.heightCm ?? 0,
    workoutsPerWeek: plan?.workoutsPerWeek ?? 0,
  };

  const userDirty =
    userName.trim() !== savedUser.userName ||
    (parseFloat(weight) || 0) !== savedUser.weightKg ||
    (parseFloat(height) || 0) !== savedUser.heightCm ||
    (parseFloat(perWeek) || 0) !== savedUser.workoutsPerWeek;

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const detailsDirty =
      userName.trim() !== savedUser.userName ||
      (parseFloat(weight) || 0) !== savedUser.weightKg ||
      (parseFloat(height) || 0) !== savedUser.heightCm ||
      (parseFloat(perWeek) || 0) !== savedUser.workoutsPerWeek;
    if (!detailsDirty) {
      if (!keepOpenDuringOnboarding) onClose();
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onSave({
      userName: userName.trim(),
      weightKg: parseFloat(weight),
      heightCm: parseFloat(height) || 0,
      workoutsPerWeek: parseFloat(perWeek) || 0,
      planName: '',
      targetWeightKg: 0,
      restingCalories: 0,
      startDate: '',
    });
    setSaving(false);
    if (ok) {
      if (!keepOpenDuringOnboarding) onClose();
    } else {
      setError('Could not save. Please check the values and try again.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not change password.');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess('Password changed successfully.');
      onProfileSaveSuccess?.('Password changed');
    } catch (changeError) {
      setPasswordError(changeError instanceof Error ? changeError.message : 'Could not change password.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleSavePlan = async (p: PlanSummary, v: PlanInput) => {
    setPlanBusy(true);
    const ok = await onSave({
      ...savedUser,
      planName: v.planName,
      targetWeightKg: v.targetWeightKg,
      restingCalories: v.restingCalories,
      startDate: v.startDate,
      comment: v.comment,
      planRow: p.rowNumber,
    });
    setPlanBusy(false);
    if (ok && !keepOpenDuringOnboarding) onClose();
    return ok;
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanBusy(true);
    setPlanError(null);
    const ok = await onAddPlan({
      planName: newName.trim(),
      userName: savedUser.userName,
      targetWeightKg: parseFloat(newTarget),
      restingCalories: parseFloat(newResting),
      startDate: localDateTimeToUtc(newStart),
      comment: newComment.trim(),
    });
    setPlanBusy(false);
    if (ok) {
      if (keepOpenDuringOnboarding) {
        setShowNew(false);
        setNewName('');
        setNewTarget('');
        setNewComment('');
      } else {
        onClose();
      }
    } else setPlanError('Could not add the plan. Please check the values.');
  };

  const [deleting, setDeleting] = useState<PlanSummary | null>(null);
  const [deleteComment, setDeleteComment] = useState('');

  const openDelete = (p: PlanSummary) => {
    setDeleteComment(p.comment);
    setPlanError(null);
    setDeleting(p);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setPlanBusy(true);
    const ok = await onDeletePlan(deleting.rowNumber, deleteComment.trim());
    setPlanBusy(false);
    if (ok && !keepOpenDuringOnboarding) onClose();
    else setPlanError('Could not delete the plan.');
    setDeleting(null);
  };

  return (
    <div className="min-h-0 flex-1 flex flex-col bg-[#0b101b]">
      <Header
        onRefresh={onRefresh}
        onExport={onExport}
        isLoading={isLoading}
        rightContent={(
          <button
            type="submit"
            form="user-form"
            disabled={saving || !userDirty}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-200 to-emerald-400 px-4 text-sm font-semibold leading-none text-slate-950 transition-all disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-800"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      />
      {successToast}
      {onboardingGuide}

      <div onScroll={onContentScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#0b101b] px-4 pt-5 pb-32 space-y-6">
        <form id="user-form" onSubmit={handleSaveUser} className={`space-y-2.5 ${onboardingHighlight === 'profile' ? 'onboarding-glow-fields' : ''}`}>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">User</h3>
          <FormField label="Name" value={userName} onChange={setUserName} props={{ type: 'text' }} />
          <div className="grid grid-cols-3 gap-2.5">
            <FormField
              label="Weight (kg)"
              value={weight}
              onChange={setWeight}
              props={{ type: 'number', step: 'any', min: '1' }}
            />
            <FormField
              label="Height (cm)"
              value={height}
              onChange={setHeight}
              props={{ type: 'number', step: 'any', min: '0' }}
            />
            <FormField
              label="Workouts / wk"
              value={perWeek}
              onChange={setPerWeek}
              props={{ type: 'number', min: '0', max: '14' }}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-white/[0.025]">
          <button type="button" aria-expanded={garminSectionOpen} aria-controls="garmin-profile-settings" onClick={() => setGarminSectionOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/[0.025]">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Garmin Connect</h3>
              <p className="mt-1 text-xs text-slate-500">{garminKeyLoading ? 'Checking connection…' : garminConnected ? 'Connected to your Garmin account' : 'Manage your Garmin connection and API key'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${garminConnected ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {garminKeyLoading ? 'CHECKING' : garminConnected ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${garminSectionOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {garminSectionOpen && <div id="garmin-profile-settings" className="space-y-3 border-t border-slate-700/70 px-4 pb-4 pt-3">
          {garminKeyLoading ? <p className="text-xs text-slate-500">Loading integration settings…</p> : <>
            {garminConnected && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-500">Saved API key</p>
                  <p className="truncate font-mono text-xs text-slate-300">{garminMaskedKey || '••••••••'}</p>
                </div>
              </div>
            )}
            {!garminLive && <p className="text-xs leading-5 text-amber-200/80">Google Sheets is not connected, so the API key cannot be saved.</p>}
            <form onSubmit={saveGarminKey} className="space-y-2.5">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">{garminConnected ? 'Replace API key' : 'Garmin Personal API key'}</span>
                <span className="relative block">
                  <input type={garminKeyVisible ? 'text' : 'password'} autoComplete="off" spellCheck={false} required value={garminKeyDraft} onChange={(event) => setGarminKeyDraft(event.target.value)} placeholder={garminConnected ? 'Paste a new key to replace' : 'Paste your personal API key'} className={`${inputCls} pr-12`} />
                  <button type="button" aria-label={garminKeyVisible ? 'Hide new API key' : 'Show new API key'} onClick={() => setGarminKeyVisible((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white">{garminKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </span>
              </label>
              <div className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" /><span>Your key is saved in your User sheet row and stays masked here.</span></div>
              {garminKeyError && <p role="alert" className="text-xs text-rose-300">{garminKeyError}</p>}
              {garminKeyNotice && <p role="status" className="text-xs text-emerald-300">{garminKeyNotice}</p>}
              <div className="flex items-center gap-2">
                <button type="submit" disabled={garminKeyBusy || !garminKeyDraft.trim() || !garminLive} className="flex-1 rounded-xl bg-sky-400/10 px-2.5 py-2.5 text-center text-[11px] font-semibold text-sky-200 transition hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-45">
                  {garminKeyBusy ? (garminConnected ? 'Updating…' : 'Verifying and saving…') : garminConnected ? 'Update' : 'Verify and connect'}
                </button>
                {garminConnected && <button type="button" onClick={() => void disconnectGarmin()} disabled={garminKeyBusy} className="flex-1 rounded-xl px-2.5 py-2.5 text-center text-[11px] font-medium text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50">{garminKeyBusy ? 'Disconnecting…' : 'Disconnect'}</button>}
              </div>
            </form>
          </>}
          </div>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-white/[0.025]">
          <button
            type="button"
            aria-expanded={passwordSectionOpen}
            aria-controls="change-password-form"
            onClick={() => setPasswordSectionOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/[0.025]"
          >
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">Change password</span>
              <span className="mt-1 block text-xs text-slate-500">Update your account password</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${passwordSectionOpen ? 'rotate-180' : ''}`} />
          </button>
          {passwordSectionOpen && (
            <form id="change-password-form" onSubmit={handleChangePassword} className="space-y-3 border-t border-slate-700/70 px-4 pb-4 pt-3">
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                visible={showNewPassword}
                onToggleVisibility={() => setShowNewPassword((visible) => !visible)}
              />
              <PasswordField
                label="Confirm new password"
                value={confirmNewPassword}
                onChange={setConfirmNewPassword}
                visible={showConfirmNewPassword}
                onToggleVisibility={() => setShowConfirmNewPassword((visible) => !visible)}
              />
              <p className="text-[11px] text-slate-500">Use at least 12 characters.</p>
              {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-emerald-400">{passwordSuccess}</p>}
              <button
                type="submit"
                disabled={passwordBusy || newPassword.length < 12 || !confirmNewPassword}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordBusy ? 'Changing...' : 'Change password'}
              </button>
            </form>
          )}
        </section>

        <section className="space-y-2.5 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              All Plans ({plans.length})
            </h3>
            {!showNew && (
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className={`flex items-center gap-1.5 text-sm font-medium text-emerald-300 hover:text-emerald-200 active:scale-95 transition-all ${onboardingHighlight === 'plan' ? 'onboarding-text-glow' : ''}`}
              >
                <Plus className="w-4 h-4" /> Add Plan
              </button>
            )}
          </div>

          {showNew && (
            <form
              onSubmit={handleAddPlan}
              className={`py-3 space-y-3 border-y border-slate-700/70 ${onboardingHighlight === 'plan' ? 'onboarding-glow-fields' : ''}`}
            >
              <h4 className="text-sm font-semibold text-white">New Plan</h4>
              <FormField
                label="Plan name"
                value={newName}
                onChange={setNewName}
                props={{ type: 'text', placeholder: 'e.g. Bulk 2027' }}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <FormField
                  label="Target weight (kg)"
                  value={newTarget}
                  onChange={setNewTarget}
                  props={{ type: 'number', step: 'any', min: '1' }}
                />
                <div className="relative">
                  <div className="flex h-4 items-center gap-2 mb-1">
                    <label htmlFor="new-plan-resting-calories" className="text-xs font-medium leading-4 text-slate-300">Resting calories (kcal)</label>
                    <button
                      type="button"
                      aria-label="Explain resting calories"
                      aria-expanded={showRestingCaloriesInfo}
                      aria-controls="resting-calories-tooltip"
                      onClick={() => setShowRestingCaloriesInfo((shown) => !shown)}
                      className="inline-flex h-4 w-4 items-center justify-center text-slate-500 hover:text-emerald-300 focus:text-emerald-300"
                    >
                      <Info className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                  <input
                    id="new-plan-resting-calories"
                    type="number"
                    min="1"
                    required
                    value={newResting}
                    onChange={(e) => setNewResting(e.target.value)}
                    className={inputCls}
                  />
                  {showRestingCaloriesInfo && (
                    <div id="resting-calories-tooltip" role="tooltip" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-[11px] leading-relaxed text-slate-300 shadow-xl">
                      Enter your estimated calories burned per day at rest (BMR). This is the baseline for the plan&apos;s deficit calculations; workout calories and TEF are added separately.
                    </div>
                  )}
                </div>
              </div>
              <DateField label="Start date" value={newStart} onChange={setNewStart} />
              <FormField
                label="Comment (optional)"
                value={newComment}
                onChange={setNewComment}
                props={{ type: 'text', required: false, placeholder: 'Notes about this plan' }}
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="flex-1 h-10 rounded-xl bg-white/[0.05] text-slate-300 font-medium text-sm hover:bg-white/[0.09] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planBusy}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-br from-emerald-200 to-emerald-400 text-slate-950 font-medium text-sm disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  {planBusy ? 'Adding...' : 'Add Plan'}
                </button>
              </div>
            </form>
          )}

          {plans.map((p) => (
            <PlanCard
              key={`${p.rowNumber}-${p.name}-${p.startDate}`}
              plan={p}
              busy={planBusy}
              onSave={handleSavePlan}
              onDelete={openDelete}
            />
          ))}
          {plans.length === 0 ? (
            <p className="text-[11px] text-slate-500">No plans yet. Add one to track your progress.</p>
          ) : (
            <p className="text-[11px] text-slate-500">
              A plan is Active once its start date arrives, otherwise Inactive. Active plans appear as swipeable cards on Today, earliest first.
            </p>
          )}

          {planError && <p className="text-xs text-red-400">{planError}</p>}
        </section>
        <hr className="w-full border-slate-700/70" />
        <a
          href="mailto:mallickpritam1407@gmail.com"
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-200 transition-colors"
        >
          <Mail className="h-4 w-4" />
          Contact support
        </a>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
      {deleting && (
        <div
          className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex items-center justify-center bg-black/60 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Delete plan"
          onClick={() => !planBusy && setDeleting(null)}
        >
          <div
            className="app-card-surface w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-bold text-white">Delete plan &quot;{deleting.name}&quot;?</h4>
            <p className="text-[11px] text-slate-400">
              The plan is marked as DELETED in the sheet and no longer used for tracking.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Comment (optional)</label>
              <input
                autoFocus
                value={deleteComment}
                onChange={(e) => setDeleteComment(e.target.value)}
                placeholder="Why is this plan being deleted?"
                className={inputCls}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={planBusy}
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={planBusy}
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs disabled:opacity-50"
              >
                {planBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
