import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, ArrowRight, Check, Cookie, Dumbbell, Leaf, Scale, Target, TrendingUp, Utensils } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Primate Fuel | Nutrition, energy, and body composition',
  description: 'Track meals and macros, see how resting energy, TEF, and workouts shape daily balance, and follow estimated fat and muscle changes.',
};

const features = [
  {
    icon: Utensils,
    title: 'Make meals count',
    body: 'Log recipes, ingredients, packaged foods, and the portions you eat.',
    details: ['Adjust quantities by serving or portion', 'See calories, protein, carbs, and fat per meal', 'Watch your daily nutrition totals update'],
    color: 'text-emerald-300 bg-emerald-400/10 border-emerald-300/15',
  },
  {
    icon: Scale,
    title: 'Your active plan',
    body: 'Follow a weight goal with daily energy balance and estimated body-composition changes in one place.',
    details: ['See estimated fat and muscle changes separately', 'See how protein availability, baseline needs, workouts, and a calorie deficit inform muscle estimates', 'Compare intake with resting, workout, and digestion energy'],
    color: 'text-violet-300 bg-violet-400/10 border-violet-300/15',
  },
  {
    icon: TrendingUp,
    title: 'Follow your trends',
    body: 'Review daily charts across nutrition, energy, and estimated body-composition change.',
    details: ['Compare intake with resting, workout, and TEF burn', 'Track deficit and surplus beside protein intake', 'Start with seven days, then scroll through your history'],
    color: 'text-sky-300 bg-sky-400/10 border-sky-300/15',
  },
];

const trendPreviews = [
  {
    kind: 'calories' as const,
    title: 'Calories consumed vs burnt',
    description: 'Compare food intake with resting, TEF, and workout burn.',
    method: 'Daily balance = intake − resting energy − digestion (TEF) − workouts',
    bars: [
      { consumed: 58, resting: 53, tef: 8, workout: 13 }, { consumed: 71, resting: 53, tef: 9, workout: 20 },
      { consumed: 62, resting: 53, tef: 8, workout: 8 }, { consumed: 82, resting: 53, tef: 10, workout: 18 },
      { consumed: 68, resting: 53, tef: 8, workout: 14 }, { consumed: 76, resting: 53, tef: 10, workout: 23 },
      { consumed: 63, resting: 53, tef: 8, workout: 12 },
    ],
    legend: [{ label: 'Consumed', color: '#4e79a7' }, { label: 'Resting', color: '#fbbf24' }, { label: 'TEF', color: '#fb923c' }, { label: 'Workout', color: '#f87171' }],
  },
  {
    kind: 'deficit' as const,
    title: 'Daily calorie deficit',
    description: 'Positive values show a deficit; negative values show a surplus.',
    method: 'Deficit = resting energy + workouts + TEF − intake',
    bars: [62, -34, 78, 28, -48, 54, 84],
    legend: [{ label: 'Deficit', color: '#ef4444' }, { label: 'Surplus', color: '#10b981' }],
  },
  {
    kind: 'protein' as const,
    title: 'Protein intake',
    description: 'Compare daily protein intake with your target.',
    method: 'Daily intake shown against your protein target',
    bars: [38, 68, 56, 82, 62, 74, 90],
    target: 65,
    legend: [{ label: 'Protein', color: '#10b981' }, { label: 'Target', color: '#10b981', line: true }],
  },
  {
    kind: 'composition' as const,
    title: 'Fat & muscle change',
    description: 'Follow estimated daily changes for fat and muscle mass.',
    method: 'Fat: energy balance ÷ 7.7 kcal/g · Muscle: net protein after baseline, exercise, and deficit costs',
    fat: '0,25 116,34 233,29 350,42 466,36 583,49 700,44',
    muscle: '0,55 116,48 233,52 350,45 466,50 583,40 700,44',
    legend: [{ label: 'Fat', color: '#fb7185' }, { label: 'Muscle', color: '#38bdf8' }],
  },
];

const cardClass = 'group rounded-2xl border border-slate-800/90 bg-[#0d141e]/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-[#111b26]';

