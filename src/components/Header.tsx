import React from 'react';
import { Wrench, Zap, Paintbrush, Hammer, ChevronDown, Settings, Wifi, WifiOff } from 'lucide-react';
import { ProfileMeta } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  currentProfile: ProfileMeta | null;
  onOpenProfileSelector: () => void;
  onOpenSettings: () => void;
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
  onOpenSettings,
}) => {
  const isOnline = useOnlineStatus();
  const icon = currentProfile?.icon ? ICONS_MAP[currentProfile.icon] : <Wrench className="w-4 h-4" />;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 flex-shrink-0">
              <span className="text-base tracking-tighter">СП</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white tracking-tight truncate">Смета<span className="text-amber-400">Про</span></span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 leading-none">Строительные сметы офлайн</p>
            </div>
          </div>

          <button
            id="profile-switcher-btn"
            type="button"
            onClick={onOpenProfileSelector}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 transition active:scale-95 cursor-pointer shadow-xs min-w-0 max-w-[42vw] sm:max-w-[260px]"
            title="Сменить профиль каталога"
            aria-label="Сменить профиль каталога"
          >
            <span className="text-amber-400 flex-shrink-0">{icon}</span>
            <span className="truncate">{currentProfile?.name || 'Профиль'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-amber-500/10 border-amber-500/25'}`}
            title={isOnline ? 'Онлайн-режим' : 'Офлайн-режим'}
            aria-label={isOnline ? 'Онлайн-режим' : 'Офлайн-режим'}
          >
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
          </div>

          <button
            id="settings-top-btn"
            type="button"
            onClick={onOpenSettings}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Настройки"
            aria-label="Настройки"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
