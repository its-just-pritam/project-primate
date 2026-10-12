'use client';

import React, { useState } from 'react';
import { PlanAnalytics, PlanInput, PlanSummary, ProfileUpdate } from '@/types/nutrition';
import { ArrowLeft, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { AVATARS } from '@/lib/avatars';

interface ProfileScreenProps {
  avatar: string;
  onAvatarChange: (avatar: string) => void;
  plan: PlanAnalytics | null;
  onClose: () => void;
  startWithNewPlan?: boolean;
  onSave: (profile: ProfileUpdate) => Promise<boolean>;
  onAddPlan: (plan: PlanInput) => Promise<boolean>;
  onDeletePlan: (rowNumber: number, comment: string) => Promise<boolean>;
}

const inputCls =
  'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';

const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const today = () => isoDay(0);

const describeDate = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
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
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className={`${inputCls} [color-scheme:dark] h-11`}
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
  const [start, setStart] = useState(plan.startDate.slice(0, 10));
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
      startDate: `${start}T00:00:00Z`,
      comment: comment.trim(),
    });
    if (!ok) setError('Could not save the plan. Please check the values.');
  };

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden ${isDeleted ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={() => !isDeleted && setOpen((o) => !o)}
        aria-expanded={open}
        disabled={isDeleted}
        className="w-full p-3.5 flex items-center justify-between gap-3 text-left"
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
            Target {plan.targetWeight} kg · {plan.restingCalories} kcal/d · from {plan.startDate.slice(0, 10)}
          </p>
          {plan.comment && <p className="text-[11px] text-slate-500 italic mt-0.5">{plan.comment}</p>}
        </div>
        {!isDeleted && <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />}
      </button>

      {open && !isDeleted && (
        <form onSubmit={submit} className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-slate-800">
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
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 text-red-400 hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1.5 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50"
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
  avatar,
  onAvatarChange,
  onSave,
  onAddPlan,
  onDeletePlan,
}) => {
  const [userName, setUserName] = useState(plan?.userName || '');
  const [weight, setWeight] = useState(String(plan?.currentWeight ?? ''));
  const [height, setHeight] = useState(String(plan?.heightCm ?? ''));
  const [perWeek, setPerWeek] = useState(String(plan?.workoutsPerWeek ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [newStart, setNewStart] = useState(today());
  const [newComment, setNewComment] = useState('');
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // User details and a plan row are written together, so the other half is sent unchanged.
  const savedUser = {
    userName: plan?.userName || '',
    weightKg: plan?.currentWeight ?? 0,
    heightCm: plan?.heightCm ?? 0,
    workoutsPerWeek: plan?.workoutsPerWeek ?? 0,
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (ok) onClose();
    else setError('Could not save. Please check the values and try again.');
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
    if (ok) onClose();
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
      startDate: `${newStart}T00:00:00Z`,
      comment: newComment.trim(),
    });
    setPlanBusy(false);
    if (ok) onClose();
    else setPlanError('Could not add the plan. Please check the values.');
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
    if (ok) onClose();
    else setPlanError('Could not delete the plan.');
    setDeleting(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="p-1.5 -ml-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold tracking-tight text-white">Profile &amp; Plan</h1>
      </header>

      <div className="flex-1 px-4 py-5 space-y-6">
        <section className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
              {avatar}
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avatar</h3>
              <p className="text-xs text-slate-500">Pick one that suits you</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                aria-label={`Choose avatar ${a}`}
                aria-pressed={a === avatar}
                onClick={() => onAvatarChange(a)}
                className={`h-12 rounded-xl text-2xl flex items-center justify-center border transition-all active:scale-95 ${
                  a === avatar
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </section>

        <form onSubmit={handleSaveUser} className="space-y-2.5">
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
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save user'}
          </button>
        </form>

        <section className="space-y-2.5 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              All Plans ({plans.length})
            </h3>
            {!showNew && (
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" /> New plan
              </button>
            )}
          </div>

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

          {showNew && (
            <form
              onSubmit={handleAddPlan}
              className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5"
            >
              <h4 className="text-sm font-bold text-white">New Plan</h4>
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
                <FormField
                  label="Resting calories (kcal)"
                  value={newResting}
                  onChange={setNewResting}
                  props={{ type: 'number', min: '1' }}
                />
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planBusy}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {planBusy ? 'Adding...' : 'Add Plan'}
                </button>
              </div>
            </form>
          )}

          {planError && <p className="text-xs text-red-400">{planError}</p>}
        </section>
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
            className="w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
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
