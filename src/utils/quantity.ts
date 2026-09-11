export const MIN_QUANTITY = 0.5;
export const QUANTITY_STEP = 0.5;

export const normalizeQuantity = (value: number | string): number => {
  const numeric = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return MIN_QUANTITY;
  // Round to nearest 0.5
  return Math.max(MIN_QUANTITY, Math.round(numeric / QUANTITY_STEP) * QUANTITY_STEP);
};

export const changeQuantity = (quantity: number, direction: -1 | 1, step = QUANTITY_STEP): number => {
  const current = Number(quantity) || 1;
  const next = current + direction * step;
  return Math.max(MIN_QUANTITY, Math.round(next * 10) / 10);
};

export const formatQuantity = (quantity: number): string => {
  if (quantity === undefined || quantity === null || isNaN(quantity)) return '1';
  if (quantity % 1 === 0) return quantity.toFixed(0);
  return quantity.toFixed(1).replace('.0', '');
};
