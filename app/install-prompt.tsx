'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!installEvent) return null;

  const install = async () => {
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      // The browser owns the install flow and may close it before completion.
    } finally {
      setInstallEvent(null);
    }
  };

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-300/20 bg-[#101923]/95 p-3.5 shadow-[0_16px_60px_-18px_rgba(0,0,0,0.75)] backdrop-blur-xl" aria-label="Install Platito">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300">
        <Download className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Install Platito</p>
        <p className="text-xs text-slate-400">Add the app to your device for quick access.</p>
      </div>
      <button type="button" onClick={install} className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
        Install
      </button>
      <button type="button" onClick={() => setInstallEvent(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300" aria-label="Dismiss install prompt">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
