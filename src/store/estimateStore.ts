import { create } from 'zustand';
import { Estimate, EstimateItem, CatalogItem } from '../types';
import { storage } from '../services/storage';
import { normalizeQuantity } from '../utils/quantity';
import { createId } from '../utils/id';
import { isValidEstimate, MAX_ESTIMATE_ITEMS } from '../utils/validation';

export function calculateEstimateTotals(items: EstimateItem[], discountPercent: number) {
  let servicesSum = 0;
  let productsSum = 0;
  let workCount = 0;
  let materialCount = 0;

  for (const item of items) {
    const isMaterial = item.type === 'material';
    const itemTotal = Number.isFinite(item.total) ? item.total : Math.round(item.price * item.quantity);
    if (isMaterial) {
      productsSum += itemTotal;
      materialCount++;
    } else {
      servicesSum += itemTotal;
      workCount++;
    }
  }

  const subtotal = servicesSum + productsSum;
  const clampedDiscount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const discountAmount = Math.round((servicesSum * clampedDiscount) / 100);
  const grandTotal = Math.max(0, servicesSum - discountAmount + productsSum);

  return {
    subtotal,
    servicesSum,
    productsSum,
    discountPercent: clampedDiscount,
    discountAmount,
    grandTotal,
    totalCount: items.length,
    workCount,
    materialCount,
  };
}

export type EstimateTotals = ReturnType<typeof calculateEstimateTotals>;

const createDefaultEstimate = (profileId = 'plumbing', profileName = 'Сантехника'): Estimate => {
  const currentDate = new Date().toISOString().split('T')[0];
  const now = Date.now();
  return {
    id: createId('est'),
    title: '', customer: '', companyName: '', date: currentDate, phone: '', address: '', notes: '',
    profileId, profileName, items: [], discount: 0,
    subtotal: 0, servicesSubtotal: 0, materialsSubtotal: 0, total: 0,
    createdAt: now, updatedAt: now,
  };
};

type EstimateStore = {
  estimate: Estimate;
  isLoaded: boolean;
  totals: EstimateTotals;
  initialize: (profileId?: string, profileName?: string) => Promise<void>;
  addItem: (item: CatalogItem | Omit<EstimateItem, 'id' | 'total'>, quantity?: number) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  updateItemPrice: (id: string, price: number) => void;
  deleteItem: (id: string) => void;
  clearEstimate: () => void;
  updateDiscount: (discount: number) => void;
  createNewEstimate: (profileId?: string, profileName?: string) => Promise<void>;
  updateMetadata: (metadata: Partial<Estimate>) => void;
  restoreEstimate: (restored: Estimate) => Promise<void>;
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let initializationPromise: Promise<void> | null = null;

const persistEstimate = (updated: Estimate) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    try {
      await storage.saveEstimate(updated);
      storage.setActiveEstimateId(updated.id);
    } catch (err) {
      console.error('Failed to auto-save estimate:', err);
    }
  }, 250);
};

const cancelPendingSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
};