export default function LandingPage() {
  return (
    <div className="relative -mb-32 min-h-screen overflow-hidden bg-[#080e16] text-slate-100" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 left-1/2 h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-emerald-500/[0.09] blur-[120px]" />
        <div className="absolute right-[-15rem] top-[38rem] h-[30rem] w-[30rem] rounded-full bg-teal-500/[0.06] blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-[42rem] bg-[linear-gradient(180deg,rgba(15,36,35,0.44),transparent)]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="Primate Fuel home">
          <Image src="/icon.svg" alt="" width={42} height={42} className="h-10 w-10 rounded-xl" priority />
          <span className="text-base font-extrabold tracking-tight text-white">Primate Fuel</span>
        </Link>
        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            <a href="#features" className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white sm:px-4">Features</a>
            <a href="#about" className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white sm:px-4">About</a>
            <a href="#contact" className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white sm:px-4">Contact</a>
          </nav>
          <Link href="/login" className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.04] hover:text-white sm:px-4">
            Sign in
          </Link>
        </div>
      </header>

      <div className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-12 lg:pb-32 lg:pt-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <Leaf className="h-3.5 w-3.5" /> The Nutrition Atlas
            </div>
            <h1 className="mt-7 text-[2.85rem] font-black leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-[3.85rem] lg:leading-[1.02]">
              Eat well.
              <span className="block bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text pb-[0.12em] text-transparent">Feel your progress.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8 lg:mt-8">
              Log meals, calories, and macros. See how your intake compares with resting needs, workouts, and the energy used to digest food (TEF). Then follow estimated fat and muscle changes—not just the scale.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-extrabold text-slate-950 shadow-xl shadow-emerald-500/15 transition hover:-translate-y-0.5 hover:bg-emerald-300">
                Start tracking your nutrition <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#trends-heading" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/50 px-6 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900">
                Explore the trends
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Meals and macros</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Energy balance and body-composition estimates</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">For data-minded eaters: clear numbers, flexible food, and no guilt.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">
            <div aria-hidden="true" className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-400/15 via-teal-400/[0.04] to-sky-400/10 blur-2xl" />
            <div className="relative rounded-[1.8rem] border border-white/10 bg-[#101923]/95 p-4 shadow-[0_28px_100px_-35px_rgba(16,185,129,0.3)] backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-300">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Nutrition at a glance</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Your food log and active plan</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">Example</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-700/60 bg-slate-950/50 p-4">
                  <div className="flex items-center gap-2 text-slate-400"><Utensils className="h-3.5 w-3.5 text-sky-300" /><span className="text-[11px] font-semibold">Consumed</span></div>
                  <p className="mt-3 text-2xl font-black tracking-tight text-white">1,840 <span className="text-xs font-semibold text-slate-500">kcal</span></p>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-800"><div className="h-full w-[68%] rounded-full bg-sky-400" /></div>
                </div>
                <div className="rounded-2xl border border-slate-700/60 bg-slate-950/50 p-4">
                  <div className="flex items-center gap-2 text-slate-400"><Leaf className="h-3.5 w-3.5 text-emerald-300" /><span className="text-[11px] font-semibold">Protein</span></div>
                  <p className="mt-3 text-2xl font-black tracking-tight text-white">112 <span className="text-xs font-semibold text-slate-500">g today</span></p>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-800"><div className="h-full w-[72%] rounded-full bg-gradient-to-r from-emerald-500 to-lime-300" /></div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-gradient-to-br from-emerald-400/[0.09] to-teal-400/[0.025] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Today</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-emerald-300">3 <span className="text-sm font-bold text-emerald-300/65">meals logged</span></p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-300"><TrendingUp className="h-5 w-5" /></div>
                </div>
                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-slate-950/30 px-3.5 py-3">
                    <div className="flex min-w-0 items-center gap-3"><span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" /><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-500">BREAKFAST</p><p className="truncate text-xs font-semibold text-slate-200">Oats, berries &amp; yogurt</p></div></div>
                    <span className="shrink-0 text-[10px] font-medium text-slate-500">Fiber + protein</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-slate-950/30 px-3.5 py-3">
                    <div className="flex min-w-0 items-center gap-3"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" /><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-500">LUNCH</p><p className="truncate text-xs font-semibold text-slate-200">Greens, grains &amp; tofu</p></div></div>
                    <span className="shrink-0 text-[10px] font-medium text-slate-500">Colorful + filling</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-slate-950/30 px-3.5 py-3">
                    <div className="flex min-w-0 items-center gap-3"><span className="h-2 w-2 shrink-0 rounded-full bg-rose-300" /><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-500">DINNER</p><p className="truncate text-xs font-semibold text-slate-200">A balanced plate, your way</p></div></div>
                    <span className="shrink-0 text-[10px] font-medium text-slate-500">Flexible + satisfying</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] p-4">
                  <p className="text-[10px] font-semibold text-slate-400">BODY FAT CHANGE</p>
                  <p className="mt-2 text-xl font-black tracking-tight text-violet-200">−0.6 <span className="text-xs font-semibold text-violet-200/60">kg</span></p>
                  <p className="mt-1 text-[10px] text-slate-500">Calculated from your plan</p>
                </div>
                <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] p-4">
                  <p className="text-[10px] font-semibold text-slate-400">MUSCLE MASS CHANGE</p>
                  <p className="mt-2 text-xl font-black tracking-tight text-sky-200">+0.2 <span className="text-xs font-semibold text-sky-200/60">kg</span></p>
                  <p className="mt-1 text-[10px] text-slate-500">Calculated from your plan</p>
                </div>
              </div>
              <p className="mt-4 text-center text-[10px] text-slate-600">Example figures. Your dashboard uses your own food log and active plan.</p>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-8 border-y border-white/[0.06] bg-slate-950/35">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Features</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Food logs, active plans, and trends.</h2>
              <p className="mt-4 leading-7 text-slate-400">The key tools for tracking what you eat and following your progress, together in one place.</p>
            </div>
            <div className="mt-10 grid gap-4 md:auto-rows-fr md:grid-cols-3">
              {features.map(({ icon: Icon, title, body, details, color }) => (
                <article key={title} className={cardClass}>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${color}`}><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-4">
                    {details.map((detail) => (
                      <li key={detail} className="flex gap-2.5 text-xs leading-5 text-slate-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="food-body-heading" className="border-b border-white/[0.06] bg-slate-950/20">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Why it matters</p>
              <h2 id="food-body-heading" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">See the impact of everyday choices.</h2>
              <p className="mt-4 leading-7 text-slate-400">Use your food log and plan trends to understand patterns over time, while keeping nutrition flexible and personal.</p>
            </div>
            <div className="mt-9 grid gap-4 md:auto-rows-fr md:grid-cols-3">
              <article className={cardClass}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-300"><Activity className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-bold text-white">Understand your food patterns</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Compare logged calories and macros with energy balance over time. Use the patterns to guide reflection, not as proof that one meal caused a change.</p>
              </article>
              <article className={cardClass}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/10 text-violet-300"><Dumbbell className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-bold text-white">Track more than weight</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Follow estimated fat-mass and muscle-mass changes separately, alongside scale weight, to understand how your plan is progressing.</p>
              </article>
              <article className={cardClass}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-400/10 text-amber-300"><Cookie className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-bold text-white">Make room for real life</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Snacks and favorite foods count too. Log them with your meals to see your full-day totals without labeling foods as good or bad.</p>
              </article>
            </div>
            <p className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] px-5 py-4 text-sm leading-6 text-slate-300">No pass-or-fail food scores. Primate Fuel gives you a clearer view of your habits so you can decide what works for you.</p>
          </div>
        </section>

        <section aria-labelledby="trends-heading" className="border-b border-white/[0.06] bg-gradient-to-b from-emerald-950/15 to-transparent">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Trends</p>
                <h2 id="trends-heading" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Follow your progress over time.</h2>
                <p className="mt-4 leading-7 text-slate-400">Each chart opens to seven days. Scroll horizontally to explore your earlier data.</p>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-xs font-semibold text-emerald-200">Nutrition · Energy · Body composition</span>
            </div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {trendPreviews.map((preview) => (
                <article key={preview.title} className={cardClass}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">{preview.title}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-slate-400">{preview.description}</p>
                    </div>
                    <TrendingUp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-hidden="true">
                    {preview.legend.map((item) => {
                      const line = 'line' in item && item.line;
                      return (
                        <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                          {line ? <span className="w-2.5 border-t border-dashed" style={{ borderColor: item.color }} /> : <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />}
                          {item.label}
                        </span>
                      );
                    })}
                  </div>
                  <div aria-hidden="true" className="relative mt-3 h-20 overflow-hidden rounded-lg border-b border-slate-700/80 px-1">
                    {preview.kind === 'calories' && (
                      <>
                        <div className="absolute inset-x-1 top-[28%] border-t border-dashed border-slate-400/60" />
                        <div className="relative z-10 flex h-full items-end gap-2">
                          {preview.bars.map((day, index) => {
                            const burnTotal = day.resting + day.tef + day.workout;
                            return (
                              <div key={index} className="flex h-full flex-1 items-end justify-center gap-1">
                                <div className="w-[38%] rounded-t-sm bg-[#4e79a7]" style={{ height: `${day.consumed}%` }} />
                                <div className="flex w-[38%] flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: `${burnTotal}%` }}>
                                  <div className="w-full bg-amber-400" style={{ height: `${(day.resting / burnTotal) * 100}%` }} />
                                  <div className="w-full bg-orange-400" style={{ height: `${(day.tef / burnTotal) * 100}%` }} />
                                  <div className="w-full bg-red-400" style={{ height: `${(day.workout / burnTotal) * 100}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {preview.kind === 'deficit' && (
                      <>
                        <div className="absolute inset-x-1 top-1/2 border-t border-slate-500/70" />
                        <div className="relative z-10 flex h-full items-center">
                          {preview.bars.map((value, index) => (
                            <div key={index} className="flex h-full flex-1 items-center justify-center">
                              <div className={`w-1/2 rounded-sm ${value > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ height: `${Math.abs(value) / 2}%`, transform: value > 0 ? 'translateY(-50%)' : 'translateY(50%)' }} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {preview.kind === 'protein' && (
                      <>
                        <div className="absolute inset-x-1 border-t border-dashed border-emerald-400/80" style={{ top: `${100 - preview.target}%` }} />
                        <div className="relative z-10 flex h-full items-end gap-2">
                          {preview.bars.map((height, index) => <div key={index} className="flex-1 rounded-t-sm bg-emerald-500" style={{ height: `${height}%` }} />)}
                        </div>
                      </>
                    )}
                    {preview.kind === 'composition' && (
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 700 80" preserveAspectRatio="none">
                        <path d="M0 20 H700 M0 40 H700 M0 60 H700" stroke="#1e293b" strokeDasharray="4 5" fill="none" />
                        <polyline points={preview.fat} stroke="#fb7185" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <polyline points={preview.muscle} stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    )}
                  </div>
                  <div aria-hidden="true" className="mt-2 flex justify-between px-1 text-[10px] font-medium text-slate-600"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                  <p className="mt-3 border-t border-white/[0.05] pt-3 text-[10px] leading-4 text-slate-500">{preview.method}</p>
                </article>
              ))}
            </div>
            <p className="mt-4 text-center text-[10px] text-slate-600">Chart data shown as an example; your trends use your own logs and plan.</p>
          </div>
        </section>

        <section className="border-t border-white/[0.06] bg-slate-950/25">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 py-20 sm:px-8 md:grid-cols-2 lg:px-12 lg:py-24">
            <article id="about" className={`${cardClass} scroll-mt-8 sm:p-8`}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">About us</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white">About Primate Fuel</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">Created by Pritam Mallick, Primate Fuel brings meal logs, daily energy, and body-composition trends into one clear view. It’s for people who want to understand their habits without turning food into a test. If that sounds like you, come join us and help shape what comes next.</p>
              <Link href="/signup" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-emerald-200">Join Primate Fuel <ArrowRight className="h-4 w-4" /></Link>
            </article>
            <article id="contact" className={`${cardClass} scroll-mt-8 sm:p-8`}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Contact</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Get in touch.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">Questions, feedback, or ideas? We’d be glad to hear from you.</p>
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created by</p>
                <p className="mt-1 text-sm font-bold text-white">Pritam Mallick</p>
                <div className="mt-3 flex flex-col items-start gap-2">
                  <a href="mailto:mallickpritam1407@gmail.com" className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200">mallickpritam1407@gmail.com</a>
                  <a href="https://www.linkedin.com/in/pritammallick20/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold leading-4 text-emerald-300 transition hover:text-emerald-200">
                    <svg aria-hidden="true" className="block h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 .001-4.123 2.062 2.062 0 0 1-.001 4.123zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="leading-4">LinkedIn</span>
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mx-5 mb-16 overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-gradient-to-br from-emerald-400/[0.13] via-[#10211f] to-slate-900 sm:mx-8 lg:mx-auto lg:mb-24 lg:max-w-7xl">
          <div className="relative px-6 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden="true" className="absolute left-1/2 top-0 h-56 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Get started</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Start with your next meal.</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">Track what you eat. Understand what changes.</p>
              <Link href="/signup" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-6 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200">Start tracking <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="relative z-10 border-t border-white/[0.06] px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-bold text-slate-300">
            <Image src="/icon.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" /> Primate Fuel
          </Link>
          <p className="text-xs text-slate-600">A flexible approach to everyday nutrition.</p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500"><Link href="/login" className="hover:text-white">Sign in</Link><Link href="/signup" className="hover:text-white">Create account</Link></div>
        </div>
      </footer>
    </div>
  );
}
