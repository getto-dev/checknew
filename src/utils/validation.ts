import { Estimate, EstimateItem } from '../types';

export const MAX_ESTIMATE_ITEMS = 5000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidEstimateItem(value: unknown): value is EstimateItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Partial<EstimateItem>;

  return (
    typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 300 &&
    typeof item.category === 'string' && item.category.length > 0 &&
    typeof item.unit === 'string' && item.unit.length > 0 &&
    isFiniteNumber(item.price) && item.price >= 0 &&
    isFiniteNumber(item.quantity) && item.quantity > 0 &&
    isFiniteNumber(item.total) && item.total >= 0 &&
    (item.type === undefined || item.type === 'work' || item.type === 'material')
  );
}

export function isValidEstimate(value: unknown): value is Estimate {
  if (!value || typeof value !== 'object') return false;

  const estimate = value as Partial<Estimate>;

  return (
    typeof estimate.id === 'string' && estimate.id.length > 0 &&
    typeof estimate.title === 'string' && estimate.title.length <= 300 &&
    typeof estimate.customer === 'string' && estimate.customer.length <= 300 &&
    typeof estimate.companyName === 'string' && estimate.companyName.length <= 300 &&
    typeof estimate.date === 'string' && estimate.date.length > 0 &&
    typeof estimate.profileId === 'string' && estimate.profileId.length > 0 &&
    Array.isArray(estimate.items) &&
    estimate.items.length <= MAX_ESTIMATE_ITEMS &&
    estimate.items.every(isValidEstimateItem) &&
    isFiniteNumber(estimate.discount) && estimate.discount >= 0 && estimate.discount <= 100 &&
    isFiniteNumber(estimate.subtotal) && estimate.subtotal >= 0 &&
    (estimate.servicesSubtotal === undefined || (isFiniteNumber(estimate.servicesSubtotal) && estimate.servicesSubtotal >= 0)) &&
    (estimate.materialsSubtotal === undefined || (isFiniteNumber(estimate.materialsSubtotal) && estimate.materialsSubtotal >= 0)) &&
    isFiniteNumber(estimate.total) && estimate.total >= 0 &&
    isFiniteNumber(estimate.createdAt) && estimate.createdAt >= 0 &&
    isFiniteNumber(estimate.updatedAt) && estimate.updatedAt >= 0
  );
}

export function parseStoredEstimate(value: unknown): Estimate | null {
  return isValidEstimate(value) ? value : null;
}

export function filterValidEstimates(value: unknown): Estimate[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidEstimate);
}