export const useEstimateStore = create<EstimateStore>((set, get) => ({
  estimate: createDefaultEstimate(),
  isLoaded: false,
  totals: calculateEstimateTotals([], 0),

  initialize: async (currentProfileId = 'plumbing', currentProfileName = 'Сантехника') => {
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      try {
        const activeEstId = storage.getActiveEstimateId();
        let loaded: Estimate | null = activeEstId ? await storage.getEstimate(activeEstId) : null;

        if (!loaded) {
          const allEstimates = await storage.getAllEstimates();
          if (allEstimates.length > 0) loaded = allEstimates[0];
        }

        if (loaded && isValidEstimate(loaded)) {
          const totals = calculateEstimateTotals(loaded.items, loaded.discount || 0);
          const validated: Estimate = {
            ...loaded,
            subtotal: totals.subtotal,
            servicesSubtotal: totals.servicesSum,
            materialsSubtotal: totals.productsSum,
            total: totals.grandTotal,
            discount: totals.discountPercent,
          };
          set({ estimate: validated, totals, isLoaded: true });
          storage.setActiveEstimateId(validated.id);
        } else {
          const initial = createDefaultEstimate(currentProfileId, currentProfileName);
          await storage.saveEstimate(initial);
          storage.setActiveEstimateId(initial.id);
          set({ estimate: initial, totals: calculateEstimateTotals([], 0), isLoaded: true });
        }
      } catch (err) {
        console.error('Failed to load estimate from storage:', err);
        set((state) => ({
          estimate: state.estimate,
          totals: calculateEstimateTotals(state.estimate.items, state.estimate.discount),
          isLoaded: true,
        }));
      }
    })();

    await initializationPromise;
  },

  addItem: (item, quantity = 1) => {
    const validQty = normalizeQuantity(quantity);
    const safeName = String(item.name || '').trim().slice(0, 300) || 'Позиция без названия';
    const safeCategory = String(item.category || '').trim().slice(0, 200) || 'Общие работы';
    const safeUnit = String(item.unit || '').trim().slice(0, 50) || 'шт';
    const safeDescription = item.description ? String(item.description).slice(0, 500) : undefined;
    const safePrice = Number.isFinite(Number(item.price)) && Number(item.price) >= 0 ? Number(item.price) : 0;

    set((state) => {
      if (state.estimate.items.length >= MAX_ESTIMATE_ITEMS) return state;

      const catalogId = 'id' in item ? item.id : undefined;
      const existingIdx = state.estimate.items.findIndex((entry) =>
        (catalogId && entry.catalogId === catalogId) ||
        (!catalogId && entry.name === safeName && entry.unit === safeUnit)
      );

      let updatedItems: EstimateItem[];
      if (existingIdx !== -1) {
        updatedItems = state.estimate.items.map((entry, index) => {
          if (index !== existingIdx) return entry;
          const nextQty = normalizeQuantity(entry.quantity + validQty);
          return { ...entry, quantity: nextQty, total: Math.round(entry.price * nextQty) };
        });
      } else {
        updatedItems = [...state.estimate.items, {
          id: createId('item'), catalogId, name: safeName, description: safeDescription,
          category: safeCategory, unit: safeUnit, price: safePrice, quantity: validQty,
          total: Math.round(safePrice * validQty), type: item.type || 'work',
        }];
      }

      const totals = calculateEstimateTotals(updatedItems, state.estimate.discount);
      const updated = {
        ...state.estimate,
        items: updatedItems,
        subtotal: totals.subtotal,
        servicesSubtotal: totals.servicesSum,
        materialsSubtotal: totals.productsSum,
        total: totals.grandTotal,
        updatedAt: Date.now(),
      };
      persistEstimate(updated);
      return { estimate: updated, totals };
    });
  },

  updateItemQuantity: (id, newQty) => {
    set((state) => {
      const updatedItems = newQty <= 0
        ? state.estimate.items.filter((item) => item.id !== id)
        : state.estimate.items.map((item) => item.id === id
          ? { ...item, quantity: normalizeQuantity(Number.isFinite(newQty) ? newQty : 1), total: Math.round(item.price * normalizeQuantity(Number.isFinite(newQty) ? newQty : 1)) }
          : item);
      const totals = calculateEstimateTotals(updatedItems, state.estimate.discount);
      const updated = { ...state.estimate, items: updatedItems, subtotal: totals.subtotal, servicesSubtotal: totals.servicesSum, materialsSubtotal: totals.productsSum, total: totals.grandTotal, updatedAt: Date.now() };
      persistEstimate(updated);
      return { estimate: updated, totals };
    });
  },

  updateItemPrice: (id, newPrice) => {
    if (!Number.isFinite(newPrice) || newPrice < 0) return;
    set((state) => {
      const updatedItems = state.estimate.items.map((item) => item.id === id ? { ...item, price: newPrice, total: Math.round(newPrice * item.quantity) } : item);
      const totals = calculateEstimateTotals(updatedItems, state.estimate.discount);
      const updated = { ...state.estimate, items: updatedItems, subtotal: totals.subtotal, servicesSubtotal: totals.servicesSum, materialsSubtotal: totals.productsSum, total: totals.grandTotal, updatedAt: Date.now() };
      persistEstimate(updated);
      return { estimate: updated, totals };
    });
  },

  deleteItem: (id) => {
    set((state) => {
      const updatedItems = state.estimate.items.filter((item) => item.id !== id);
      const totals = calculateEstimateTotals(updatedItems, state.estimate.discount);
      const updated = { ...state.estimate, items: updatedItems, subtotal: totals.subtotal, servicesSubtotal: totals.servicesSum, materialsSubtotal: totals.productsSum, total: totals.grandTotal, updatedAt: Date.now() };
      persistEstimate(updated);
      return { estimate: updated, totals };
    });
  },

  clearEstimate: () => {
    set((state) => {
      const updated = { ...state.estimate, items: [], subtotal: 0, servicesSubtotal: 0, materialsSubtotal: 0, total: 0, updatedAt: Date.now() };
      persistEstimate(updated);
      return { estimate: updated, totals: calculateEstimateTotals([], updated.discount) };
    });
  },

  updateDiscount: (newDiscount) => {
    set((state) => {
      const totals = calculateEstimateTotals(state.estimate.items, newDiscount);
      const updated = { ...state.estimate, discount: totals.discountPercent, subtotal: totals.subtotal, servicesSubtotal: totals.servicesSum, materialsSubtotal: totals.productsSum, total: totals.grandTotal, updatedAt: Date.now() };
      persistEstimate(updated);
      return { estimate: updated, totals };
    });
  },

  createNewEstimate: async (profileId, profileName) => {
    cancelPendingSave();
    const current = get().estimate;
    if (get().isLoaded && isValidEstimate(current)) {
      try { await storage.saveEstimate({ ...current, updatedAt: Date.now() }); }
      catch (err) { console.error('Failed to preserve current estimate:', err); }
    }

    const fresh = createDefaultEstimate(profileId || current.profileId || 'plumbing', profileName || current.profileName || 'Сантехника');
    set({ estimate: fresh, totals: calculateEstimateTotals([], 0) });
    try {
      await storage.saveEstimate(fresh);
      storage.setActiveEstimateId(fresh.id);
    } catch (err) {
      console.error('Failed to persist new estimate:', err);
    }
  },

  updateMetadata: (metadata) => {
    set((state) => {
      const updated = { ...state.estimate, ...metadata, updatedAt: Date.now() };
      persistEstimate(updated);
      return { estimate: updated, totals: calculateEstimateTotals(updated.items, updated.discount) };
    });
  },

  restoreEstimate: async (restored) => {
    if (!isValidEstimate(restored)) throw new Error('Imported estimate data is invalid');
    cancelPendingSave();
    const totals = calculateEstimateTotals(restored.items, restored.discount || 0);
    const formatted: Estimate = {
      ...createDefaultEstimate(restored.profileId, restored.profileName),
      ...restored,
      items: restored.items.map((item) => ({ ...item, id: item.id || createId('item'), total: Math.round(item.price * item.quantity) })),
      subtotal: totals.subtotal, servicesSubtotal: totals.servicesSum, materialsSubtotal: totals.productsSum,
      total: totals.grandTotal, discount: totals.discountPercent, updatedAt: Date.now(),
    };
    set({ estimate: formatted, totals });
    await storage.saveEstimate(formatted);
    storage.setActiveEstimateId(formatted.id);
  },
}));
