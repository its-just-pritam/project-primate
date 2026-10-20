'use client';

import React from 'react';
import { Share, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  onExport: () => void;
  isLoading: boolean;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, onExport, isLoading, userName }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-2.5 text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="Primate Fuel" className="w-8 h-8 rounded-xl shadow-lg shadow-emerald-500/20" />
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            Primate Fuel
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">{userName || 'Pritam Mallick'}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onExport}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
          title="Draft and export report"
          aria-label="Draft and export report"
        >
          <Share className="h-4 w-4" />
        </button>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-slate-300 transition-colors hover:text-white disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
