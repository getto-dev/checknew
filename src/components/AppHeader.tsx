import React from 'react';
import {
  FileSpreadsheet,
  ChevronDown,
  User,
  Share2,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { ProfileMeta } from '../types';

interface AppHeaderProps {
  currentProfile: ProfileMeta;
  customerName?: string;
  onOpenProfileSelector: () => void;
  onOpenCustomerModal: () => void;
  onOpenExportModal: () => void;
  itemCount: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentProfile,
  customerName,
  onOpenProfileSelector,
  onOpenCustomerModal,
  onOpenExportModal,
  itemCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Brand & Profile selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-md shadow-amber-500/10">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>СметаПро</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                  PWA
                </span>
              </h1>
            </div>
          </div>

          {/* Profile Switcher Button */}
          <button
            id="profile-selector-btn"
            onClick={onOpenProfileSelector}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition active:scale-95 cursor-pointer max-w-[150px] sm:max-w-[220px]"
            title="Сменить профиль каталога"
          >
            <span className="truncate font-medium">{currentProfile.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Customer / Project info modal button */}
          <button
            id="customer-info-btn"
            onClick={onOpenCustomerModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition active:scale-95 cursor-pointer"
            title="Заказчик и параметры сметы"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {customerName ? customerName : 'Заказчик'}
            </span>
          </button>

          {/* Export / PDF button */}
          <button
            id="export-pdf-modal-btn"
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-md shadow-amber-500/10 transition active:scale-95 cursor-pointer flex-shrink-0"
            title="Экспорт сметы в PDF или Бэкап"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Экспорт / PDF</span>
            {itemCount > 0 && (
              <span className="hidden md:inline text-[11px] px-1.5 py-0.2 rounded-full bg-slate-950/20 text-slate-950 font-bold ml-0.5">
                {itemCount}
              </span>
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
