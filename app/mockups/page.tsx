import Image from 'next/image';

const concepts = [
  {
    number: '01',
    name: 'Floating Mark',
    description: 'A quiet, premium launch moment with the logo floating directly on the app background.',
    className: 'bg-[#090d16]',
    art: (
      <>
        <div className="absolute h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <Image src="/logo-mark.svg" alt="" width={112} height={112} className="relative h-28 w-28" />
      </>
    ),
  },
  {
    number: '02',
    name: 'Soft Orb',
    description: 'A luminous circular glow gives the logo focus without introducing a hard-edged container.',
    className: 'bg-[#07141a]',
    art: (
      <div className="relative flex h-60 w-60 items-center justify-center rounded-full bg-[radial-gradient(ellipse_at_center,rgba(94,234,212,.22),rgba(16,185,129,.08)_34%,rgba(16,185,129,.025)_58%,transparent_78%)]">
        <div className="absolute inset-0 rounded-full bg-emerald-400/[.035] blur-3xl" />
        <Image src="/logo-mark.svg" alt="" width={112} height={112} className="relative h-28 w-28" />
      </div>
    ),
  },
  {
    number: '03',
    name: 'Organic Bloom',
    description: 'Layered organic shapes make the opening feel more expressive and connected to the brand.',
    className: 'bg-[#0b111d]',
    art: (
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div className="absolute h-40 w-32 rotate-[-18deg] rounded-[48%_52%_42%_58%] bg-emerald-500/20 blur-sm" />
        <div className="absolute h-40 w-32 rotate-[22deg] rounded-[58%_42%_56%_44%] bg-teal-300/10 blur-sm" />
        <div className="absolute h-32 w-32 rounded-[44%_56%_48%_52%] bg-emerald-400/[.08] shadow-[0_0_50px_rgba(45,212,191,.18)]" />
        <Image src="/logo-mark.svg" alt="" width={104} height={104} className="relative h-[104px] w-[104px]" />
      </div>
    ),
  },
];

export default function MockupsPage() {
  return (
    <main className="min-h-screen bg-[#05080f] px-5 py-10 text-slate-100 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Startup splash concepts</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Three ways to open Primate Fuel.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            These are real rendered UI concepts for the brief screen shown while the app opens. The existing dashboard and header are not changed.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {concepts.map((concept) => (
            <article key={concept.number} className="flex flex-col">
              <div className={`relative mx-auto flex h-[520px] w-full max-w-[300px] flex-col items-center justify-between overflow-hidden rounded-[2rem] border border-white/[.08] px-7 py-10 shadow-2xl ${concept.className}`}>
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[.04] to-transparent" />
                <div className="relative flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span>Primate</span>
                  <span>9:41</span>
                </div>
                <div className="relative flex flex-1 flex-col items-center justify-center">
                  {concept.art}
                  <p className="mt-8 text-center text-lg font-semibold tracking-tight text-white">Primate Fuel</p>
                  <p className="mt-2 text-center text-[11px] text-slate-500">Fuel your best day</p>
                </div>
                <div className="relative flex flex-col items-center gap-3">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-2/3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] text-slate-500">Preparing your plan…</span>
                </div>
              </div>
              <div className="mx-auto mt-5 w-full max-w-[300px]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Concept {concept.number}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{concept.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{concept.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
