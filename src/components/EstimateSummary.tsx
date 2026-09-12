import React, { useState } from 'react';
import { Percent, FileDown, Settings, Download, Wrench, Package, Loader2, Trash2 } from 'lucide-react';
import { Estimate, EstimateItem } from '../types';
import { formatCurrency, generateAndDownloadVectorPDF } from '../services/exportService';

interface EstimateSummaryProps {
  items: EstimateItem[];
  discount: number;
  onUpdateDiscount: (discount: number) => void;
  subtotal: number;
  total: number;
  estimate: Estimate;
  onOpenCustomerInfo: () => void;
  onOpenExportModal: () => void;
  onClearAll: () => void;
}

const DISCOUNT_PRESETS = [0, 5, 10, 15];

export const EstimateSummary: React.FC<EstimateSummaryProps> = ({
  items,
  discount,
  onUpdateDiscount,
  subtotal,
  total,
  estimate,
  onOpenCustomerInfo,
  onOpenExportModal,
  onClearAll,
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const servicesSum = items
    .filter((i) => i.type === 'work' || !i.type)
    .reduce((acc, i) => acc + i.total, 0);
  const materialsSum = items
    .filter((i) => i.type === 'material')
    .reduce((acc, i) => acc + i.total, 0);
  const discountAmount = Math.round((servicesSum * discount) / 100);

  const handleFastDownloadPdf = async () => {
    if (items.length === 0) {
      alert('Смета пока пуста. Добавьте хотя бы одну позицию.');
      return;
    }
    try {
      setIsDownloadingPdf(true);
      await generateAndDownloadVectorPDF(estimate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка генерации PDF';
      alert(`Не удалось сформировать PDF файл: ${msg}. Открываем окно экспорта.`);
      onOpenExportModal();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-4 shadow-xl flex-shrink-0 space-y-3">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3 rounded-xl border border-amber-500/30">
        <div>
          <div className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider">Итого к оплате</div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">{formatCurrency(total)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-400">
            {items.length} {items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'}
          </div>
          {discount > 0 && (
            <div className="text-[11px] text-emerald-400 font-semibold font-mono">
              скидка {discount}% (-{formatCurrency(discountAmount)})
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
          <span className="flex items-center gap-1 text-amber-300 text-[11px] font-medium truncate"><Wrench className="w-3 h-3 text-amber-400 flex-shrink-0" /><span>Работы:</span></span>
          <span className="font-mono font-bold text-white text-xs">{formatCurrency(servicesSum)}</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
          <span className="flex items-center gap-1 text-sky-300 text-[11px] font-medium truncate"><Package className="w-3 h-3 text-sky-400 flex-shrink-0" /><span>Материалы:</span></span>
          <span className="font-mono font-bold text-white text-xs">{formatCurrency(materialsSum)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-1 text-slate-400 font-medium"><Percent className="w-3.5 h-3.5 text-amber-400" /><span>Скидка:</span></div>
        <div className="flex items-center gap-1">
          {DISCOUNT_PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => onUpdateDiscount(p)} className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${discount === p ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}>{p}%</button>
          ))}
          <div className="flex items-center ml-1">
            <input type="number" min="0" max="100" value={discount} onChange={(e) => { const val = parseFloat(e.target.value) || 0; onUpdateDiscount(Math.max(0, Math.min(100, val))); }} className="w-10 rounded bg-slate-900 border border-slate-700 px-1 py-0.5 text-[11px] text-white font-mono font-bold text-center focus:outline-none focus:border-amber-500" />
            <span className="text-[11px] text-slate-400 ml-0.5">%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate max-w-[210px]">
          <Settings className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="truncate">{estimate.address || estimate.customer ? <span className="text-slate-200 font-medium">{estimate.address || estimate.customer}</span> : <span className="text-slate-500">Объект / Заказчик не указаны</span>}</span>
        </div>
        <button type="button" onClick={onOpenCustomerInfo} className="text-amber-400 hover:text-amber-300 text-[11px] font-bold transition cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-800 flex-shrink-0">{estimate.address || estimate.customer ? 'Изменить' : '+ Указать'}</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-0.5">
        <button onClick={handleFastDownloadPdf} disabled={isDownloadingPdf || items.length === 0} className="sm:col-span-5 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-950 transition active:scale-95 shadow-md shadow-amber-500/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" title="Скачать официальный PDF-бланк для отправки заказчику">
          {isDownloadingPdf ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Формирование...</span></> : <><Download className="w-4 h-4" /><span>Скачать PDF</span></>}
        </button>
        <button onClick={onOpenExportModal} className="sm:col-span-4 flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-slate-800/90 hover:bg-slate-700 py-2.5 px-2 text-xs font-semibold text-sky-400 transition active:scale-95 cursor-pointer" title="Создать файл Бэкапа или импортировать смету">
          <FileDown className="w-3.5 h-3.5" /><span>Бэкап / Экспорт</span>
        </button>
        {isConfirmingClear ? (
          <div className="sm:col-span-3 flex items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-2 py-1.5">
            <button type="button" onClick={() => { onClearAll(); setIsConfirmingClear(false); }} className="flex-1 rounded-lg bg-red-500 text-white py-1.5 text-xs font-bold">Да</button>
            <button type="button" onClick={() => setIsConfirmingClear(false)} className="flex-1 rounded-lg bg-slate-800 text-slate-300 py-1.5 text-xs font-semibold">Нет</button>
          </div>
        ) : (
          <button type="button" onClick={() => setIsConfirmingClear(true)} className="sm:col-span-3 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-slate-800/90 hover:bg-red-500/10 hover:border-red-500/50 py-2.5 px-2 text-xs font-semibold text-red-300 transition active:scale-95 cursor-pointer" title="Очистить все позиции сметы">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить смету</span>
          </button>
        )}
      </div>
    </div>
  );
};
