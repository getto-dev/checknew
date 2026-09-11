import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, CheckCircle, X, Sparkles } from 'lucide-react';

const DISMISS_KEY = 'smeta_pwa_ios_dismissed_at';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const IOSInstallBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if dismissed recently
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0');
      if (dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION) {
        return;
      }
    } catch {
      // ignore storage access errors
    }

    // Check if running standalone already
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Check if iOS Safari
    const ua = window.navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
    const isSafari =
      /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Firefox/.test(ua);

    if (isIOS && isSafari) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      id="ios-pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/50 p-4 transition-all animate-in fade-in slide-in-from-bottom-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            S
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Установить Smeta на iPhone
              </h3>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <Sparkles className="w-3 h-3" /> PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Работает быстро и офлайн прямо на объекте
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full mt-3 py-2 px-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Share className="w-3.5 h-3.5 text-amber-600" />
          Показать как добавить на экран «Домой»
        </button>
      ) : (
        <div className="mt-3 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs text-slate-700 dark:text-slate-200">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center shrink-0">
              <Share className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Шаг 1:</span> Нажмите кнопку{' '}
              <strong className="text-sky-600 dark:text-sky-400">«Поделиться»</strong> в нижней панели Safari.
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs text-slate-700 dark:text-slate-200">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center shrink-0">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Шаг 2:</span> Прокрутите и выберите{' '}
              <strong className="text-amber-600 dark:text-amber-400">«На экран "Домой"»</strong>.
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs text-slate-700 dark:text-slate-200">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Шаг 3:</span> Нажмите{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">«Добавить»</strong> в правом верхнем углу.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
