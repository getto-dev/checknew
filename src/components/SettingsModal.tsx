import React, { useState } from 'react';
import { Download, Settings, X, Share2, ExternalLink, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!isOpen) return null;

  const handleInstall = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    if (isIOS && !isInstalled) {
      setShowIOSGuide(true);
    }
  };

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

        <section>
          <button
            type="button"
            onClick={handleInstall}
            disabled={isInstalled}
            className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-amber-500/50 hover:bg-slate-900 transition disabled:cursor-default disabled:hover:border-slate-800"
            aria-label="Установить приложение"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white">Установка приложения</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isInstalled
                    ? 'Приложение уже установлено на устройстве.'
                    : isIOS
                      ? 'Откройте меню «Поделиться» в Safari и добавьте приложение на экран «Домой».'
                      : isInstallable
                        ? 'Установите СметаПро на устройство для запуска как отдельного приложения.'
                        : 'Нажмите, чтобы установить приложение, когда браузер предоставит возможность установки.'}
                </p>
                {!isInstalled && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{isIOS ? 'Показать инструкцию' : 'Установить приложение'}</span>
                  </div>
                )}
              </div>
            </div>
          </button>
        </section>

        <a
          href="https://t.me/gettocode"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/10 hover:border-sky-500/40 transition"
        >
          <span>Связаться в Telegram</span>
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        </a>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-2xl text-slate-100 relative max-h-[calc(100dvh-24px)] overflow-y-auto">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-4 pr-8">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Установка на iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Добавление СметаПро на экран «Домой»</p>
                </div>
              </div>
              <ol className="space-y-3 text-sm text-slate-300 mb-6 pl-1">
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-semibold text-xs flex items-center justify-center">1</span><span>Нажмите <strong className="text-white inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-sky-400" /> Поделиться</strong> в Safari.</span></li>
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-semibold text-xs flex items-center justify-center">2</span><span>Выберите <strong className="text-white">«На экран “Домой”»</strong>.</span></li>
                <li className="flex items-start gap-2.5"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-semibold text-xs flex items-center justify-center">3</span><span>Нажмите <strong className="text-white">«Добавить»</strong>.</span></li>
              </ol>
              <button type="button" onClick={() => setShowIOSGuide(false)} className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-semibold text-white transition">Понятно</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
