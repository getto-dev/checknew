import React, { useState, useMemo } from 'react';
import { Trash2, Edit3, Check, ShoppingBag, Wrench, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { EstimateItem } from '../types';
import { formatCurrency } from '../services/exportService';
import { formatQuantity, changeQuantity, normalizeQuantity } from '../utils/quantity';

interface EstimateTableProps {
  items: EstimateItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onSwitchToCatalog?: () => void;
}

export const EstimateTable: React.FC<EstimateTableProps> = ({
  items,
  onUpdateQuantity,
  onUpdatePrice,
  onDeleteItem,
  onClearAll,
  onSwitchToCatalog,
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const startEditPrice = (item: EstimateItem) => {
    setEditingPriceId(item.id);
    setTempPrice(item.price);
  };

  const savePrice = (itemId: string) => {
    onUpdatePrice(itemId, Math.max(0, tempPrice));
    setEditingPriceId(null);
  };

  const handleStepQuantity = (item: EstimateItem, direction: -1 | 1, step = 0.5) => {
    const nextQty = changeQuantity(item.quantity, direction, step);
    onUpdateQuantity(item.id, nextQty);
  };

  const handleManualQuantityChange = (itemId: string, valStr: string) => {
    const val = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      onUpdateQuantity(itemId, normalizeQuantity(val));
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Смета пока пуста</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          Нажмите «+ В смету» в каталоге слева или добавьте нестандартную позицию вручную.
        </p>
        {onSwitchToCatalog && (
          <button
            onClick={onSwitchToCatalog}
            className="lg:hidden px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold transition active:scale-95 cursor-pointer shadow-md"
          >
            Открыть каталог позиций
          </button>
        )}
      </div>
    );
  }

  // Group items by category cleanly with pre-calculated subtotals and indices
  const categorizedGroups = useMemo(() => {
    const groups: {
      category: string;
      items: { item: EstimateItem; index: number }[];
      sum: number;
    }[] = [];
    const map = new Map<string, { category: string; items: { item: EstimateItem; index: number }[]; sum: number }>();

    items.forEach((item, idx) => {
      const cat = item.category || 'Общие работы';
      let group = map.get(cat);
      if (!group) {
        group = { category: cat, items: [], sum: 0 };
        map.set(cat, group);
        groups.push(group);
      }
      group.items.push({ item, index: idx + 1 });
      group.sum += item.total || Math.round(item.price * item.quantity);
    });

    return groups;
  }, [items]);

  return (
    <div className="flex-1 flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden min-h-0">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">
            Позиции сметы
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
            {items.length}
          </span>
        </div>

        {isConfirmingClear ? (
          <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/40 px-2 py-1 rounded-lg text-xs">
            <span className="text-red-300 font-medium">Очистить всё?</span>
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setIsConfirmingClear(false);
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[11px] transition cursor-pointer active:scale-95"
            >
              Да
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingClear(false)}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer"
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingClear(true)}
            className="text-xs text-slate-400 hover:text-red-400 transition cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-red-500/10"
            title="Удалить все позиции"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить смету</span>
          </button>
        )}
      </div>

      {/* Items Scrollable List categorized */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 pr-2 min-h-0">
        {categorizedGroups.map(({ category: cat, items: catItems, sum: catSum }) => {
          const isCollapsed = !!collapsedCategories[cat];

          return (
            <div key={cat} className="space-y-2 rounded-xl bg-slate-950/40 p-1.5 border border-slate-800/60">
              {/* Category section header with collapse toggle */}
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800 text-xs transition cursor-pointer"
              >
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-left">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{cat}</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({catItems.length})
                  </span>
                </span>
                <span className="font-mono font-semibold text-amber-400/90 text-xs">
                  {formatCurrency(catSum)}
                </span>
              </button>

              {/* Items in this category (if not collapsed) */}
              {!isCollapsed && (
                <div className="space-y-1.5 pt-0.5">
                  {catItems.map(({ item, index: itemIndex }) => {
                    const isEditingPrice = editingPriceId === item.id;
                    const isMaterial = item.type === 'material';

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 sm:p-3 hover:border-slate-700 hover:bg-slate-900 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {/* Left: Index & Name & Badges */}
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                              {itemIndex}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                    isMaterial
                                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {isMaterial ? (
                                    <>
                                      <Package className="w-2.5 h-2.5" /> Материал
                                    </>
                                  ) : (
                                    <>
                                      <Wrench className="w-2.5 h-2.5" /> Работа
                                    </>
                                  )}
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug">
                                {item.name}
                              </h4>
                            </div>
                          </div>

                          {/* Right: Quantity Stepper, Price, Subtotal & Delete */}
                          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 flex-shrink-0">
                            {/* Quantity Stepper */}
                            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 p-0.5">
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(item, -1, 0.5)}
                                title="Уменьшить"
                                className="w-5 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold active:scale-95 cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="text"
                                value={formatQuantity(item.quantity)}
                                onChange={(e) => handleManualQuantityChange(item.id, e.target.value)}
                                className="w-7 text-center text-xs font-semibold text-white bg-transparent focus:outline-none font-mono"
                                title="Количество (можно дробное)"
                              />
                              <button
                                type="button"
                                onClick={() => handleStepQuantity(item, 1, 0.5)}
                                title="Увеличить"
                                className="w-5 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold active:scale-95 cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <span className="text-[10px] text-slate-400 font-medium w-7 text-left">
                              {item.unit}
                            </span>

                            {/* Price (Editable on click) */}
                            <div className="text-right min-w-[70px]">
                              {isEditingPrice ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={tempPrice}
                                    onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
                                    className="w-16 rounded bg-slate-950 border border-amber-500 px-1 py-0.5 text-xs text-white font-mono text-right focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') savePrice(item.id);
                                    }}
                                  />
                                  <button
                                    onClick={() => savePrice(item.id)}
                                    className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditPrice(item)}
                                  className="group/price flex items-center justify-end gap-1 text-xs font-mono text-slate-300 hover:text-amber-400 cursor-pointer text-right w-full"
                                  title="Нажмите, чтобы изменить цену"
                                >
                                  <span>{formatCurrency(item.price)}</span>
                                  <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/price:opacity-100 text-slate-400" />
                                </button>
                              )}
                            </div>

                            {/* Item Total */}
                            <div className="w-20 text-right font-mono font-bold text-xs sm:text-sm text-white">
                              {formatCurrency(item.total)}
                            </div>

                            {/* Delete Item */}
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                              title="Удалить позицию"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
