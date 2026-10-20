'use client';

import React, { useState } from 'react';
import { BowlFoodIcon } from '@phosphor-icons/react/dist/csr/BowlFood';
import { LightningIcon } from '@phosphor-icons/react/dist/csr/Lightning';
import { FireIcon } from '@phosphor-icons/react/dist/csr/Fire';
import { MinusCircleIcon } from '@phosphor-icons/react/dist/csr/MinusCircle';
import { CalendarDotsIcon } from '@phosphor-icons/react/dist/csr/CalendarDots';
import { TrendDownIcon } from '@phosphor-icons/react/dist/csr/TrendDown';
import { ChartLineDownIcon } from '@phosphor-icons/react/dist/csr/ChartLineDown';
import { ScalesIcon } from '@phosphor-icons/react/dist/csr/Scales';
import { TargetIcon } from '@phosphor-icons/react/dist/csr/Target';

const metrics = [
  { label: 'Total Consumed', value: '42,860', unit: 'kcal', emoji: '🥣', Icon: BowlFoodIcon, color: 'text-emerald-300', hex: '#34d399', glow: 'rgba(52,211,153,0.58)', tile: 'bg-emerald-400/10 ring-emerald-300/20' },
  { label: 'Total Burnt incl. TEF', value: '38,420', unit: 'kcal', emoji: '⚡', Icon: LightningIcon, color: 'text-amber-300', hex: '#fcd34d', glow: 'rgba(250,204,21,0.55)', tile: 'bg-amber-400/10 ring-amber-300/20' },
  { label: 'Resting Burn', value: '1,840', unit: 'kcal/d', emoji: '🔥', Icon: FireIcon, color: 'text-sky-300', hex: '#38bdf8', glow: 'rgba(56,189,248,0.58)', tile: 'bg-sky-400/10 ring-sky-300/20' },
  { label: 'Avg Daily Deficit', value: '520', unit: 'kcal/d', emoji: '🔥', Icon: TargetIcon, color: 'text-red-400', hex: '#ef4444', glow: 'rgba(239,68,68,0.62)', tile: 'bg-red-400/10 ring-red-300/20' },
  { label: 'Total Deficit', value: '15,600', unit: 'kcal', emoji: '📉', Icon: FireIcon, color: 'text-orange-300', hex: '#fb923c', glow: 'rgba(251,146,60,0.62)', tile: 'bg-orange-400/10 ring-orange-300/20' },
  { label: 'Days on Plan', value: '30', unit: 'days', emoji: '📅', Icon: CalendarDotsIcon, color: 'text-indigo-300', hex: '#818cf8', glow: 'rgba(129,140,248,0.58)', tile: 'bg-indigo-400/10 ring-indigo-300/20' },
];

type Style = 'Emoji' | 'Phosphor filled' | 'Phosphor duotone';
const styles: Style[] = ['Emoji', 'Phosphor filled', 'Phosphor duotone'];

const deficitOptions = [
  { name: 'Orange flame', description: 'Selected for Total Deficit', Icon: FireIcon },
  { name: 'Trend down', description: 'Shows a downward trend', Icon: TrendDownIcon },
  { name: 'Falling chart', description: 'More data-focused', Icon: ChartLineDownIcon },
  { name: 'Scales', description: 'Energy balance', Icon: ScalesIcon },
  { name: 'Target', description: 'Goal and progress', Icon: TargetIcon },
];

