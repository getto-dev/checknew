import React, { useMemo, useState } from 'react';
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
  const [tempPrice, setTempPrice] = useState(0);
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const categorizedGroups = useMemo(() => {
    const map = new Map<string, { category: string; items: { item: EstimateItem; index: number }[]; sum: number }>();
    items.forEach((item, idx) => {
      const category = item.category || 'Общие работы';
      let group = map.get(category);
      if (!group) {
        group = { category, items: [], sum: 0 };
        map.set(category, group);
      }
      group.items.push({ item, index: idx + 1 });
      group.sum += Number.isFinite(item.total) ? item.total : Math.round(item.price * item.quantity);
    });
    return Array.from(map.values());
  }, [items]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const startEditPrice = (item: EstimateItem) => {
    setEditingPriceId(item.id);
    setTempPrice(item.price);
  };

  const savePrice = (itemId: string) => {
    onUpdatePrice(itemId, Math.max(0, tempPrice));
    setEditingPriceId(null);
  };

  const startEditQuantity = (item: EstimateItem) => {
    setEditingQuantityId(item.id);
    setTempQuantity(String(item.quantity));
  };

  const saveQuantity = (itemId: string, fallback: number) => {
    const parsed = parseFloat(tempQuantity.replace(',', '.'));
    const next = Number.isFinite(parsed) && parsed > 0 ? normalizeQuantity(parsed) : fallback;
    onUpdateQuantity(itemId, next);
    setEditingQuantityId(null);
    setTempQuantity('');
  };

  const handleStepQuantity = (item: EstimateItem, direction: -1 | 1) => {
    onUpdateQuantity(item.id, changeQuantity(item.quantity, direction, 0.5));
  };

  const handleManualQuantityChange = (item: EstimateItem, value: string) => {
    setEditingQuantityId(item.id);
    setTempQuantity(value);
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500 mb-3">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Смета пока пуста</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">Нажмите «В смету» в каталоге слева или добавьте нестандартную позицию вручную.</p>
        {onSwitchToCatalog && (
          <button type="button" onClick={onSwitchToCatalog} className="lg:hidden px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-md">
            Открыть каталог позиций
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden min-h-0">
      <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">Позиции сметы</h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">{items.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 pr-2 min-h-0">
        {categorizedGroups.map(({ category, items: categoryItems, sum }) => {
          const collapsed = Boolean(collapsedCategories[category]);
          return (
            <div key={category} className="space-y-2 rounded-xl bg-slate-950/40 p-1.5 border border-slate-800/60">
              <button type="button" onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 text-left">
                  {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{category}</span>
                  <span className="text-[11px] text-slate-400 font-normal">({categoryItems.length})</span>
                </span>
                <span className="font-mono font-semibold text-amber-400/90 text-xs">{formatCurrency(sum)}</span>
              </button>

              {!collapsed && (
                <div className="space-y-1.5 pt-0.5">
                  {categoryItems.map(({ item, index }) => {
                    const isEditingPrice = editingPriceId === item.id;
                    const isEditingQuantity = editingQuantityId === item.id;
                    const isMaterial = item.type === 'material';
                    return (
                      <div key={item.id} className="group relative rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 sm:p-3 hover:border-slate-700 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono font-medium flex items-center justify-center flex-shrink-0 mt-0.5">{index}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${isMaterial ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                                  {isMaterial ? <><Package className="w-2.5 h-2.5" /> Материал</> : <><Wrench className="w-2.5 h-2.5" /> Работа</>}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug">{item.name}</h4>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 flex-shrink-0">
                            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-700 p-0.5">
                              <button type="button" onClick={() => handleStepQuantity(item, -1)} title="Уменьшить" className="w-5 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded text-xs font-bold">-</button>
                              <input
                                type="text"
                                value={isEditingQuantity ? tempQuantity : formatQuantity(item.quantity)}
                                onFocus={() => startEditQuantity(item)}
                                onChange={(e) => handleManualQuantityChange(item, e.target.value)}
                                onBlur={() => saveQuantity(item.id, item.quantity)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveQuantity(item.id, item.quantity); } }}
                                className="w-9 text-center text-xs font-semibold text-white bg-transparent focus:outline-none font-mono"
                                title="Количество"
                                inputMode="decimal"
                              />
                              <button type="button" onClick={() => handleStepQuantity(item, 1)} title="Увеличить" className="w-5 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded text-xs font-bold">+</button>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium w-7 text-left">{item.unit}</span>

                            <div className="text-right min-w-[70px]">
                              {isEditingPrice ? (
                                <div className="flex items-center gap-1">
                                  <input type="number" min="0" value={tempPrice} onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)} className="w-16 rounded bg-slate-950 border border-amber-500 px-1 py-0.5 text-xs text-white font-mono text-right focus:outline-none" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') savePrice(item.id); }} />
                                  <button type="button" onClick={() => savePrice(item.id)} className="p-1 rounded bg-amber-500 text-slate-950"><Check className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => startEditPrice(item)} className="flex items-center justify-end gap-1 text-xs font-mono text-slate-300 hover:text-amber-400 w-full" title="Нажмите, чтобы изменить цену">
                                  <span>{formatCurrency(item.price)}</span><Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <div className="w-20 text-right font-mono font-bold text-xs sm:text-sm text-white">{formatCurrency(item.total)}</div>
                            <button type="button" onClick={() => onDeleteItem(item.id)} className="p-1 text-slate-500 hover:text-red-400 rounded-lg" title="Удалить позицию"><Trash2 className="w-3.5 h-3.5" /></button>
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
