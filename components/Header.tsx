'use client';

import React from 'react';
import { Database, RefreshCw, LogOut } from 'lucide-react';

interface HeaderProps {
  isLive: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({ isLive, onRefresh, isLoading, userName }) => {
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
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isLive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <Database className="w-3 h-3" />
          <span>{isLive ? 'Google Sheets' : 'Local / Demo'}</span>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.assign('/login');
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
