import React, { useEffect, useMemo, useState } from 'react';
import { Check, Filter, ListFilter, Package, PlusCircle, Search, Wrench, X } from 'lucide-react';
import { CatalogItem, EstimateItem } from '../types';
import { formatCurrency } from '../services/exportService';
import { searchCatalogItems } from '../services/smartSearch';
import { formatQuantity, changeQuantity, normalizeQuantity } from '../utils/quantity';

interface CatalogBrowserProps {
  catalogItems: CatalogItem[];
  categories: string[];
  activeEstimateItems: EstimateItem[];
  onAddItem: (item: CatalogItem, quantity: number) => void;
  onOpenCustomModal: () => void;
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  catalogItems,
  categories,
  activeEstimateItems,
  onAddItem,
  onOpenCustomModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number | ''>>({});
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [mobileReplaceNextInput, setMobileReplaceNextInput] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  const estimateQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeEstimateItems) {
      map.set(item.catalogId || item.id, (map.get(item.catalogId || item.id) || 0) + item.quantity);
    }
    return map;
  }, [activeEstimateItems]);

  const filteredItems = useMemo(() => {
    return searchCatalogItems(
      catalogItems,
      searchQuery,
      selectedCategory === 'all' ? undefined : selectedCategory
    );
  }, [catalogItems, selectedCategory, searchQuery]);

  const handleQtyChange = (itemId: string, direction: -1 | 1, step = 0.5) => {
    setItemQuantities((prev) => {
      const current = prev[itemId];
      const cur = typeof current === 'number' && Number.isFinite(current) ? current : 1;
      const next = changeQuantity(cur, direction, step);
      return { ...prev, [itemId]: next };
    });
  };

  const handleManualQtyInput = (itemId: string, valueStr: string) => {
    const normalized = valueStr.replace(',', '.');
    if (normalized.trim() === '') {
      setItemQuantities((prev) => ({ ...prev, [itemId]: '' }));
      return;
    }

    if (!/^\d*\.?\d*$/.test(normalized)) return;

    const val = Number(normalized);
    if (Number.isFinite(val)) {
      setItemQuantities((prev) => ({ ...prev, [itemId]: val }));
    }
  };

  const handleManualQtyBlur = (itemId: string) => {
    setItemQuantities((prev) => {
      const current = prev[itemId];
      if (current === '' || current === undefined || !Number.isFinite(current)) {
        return { ...prev, [itemId]: 1 };
      }
      return { ...prev, [itemId]: normalizeQuantity(current) };
    });
    setMobileReplaceNextInput((prev) => ({ ...prev, [itemId]: false }));
  };

  const handleManualQtyFocus = (itemId: string, input: HTMLInputElement) => {
    const isTouchDevice = typeof window !== 'undefined'
      && (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

    if (isTouchDevice) {
      setMobileReplaceNextInput((prev) => ({ ...prev, [itemId]: true }));
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    input.select();
  };

  const handleManualQtyChange = (itemId: string, valueStr: string) => {
    const shouldReplace = mobileReplaceNextInput[itemId];
    if (shouldReplace) {
      const normalized = valueStr.replace(',', '.');
      const currentValue = itemQuantities[itemId];
      if (typeof currentValue === 'number' && currentValue === 1 && /^1\d*\.?\d*$/.test(normalized)) {
        const replaced = normalized.slice(1);
        if (replaced === '') {
          setMobileReplaceNextInput((prev) => ({ ...prev, [itemId]: false }));
          setItemQuantities((prev) => ({ ...prev, [itemId]: '' }));
          return;
        }
        setMobileReplaceNextInput((prev) => ({ ...prev, [itemId]: false }));
        handleManualQtyInput(itemId, replaced);
        return;
      }
      if (normalized !== '1') {
        setMobileReplaceNextInput((prev) => ({ ...prev, [itemId]: false }));
      }
    }

    handleManualQtyInput(itemId, valueStr);
  };

  const handleAdd = (item: CatalogItem) => {
    const rawQty = itemQuantities[item.id];
    const qty = normalizeQuantity(typeof rawQty === 'number' && Number.isFinite(rawQty) ? rawQty : 1);
    onAddItem(item, qty);
    setItemQuantities((prev) => ({ ...prev, [item.id]: 1 }));
    setMobileReplaceNextInput((prev) => ({ ...prev, [item.id]: false }));

    setRecentlyAddedId(item.id);
    setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === item.id ? null : prev));
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-xs space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap" title="Выбрать раздел каталога">
            <ListFilter className="w-3.5 h-3.5" />
            <span>{selectedCategory === 'all' ? 'Все разделы' : selectedCategory}</span>
          </button>
          <button id="add-custom-item-btn" type="button" onClick={onOpenCustomModal} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0" title="Добавить свою позицию, которой нет в каталоге">
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Своя позиция</span>
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input id="catalog-search-input" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по названию или синонимам (кран, труба, кабель...)" className="w-full rounded-xl bg-slate-950 border border-slate-700/80 pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md" title="Очистить поиск"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[300px]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <Filter className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">Ничего не найдено</p>
            <p className="text-xs text-slate-500 mt-1">Попробуйте другой запрос или добавьте позицию вручную.</p>
            <button type="button" onClick={onOpenCustomModal} className="mt-3 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold transition active:scale-95 cursor-pointer">+ Добавить вручную</button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const rawCurrentQty = itemQuantities[item.id];
            const currentQty = typeof rawCurrentQty === 'number' || rawCurrentQty === '' ? rawCurrentQty : 1;
            const inEstimateQty = estimateQuantities.get(item.id) || 0;
            const isMaterial = item.type === 'material';
            const isJustAdded = recentlyAddedId === item.id;
            return (
              <div key={item.id} className={`rounded-xl border p-3 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${isJustAdded ? 'border-emerald-500/80 bg-emerald-500/10' : inEstimateQty > 0 ? 'bg-slate-800/80 border-slate-700/90 shadow-sm' : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{item.category}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold ${isMaterial ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                      {isMaterial ? <><Package className="w-2.5 h-2.5" /> Материал</> : <><Wrench className="w-2.5 h-2.5" /> Работа</>}
                    </span>
                    {inEstimateQty > 0 && <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-400 font-semibold"><Check className="w-3 h-3" /><span>в смете: {formatQuantity(inEstimateQty)} {item.unit}</span></span>}
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white leading-snug">{item.name}</h3>
                  {item.description && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 flex-shrink-0">
                  <div className="text-left sm:text-right"><div className="text-xs sm:text-sm font-bold text-amber-400 font-mono">{formatCurrency(item.price)}</div><div className="text-[10px] text-slate-400">за 1 {item.unit}</div></div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700 p-0.5">
                      <button type="button" onClick={() => handleQtyChange(item.id, -1, 0.5)} title="Уменьшить" className="w-5 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold active:scale-95 cursor-pointer">-</button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currentQty}
                        onChange={(e) => handleManualQtyChange(item.id, e.target.value)}
                        onFocus={(e) => handleManualQtyFocus(item.id, e.currentTarget)}
                        onBlur={() => handleManualQtyBlur(item.id)}
                        className="w-9 text-center text-xs font-semibold text-white bg-transparent focus:outline-none font-mono"
                        title="Количество (можно дробное: 1.5, 2.5)"
                        aria-label={`Количество: ${item.name}`}
                      />
                      <button type="button" onClick={() => handleQtyChange(item.id, 1, 0.5)} title="Увеличить" className="w-5 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold active:scale-95 cursor-pointer">+</button>
                    </div>
                    <button type="button" onClick={() => handleAdd(item)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap ${isJustAdded ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}`} title="Добавить в смету">{isJustAdded ? '✓ Добавлено' : 'В смету'}</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center"><ListFilter className="w-5 h-5" /></div><div><h2 className="text-lg font-bold text-white">Выберите раздел</h2><p className="text-xs text-slate-400">Фильтр позиций каталога</p></div></div>
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition" aria-label="Закрыть"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              <button type="button" onClick={() => { setSelectedCategory('all'); setIsCategoryModalOpen(false); }} className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${selectedCategory === 'all' ? 'bg-amber-500/15 border-amber-500/60 text-amber-300' : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800'}`}>
                <div><div className="text-sm font-semibold">Все разделы</div><div className="text-[11px] text-slate-400">Все позиции каталога · {catalogItems.length}</div></div>
                {selectedCategory === 'all' && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
              {categories.map((category) => {
                const count = catalogItems.filter((item) => item.category === category).length;
                const isSelected = selectedCategory === category;
                return <button key={category} type="button" onClick={() => { setSelectedCategory(category); setIsCategoryModalOpen(false); }} className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${isSelected ? 'bg-amber-500/15 border-amber-500/60 text-amber-300' : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800'}`}><div className="min-w-0"><div className="text-sm font-semibold truncate">{category}</div><div className="text-[11px] text-slate-400">Позиций: {count}</div></div>{isSelected && <Check className="w-4 h-4 flex-shrink-0" />}</button>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
