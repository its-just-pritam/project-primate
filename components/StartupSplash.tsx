import Image from 'next/image';

export const StartupSplash: React.FC = () => (
  <main
    role="status"
    aria-live="polite"
    aria-label="Opening Primate Fuel"
    className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-[#07141a] px-8"
  >
    <div className="absolute h-72 w-72 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(94,234,212,.22),rgba(16,185,129,.08)_34%,rgba(16,185,129,.025)_58%,transparent_78%)]" />
    <div className="absolute h-56 w-56 rounded-full bg-emerald-400/[.035] blur-3xl" />
    <div className="relative flex flex-col items-center">
      <Image
        src="/logo-mark.svg"
        alt="Primate Fuel"
        width={112}
        height={112}
        priority
        className="h-28 w-28"
      />
      <p className="mt-8 text-lg font-semibold tracking-tight text-white">Primate Fuel</p>
      <p className="mt-2 text-[11px] text-slate-500">Fuel your best day</p>
    </div>
    <div className="absolute bottom-12 flex flex-col items-center gap-3">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-400" />
      </div>
      <span className="text-[10px] text-slate-500">Preparing your plan…</span>
    </div>
  </main>
);
