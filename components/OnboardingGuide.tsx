'use client';

import React from 'react';
import { CheckCircle2, PartyPopper, SkipForward, Sparkles } from 'lucide-react';

interface OnboardingGuideProps {
  step: number;
  title: string;
  description: string;
  actionLabel: string;
  onContinue: () => void;
}

export function OnboardingGuide({ step, title, description, actionLabel, onContinue }: OnboardingGuideProps) {
  const ActionIcon = actionLabel === 'Done' ? PartyPopper : actionLabel === 'Get started' ? Sparkles : SkipForward;
  return (
    <aside className="relative z-10 mx-auto my-3 w-[calc(100%-2rem)] max-w-2xl liquid-glass-panel rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Getting started · Step {step} of 5</p>
          <h3 className="mt-1 text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{description}</p>
          <div className="mt-3">
            <button type="button" onClick={onContinue} className="inline-flex items-center gap-1.5 glossy-3d-button rounded-lg px-3 py-2 text-xs font-bold">
              {actionLabel} <ActionIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
