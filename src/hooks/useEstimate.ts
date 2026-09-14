import { useEffect } from 'react';
import { useEstimateStore } from '../store/estimateStore';

export function useEstimate(currentProfileId = 'plumbing', currentProfileName = 'Сантехника') {
  const estimate = useEstimateStore((state) => state.estimate);
  const isLoaded = useEstimateStore((state) => state.isLoaded);
  const totals = useEstimateStore((state) => state.totals);
  const addItem = useEstimateStore((state) => state.addItem);
  const updateItemQuantity = useEstimateStore((state) => state.updateItemQuantity);
  const updateItemPrice = useEstimateStore((state) => state.updateItemPrice);
  const deleteItem = useEstimateStore((state) => state.deleteItem);
  const clearEstimate = useEstimateStore((state) => state.clearEstimate);
  const updateDiscount = useEstimateStore((state) => state.updateDiscount);
  const createNewEstimate = useEstimateStore((state) => state.createNewEstimate);
  const updateMetadata = useEstimateStore((state) => state.updateMetadata);
  const restoreEstimate = useEstimateStore((state) => state.restoreEstimate);
  const initialize = useEstimateStore((state) => state.initialize);

  useEffect(() => {
    void initialize(currentProfileId, currentProfileName);
  }, [initialize, currentProfileId, currentProfileName]);

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

export type { EstimateTotals } from '../store/estimateStore';
export { calculateEstimateTotals } from '../store/estimateStore';
