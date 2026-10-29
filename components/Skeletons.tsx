import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-800/80 ${className}`} />
);

const Card: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label={label}
    className="app-card-surface rounded-2xl p-4 space-y-3"
  >
    {children}
  </div>
);

export const ProfileSkeleton: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex-1 flex flex-col">
    <header className="sticky top-0 z-40 bg-[#0b1220]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center gap-3">
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
    <div className="flex-1 px-4 py-5 space-y-4" role="status" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-3">
        <Bar className="h-14 w-14 rounded-2xl" />
        <Bar className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <Bar key={i} className="h-12 rounded-xl" />
        ))}
      </div>
      <Bar className="h-10 rounded-xl" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bar key={i} className="h-10 rounded-xl" />
        ))}
      </div>
      <Bar className="h-28 rounded-2xl" />
      <p className="text-[11px] text-slate-500">Loading your profile…</p>
    </div>
  </div>
);

export const LogFormSkeleton: React.FC = () => (
  <Card label="Loading log form">
    <Bar className="h-4 w-28" />
    <Bar className="h-11 rounded-xl" />
    <div className="grid grid-cols-2 gap-2.5">
      <Bar className="h-11 rounded-xl" />
      <Bar className="h-11 rounded-xl" />
    </div>
    <Bar className="h-20 rounded-xl" />
    <Bar className="h-11 rounded-xl" />
    <p className="text-[11px] text-slate-500">Loading your recipes and workouts…</p>
  </Card>
);

export const PlanCardSkeleton: React.FC = () => (
  <Card label="Loading plan">
    <Bar className="h-3 w-40" />
    <Bar className="h-6 w-32" />
    <div className="grid grid-cols-2 gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <Bar key={i} className="h-14 rounded-xl" />
      ))}
    </div>
    <Bar className="h-2.5 w-full rounded-full" />
    <p className="text-[11px] text-slate-500">Loading your plan…</p>
  </Card>
);

export const MacroRingsSkeleton: React.FC = () => (
  <Card label="Loading daily nutrition">
    <div className="flex items-center gap-4">
      <Bar className="h-20 w-20 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Bar className="h-5 w-28" />
        <Bar className="h-3 w-36" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Bar key={i} className="h-16 rounded-xl" />
      ))}
    </div>
    <p className="text-[11px] text-slate-500">Loading today&apos;s nutrition…</p>
  </Card>
);

export const ListSkeleton: React.FC<{ rows?: number; label: string }> = ({ rows = 2, label }) => (
  <Card label={label}>
    <Bar className="h-4 w-32" />
    {Array.from({ length: rows }).map((_, i) => (
      <Bar key={i} className="h-14 rounded-xl" />
    ))}
    <p className="text-[11px] text-slate-500">{label}…</p>
  </Card>
);

export const ChartSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Card label="Loading trends">
      <Bar className="h-4 w-48" />
      <Bar className="h-44 rounded-xl" />
      <p className="text-[11px] text-slate-500">Loading trends…</p>
    </Card>
    <Card label="Loading averages">
      <Bar className="h-4 w-40" />
      <Bar className="h-24 rounded-xl" />
    </Card>
  </div>
);