function MetricCard({ metric, style }: { metric: typeof metrics[number]; style: Style }) {
  const { Icon } = metric;
  return (
    <div className="app-card-raised flex min-h-[92px] items-center gap-3 rounded-xl p-3">
      {style === 'Emoji' ? (
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center text-[23px]">{metric.emoji}</span>
      ) : style === 'Phosphor filled' ? (
        <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center ${metric.color}`}><Icon size={25} weight="fill" color={metric.hex} style={{ filter: `drop-shadow(0 0 6px ${metric.glow})` }} /></span>
      ) : (
        <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${metric.tile} ${metric.color}`}><Icon size={22} weight="duotone" color={metric.hex} style={{ filter: `drop-shadow(0 0 6px ${metric.glow})` }} /></span>
      )}
      <div className="min-w-0">
        <span className="block truncate text-[10px] font-medium text-slate-400">{metric.label}</span>
        <div className="flex items-baseline gap-1"><span className="text-sm font-black text-white">{metric.value}</span><span className="text-[10px] text-slate-400">{metric.unit}</span></div>
      </div>
    </div>
  );
}

export default function IconMocksPage() {
  const [style, setStyle] = useState<Style>('Lucide color tiles');
  const current = styles.indexOf(style);
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">Primate Fuel · UI mock</p>
          <h1 className="mt-2 text-2xl font-black">Active plan icon options</h1>
          <p className="mt-1 text-sm text-slate-400">Free Phosphor filled and duotone icons, compared with the current emoji treatment.</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-3" aria-label="Icon style comparisons">
          {styles.map((option) => (
            <article key={option} className={`app-card-surface rounded-2xl p-4 ${option === style ? 'ring-1 ring-emerald-400/50' : ''}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">{option}</h2>
                {option === style && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300">Preview</span>}
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {metrics.slice(0, 2).map((metric) => <MetricCard key={metric.label} metric={metric} style={option} />)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {metrics.slice(2).map((metric) => <MetricCard key={metric.label} metric={metric} style={option} />)}
              </div>
              <button type="button" onClick={() => setStyle(option)} className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-bold transition ${option === style ? 'bg-emerald-400 text-slate-950' : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'}`}>
                {option === style ? 'Selected for preview' : 'Preview this style'}
              </button>
            </article>
          ))}
        </section>

        <section className="app-card-surface rounded-2xl p-4 sm:p-5">
          <div id="total-deficit-options" className="mb-4 scroll-mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Total Deficit · icon options</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {deficitOptions.map(({ name, description, Icon }, index) => (
                <div key={name} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left ${index === 0 ? 'border-orange-400/60 bg-orange-400/10' : 'border-white/[0.06] bg-white/[0.025]'}`}>
                  <Icon aria-hidden="true" size={25} weight="fill" color={index === 0 ? '#fb923c' : '#34d399'} style={{ filter: index === 0 ? 'drop-shadow(0 0 6px rgba(251,146,60,0.62))' : 'drop-shadow(0 0 6px rgba(52,211,153,0.55))' }} />
                  <span className="min-w-0"><span className="block text-[11px] font-bold text-white">{name}</span><span className="mt-0.5 block text-[9px] leading-tight text-slate-400">{description}</span></span>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Mobile preview</p><h2 className="mt-1 text-sm font-bold">{style}</h2></div>
            <div className="flex gap-1">
              <button type="button" aria-label="Previous icon style" onClick={() => setStyle(styles[(current + styles.length - 1) % styles.length])} className="rounded-lg bg-white/[0.06] px-3 py-2 text-slate-300">‹</button>
              <button type="button" aria-label="Next icon style" onClick={() => setStyle(styles[(current + 1) % styles.length])} className="rounded-lg bg-white/[0.06] px-3 py-2 text-slate-300">›</button>
            </div>
          </div>
          <div className="mx-auto max-w-sm rounded-2xl border border-slate-700/70 bg-slate-900/75 p-3">
            <div className="mb-3 flex items-center justify-between"><div><span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300">Active Plan</span><p className="mt-2 text-lg font-black">72 kg <span className="text-emerald-300">→ 68 kg</span></p></div><span className="text-xs text-slate-400">Cut phase</span></div>
            <div className="grid grid-cols-2 gap-2">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} style={style} />)}</div>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-500">Each icon’s neon glow matches its color. Total Deficit uses the orange flame; Average Daily Deficit uses the red target.</p>
        </section>
      </div>
    </main>
  );
}
