import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Estimate, EstimateItem, CatalogItem } from '../types';
import { storage } from '../services/storage';
import { normalizeQuantity } from '../utils/quantity';
import { isValidEstimate, MAX_ESTIMATE_ITEMS } from '../utils/validation';
import { createId } from '../utils/id';

const createDefaultEstimate = (profileId = 'plumbing', profileName = 'Сантехника'): Estimate => {
  const currentDate = new Date().toISOString().split('T')[0];
  const now = Date.now();
  return {
    id: createId('est'),
    title: '',
    customer: '',
    companyName: '',
    date: currentDate,
    phone: '',
    address: '',
    notes: '',
    profileId,
    profileName,
    items: [],
    discount: 0,
    subtotal: 0,
    servicesSubtotal: 0,
    materialsSubtotal: 0,
    total: 0,
    createdAt: now,
    updatedAt: now,
  };
};

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

export function useEstimate(currentProfileId = 'plumbing', currentProfileName = 'Сантехника') {
  const [estimate, setEstimate] = useState<Estimate>(() =>
    createDefaultEstimate(currentProfileId, currentProfileName)
  );
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const activeEstId = storage.getActiveEstimateId();
        let loaded: Estimate | null = null;

        if (activeEstId) {
          loaded = await storage.getEstimate(activeEstId);
        }

        if (!loaded) {
          const allEstimates = await storage.getAllEstimates();
          if (allEstimates.length > 0) {
            loaded = allEstimates[0];
          }
        }

        if (isMounted) {
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
            setEstimate(validated);
            storage.setActiveEstimateId(validated.id);
          } else {
            const initial = createDefaultEstimate(currentProfileId, currentProfileName);
            setEstimate(initial);
            await storage.saveEstimate(initial);
            storage.setActiveEstimateId(initial.id);
          }
        }
      } catch (err) {
        console.error('Failed to load estimate from storage:', err);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const persistEstimate = useCallback((updated: Estimate) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      storage.saveEstimate(updated).catch((err) => {
        console.error('Failed to auto-save estimate:', err);
      });
      storage.setActiveEstimateId(updated.id);
    }, 250);
  }, []);

  const updateItemsInternal = useCallback(
    (newItems: EstimateItem[], newDiscount?: number) => {
      setEstimate((prev) => {
        const discount = newDiscount !== undefined ? newDiscount : prev.discount;
        const totals = calculateEstimateTotals(newItems, discount);
        const updated: Estimate = {
          ...prev,
          items: newItems,
          discount: totals.discountPercent,
          subtotal: totals.subtotal,
          servicesSubtotal: totals.servicesSum,
          materialsSubtotal: totals.productsSum,
          total: totals.grandTotal,
          updatedAt: Date.now(),
        };
        persistEstimate(updated);
        return updated;
      });
    },
    [persistEstimate]
  );

  const addItem = useCallback(
    (item: CatalogItem | Omit<EstimateItem, 'id' | 'total'>, quantity = 1) => {
      const validQty = normalizeQuantity(quantity);

      setEstimate((prev) => {
        if (prev.items.length >= MAX_ESTIMATE_ITEMS) {
          console.warn(`Estimate item limit reached: ${MAX_ESTIMATE_ITEMS}`);
          return prev;
        }

        const catalogId = 'id' in item ? item.id : undefined;
        const existingIdx = prev.items.findIndex(
          (it) =>
            (catalogId && it.catalogId === catalogId) ||
            (!catalogId && it.name === item.name && it.unit === item.unit)
        );

        let updatedItems: EstimateItem[];

        if (existingIdx !== -1) {
          updatedItems = prev.items.map((it, idx) => {
            if (idx === existingIdx) {
              const nextQty = normalizeQuantity(it.quantity + validQty);
              return {
                ...it,
                quantity: nextQty,
                total: Math.round(it.price * nextQty),
              };
            }
            return it;
          });
        } else {
          const newItem: EstimateItem = {
            id: createId('item'),
            catalogId,
            name: item.name,
            description: item.description,
            category: item.category,
            unit: item.unit,
            price: item.price,
            quantity: validQty,
            total: Math.round(item.price * validQty),
            type: item.type || 'work',
          };
          updatedItems = [...prev.items, newItem];
        }

        const totals = calculateEstimateTotals(updatedItems, prev.discount);
        const updated: Estimate = {
          ...prev,
          items: updatedItems,
          subtotal: totals.subtotal,
          servicesSubtotal: totals.servicesSum,
          materialsSubtotal: totals.productsSum,
          total: totals.grandTotal,
          updatedAt: Date.now(),
        };
        persistEstimate(updated);
        return updated;
      });
    },
    [persistEstimate]
  );

  const updateItemQuantity = useCallback(
    (id: string, newQty: number) => {
      if (newQty <= 0) {
        setEstimate((prev) => {
          const updatedItems = prev.items.filter((it) => it.id !== id);
          const totals = calculateEstimateTotals(updatedItems, prev.discount);
          const updated: Estimate = {
            ...prev,
            items: updatedItems,
            subtotal: totals.subtotal,
            servicesSubtotal: totals.servicesSum,
            materialsSubtotal: totals.productsSum,
            total: totals.grandTotal,
            updatedAt: Date.now(),
          };
          persistEstimate(updated);
          return updated;
        });
        return;
      }

      setEstimate((prev) => {
        const safeQty = Number.isFinite(newQty) ? newQty : 1;
        const updatedItems = prev.items.map((it) => {
          if (it.id !== id) return it;
          return {
            ...it,
            quantity: safeQty,
            total: Math.round(it.price * safeQty),
          };
        });

        const totals = calculateEstimateTotals(updatedItems, prev.discount);
        const updated: Estimate = {
          ...prev,
          items: updatedItems,
          subtotal: totals.subtotal,
          servicesSubtotal: totals.servicesSum,
          materialsSubtotal: totals.productsSum,
          total: totals.grandTotal,
          updatedAt: Date.now(),
        };
        persistEstimate(updated);
        return updated;
      });
    },
    [persistEstimate]
  );

  const updateItemPrice = useCallback(
    (id: string, newPrice: number) => {
      if (!Number.isFinite(newPrice) || newPrice < 0) return;

      setEstimate((prev) => {
        const updatedItems = prev.items.map((it) => {
          if (it.id !== id) return it;
          return {
            ...it,
            price: newPrice,
            total: Math.round(newPrice * it.quantity),
          };
        });

        const totals = calculateEstimateTotals(updatedItems, prev.discount);
        const updated: Estimate = {
          ...prev,
          items: updatedItems,
          subtotal: totals.subtotal,
          servicesSubtotal: totals.servicesSum,
          materialsSubtotal: totals.productsSum,
          total: totals.grandTotal,
          updatedAt: Date.now(),
        };
        persistEstimate(updated);
        return updated;
      });
    },
    [persistEstimate]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setEstimate((prev) => {
        const updatedItems = prev.items.filter((it) => it.id !== id);
        const totals = calculateEstimateTotals(updatedItems, prev.discount);
        const updated: Estimate = {
          ...prev,
          items: updatedItems,
          subtotal: totals.subtotal,
          servicesSubtotal: totals.servicesSum,
          materialsSubtotal: totals.productsSum,
          total: totals.grandTotal,
          updatedAt: Date.now(),
        };
        persistEstimate(updated);
        return updated;
      });
    },
    [persistEstimate]
  );

  const clearEstimate = useCallback(() => {
    setEstimate((prev) => {
      const updated: Estimate = {
        ...prev,
        items: [],
        subtotal: 0,
        servicesSubtotal: 0,
        materialsSubtotal: 0,
        total: 0,
        updatedAt: Date.now(),
      };
      persistEstimate(updated);
      return updated;
    });
  }, [persistEstimate]);

  const updateDiscount = useCallback(
    (newDiscount: number) => {
      updateItemsInternal(estimate.items, newDiscount);
    },
    [estimate.items, updateItemsInternal]
  );

  const createNewEstimate = useCallback(
    async (profileId?: string, profileName?: string) => {
      const pId = profileId || estimate.profileId || 'plumbing';
      const pName = profileName || estimate.profileName || 'Сантехника';
      const fresh = createDefaultEstimate(pId, pName);
      setEstimate(fresh);
      await storage.saveEstimate(fresh);
      storage.setActiveEstimateId(fresh.id);
    },
    [estimate.profileId, estimate.profileName]
  );

  const updateMetadata = useCallback(
    (metadata: Partial<Estimate>) => {
      setEstimate((prev) => {
        const updated: Estimate = {
          ...prev,
          ...metadata,
          updatedAt: Date.now(),
        };
        persistEstimate(updated);
        return updated;
      });
    },
    [persistEstimate]
  );

  const restoreEstimate = useCallback(
    async (restored: Estimate) => {
      if (!isValidEstimate(restored)) {
        throw new Error('Imported estimate data is invalid');
      }

      const totals = calculateEstimateTotals(restored.items, restored.discount || 0);
      const formatted: Estimate = {
        ...createDefaultEstimate(restored.profileId, restored.profileName),
        ...restored,
        items: restored.items.map((it) => ({
          ...it,
          id: it.id || createId('item'),
          total: Math.round(it.price * it.quantity),
        })),
        subtotal: totals.subtotal,
        servicesSubtotal: totals.servicesSum,
        materialsSubtotal: totals.productsSum,
        total: totals.grandTotal,
        updatedAt: Date.now(),
      };

      setEstimate(formatted);
      await storage.saveEstimate(formatted);
      storage.setActiveEstimateId(formatted.id);
    },
    []
  );

  const totals = useMemo(() => {
    return calculateEstimateTotals(estimate.items, estimate.discount);
  }, [estimate.items, estimate.discount]);

  return {
    estimate,
    isLoaded,
    totals,
    addItem,
    updateItemQuantity,
    updateItemPrice,
    deleteItem,
    clearEstimate,
    updateDiscount,
    createNewEstimate,
    updateMetadata,
    restoreEstimate,
  };
}
