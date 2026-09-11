import React from 'react';
import {
  FileText,
  Percent,
  Download,
  Receipt,
  User,
} from 'lucide-react';
import { formatCurrency } from '../services/exportService';
import { EstimateTotals } from '../hooks/useEstimate';

interface EstimateSummaryBarProps {
  totals: EstimateTotals;
  discount: number;
  onDiscountChange: (discount: number) => void;
  onOpenCustomerModal: () => void;
  onOpenExportModal: () => void;
  customerName?: string;
  projectName?: string;
}

export const EstimateSummaryBar: React.FC<EstimateSummaryBarProps> = ({
  totals,
  discount,
  onDiscountChange,
  onOpenCustomerModal,
  onOpenExportModal,
  customerName,
  projectName,
}) => {
  const {
    servicesSum,
    productsSum,
    discountAmount,
    grandTotal,
    totalCount,
    workCount,
    materialCount,
  } = totals;

  return (
    <footer className="sticky bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-2xl p-3 sm:p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Detailed Breakdown & Discount */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          {/* Item counts */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Позиций:</span>
            <span className="font-bold text-white font-mono">{totalCount}</span>
            <span className="text-slate-500 text-[11px]">
              ({workCount} раб. / {materialCount} мат.)
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Subtotals */}
          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-400 mr-1.5">Работы:</span>
              <span className="font-semibold text-slate-200 font-mono">
                {formatCurrency(servicesSum)}
              </span>
            </div>
            {productsSum > 0 && (
              <div>
                <span className="text-slate-400 mr-1.5">Материалы:</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {formatCurrency(productsSum)}
                </span>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Discount control */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
            <Percent className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] text-slate-400">Скидка:</span>
            <input
              id="discount-input"
              type="number"
              min="0"
              max="100"
              value={discount || ''}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-10 text-center text-xs font-bold text-amber-400 bg-transparent focus:outline-none font-mono"
            />
            <span className="text-xs text-amber-400 font-bold">%</span>
            {discountAmount > 0 && (
              <span className="text-[10px] text-slate-400 ml-1 font-mono">
                (-{formatCurrency(discountAmount)})
              </span>
            )}
          </div>
        </div>

        {/* Right: Grand Total & Export CTA */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          {/* Grand total label & value */}
          <div className="text-left md:text-right">
            <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Итого к оплате
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-400 font-mono leading-none mt-0.5">
              {formatCurrency(grandTotal)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              id="summary-customer-btn"
              onClick={onOpenCustomerModal}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Заполнить данные клиента / объекта"
            >
              <User className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">
                {customerName || projectName ? 'Данные сметы' : 'Параметры'}
              </span>
            </button>

            <button
              id="summary-export-btn"
              onClick={onOpenExportModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer flex items-center gap-2"
              title="Сформировать PDF документ или скачать файл"
            >
              <Download className="w-4 h-4" />
              <span>Скачать PDF</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
