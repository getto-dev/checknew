import React from 'react';
import { Download, Settings, X } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Настройки</h2>
              <p className="text-xs text-slate-400">Параметры приложения</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Закрыть настройки"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white">Установка приложения</h3>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Установите СметаПро на устройство для запуска как отдельного приложения.
              </p>
              <PWAInstallButton />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
