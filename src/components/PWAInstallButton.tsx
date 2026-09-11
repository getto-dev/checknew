import React, { useState } from 'react';
import { Download, Share2, X, CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-sm transition active:scale-95 cursor-pointer"
        title="Установить приложение на устройство"
      >
        <Download className="w-4 h-4" />
        <span className="hidden xs:inline">Установить PWA</span>
        <span className="xs:hidden">Установить</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-btn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer"
          title="Инструкция по установке на iPhone/iPad"
        >
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>На экран Домой</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Установка на iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Работает без интернета как нативное приложение</p>
                </div>
              </div>

              <ol className="space-y-3 text-sm text-slate-300 mb-6 pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-semibold text-xs flex items-center justify-center">1</span>
                  <span>
                    Нажмите кнопку <strong className="text-white inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline text-sky-400" /> Поделиться</strong> в нижней панели Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-semibold text-xs flex items-center justify-center">2</span>
                  <span>
                    Прокрутите список вниз и выберите <strong className="text-white">«На экран "Домой"»</strong> (Add to Home Screen).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-400 font-semibold text-xs flex items-center justify-center">3</span>
                  <span>
                    Нажмите <strong className="text-white">«Добавить»</strong> в правом верхнем углу.
                  </span>
                </li>
              </ol>

              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-xs text-emerald-400 mb-4">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Иконка СметаПро появится на вашем рабочем столе и будет запускаться мгновенно!</span>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-semibold text-white transition"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
