import React from 'react';
import { Wrench, Zap, Paintbrush, Hammer, ChevronDown, FileDown, WifiOff } from 'lucide-react';
import { ProfileMeta } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  currentProfile: ProfileMeta | null;
  onOpenProfileSelector: () => void;
  onOpenExport: () => void;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Paintbrush: <Paintbrush className="w-4 h-4" />,
  Hammer: <Hammer className="w-4 h-4" />,
};

export const Header: React.FC<HeaderProps> = ({
  currentProfile,
  onOpenProfileSelector,
  onOpenExport,
}) => {
  const isOnline = useOnlineStatus();

  const icon = currentProfile?.icon ? ICONS_MAP[currentProfile.icon] : <Wrench className="w-4 h-4" />;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Profile Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <span className="text-base tracking-tighter">СП</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white tracking-tight">
                  Смета<span className="text-amber-400">Про</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">
                  PWA
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 leading-none">
                Строительные сметы офлайн
              </p>
            </div>
          </div>

          {/* Profile Selector Trigger */}
          <button
            id="profile-switcher-btn"
            onClick={onOpenProfileSelector}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 transition active:scale-95 cursor-pointer shadow-xs"
            title="Сменить профиль каталога (Сантехника, Электрика, Отделка, Строительство)"
          >
            <span className="text-amber-400">{icon}</span>
            <span className="truncate max-w-[100px] sm:max-w-[160px]">
              {currentProfile?.name || 'Профиль'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Right: Actions, PWA install & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Online/Offline status badge */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 border border-slate-800 bg-slate-950"
            title={isOnline ? 'Подключено к сети' : 'Офлайн-режим (IndexedDB)'}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="hidden lg:inline text-slate-300">Онлайн</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="hidden lg:inline text-amber-300">Офлайн</span>
              </>
            )}
          </div>

          {/* Export Button */}
          <button
            id="export-top-btn"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-sm shadow-amber-500/10"
            title="Экспорт в PDF и Бэкап"
          >
            <FileDown className="w-4 h-4" />
            <span>Экспорт</span>
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
