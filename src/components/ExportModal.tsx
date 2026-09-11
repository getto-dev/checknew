import React, { useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  Download,
  CheckCircle2,
  FileText,
  Loader2,
  Database,
} from 'lucide-react';
import { Estimate } from '../types';
import {
  exportToHTML,
  importFromFile,
  generateAndDownloadVectorPDF,
} from '../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: Estimate;
  onRestoreEstimate: (restored: Estimate) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  estimate,
  onRestoreEstimate,
}) => {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadVectorPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateAndDownloadVectorPDF(estimate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка генерации PDF';
      alert(`Не удалось сформировать PDF: ${msg}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportBackup = () => {
    exportToHTML(estimate);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const restored = await importFromFile(file);
      onRestoreEstimate(restored);
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка при чтении файла';
      setImportError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-2xl text-slate-100 relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Экспорт и сохранение</h2>
            <p className="text-xs text-slate-400 mt-0.5">Выберите способ выгрузки сметы</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {/* Only 2 Export Options: "Скачать PDF" and "Бэкап" */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Скачать PDF */}
            <div className="rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-950 p-4 flex flex-col justify-between hover:border-amber-400 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center mb-3 font-black shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Скачать PDF
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Официальный документ для отправки заказчику в мессенджерах или печати.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <button
                  onClick={handleDownloadVectorPdf}
                  disabled={isGeneratingPdf}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 text-xs font-bold transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/10 disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Формирование...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Скачать PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Бэкап */}
            <div className="rounded-xl border border-sky-500/30 bg-gradient-to-b from-sky-500/10 to-slate-950 p-4 flex flex-col justify-between hover:border-sky-500/50 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Бэкап
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Автономный файл со сметой и встроенными данными. Открывается в браузере и импортируется обратно.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <button
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 py-2.5 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать Бэкап</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import Section */}
          <div className="pt-3 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Импорт сметы
            </h3>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/60 p-4 text-center cursor-pointer transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.json,text/html,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-amber-400 flex items-center justify-center mx-auto mb-2 transition">
                <UploadCloud className="w-5 h-5" />
              </div>

              <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition">
                Нажмите для выбора файла сметы или бэкапа (.html / .json)
              </div>

              {importSuccess && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Смета успешно импортирована!</span>
                </div>
              )}

              {importError && (
                <div className="mt-2 text-xs text-red-400 font-medium">
                  {importError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
