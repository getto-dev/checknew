import { Estimate, EstimateItem } from '../types';

export const MAX_ESTIMATE_ITEMS = 5000;
export const MAX_NAME_LENGTH = 300;
export const MAX_CATEGORY_LENGTH = 200;
export const MAX_UNIT_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_PHONE_LENGTH = 100;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_NOTES_LENGTH = 2000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  if (typeof value !== 'string' || value.length > maxLength) return false;
  return allowEmpty || value.trim().length > 0;
}

function normalizeEstimateItem(item: EstimateItem): EstimateItem {
  return {
    ...item,
    total: Math.round(item.price * item.quantity),
  };
}

export function isValidEstimateItem(value: unknown): value is EstimateItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Partial<EstimateItem>;

  return (
    hasText(item.id, MAX_NAME_LENGTH) &&
    hasText(item.name, MAX_NAME_LENGTH) &&
    hasText(item.category, MAX_CATEGORY_LENGTH) &&
    hasText(item.unit, MAX_UNIT_LENGTH) &&
    isFiniteNumber(item.price) && item.price >= 0 &&
    isFiniteNumber(item.quantity) && item.quantity > 0 &&
    isFiniteNumber(item.total) && item.total >= 0 &&
    (item.description === undefined || hasText(item.description, MAX_DESCRIPTION_LENGTH, true)) &&
    (item.type === undefined || item.type === 'work' || item.type === 'material')
  );
}

export function isValidEstimate(value: unknown): value is Estimate {
  if (!value || typeof value !== 'object') return false;

  const estimate = value as Partial<Estimate>;

  return (
    hasText(estimate.id, MAX_NAME_LENGTH) &&
    hasText(estimate.title, MAX_NAME_LENGTH, true) &&
    hasText(estimate.customer, MAX_NAME_LENGTH, true) &&
    hasText(estimate.companyName, MAX_NAME_LENGTH, true) &&
    hasText(estimate.date, 50) &&
    hasText(estimate.phone, MAX_PHONE_LENGTH, true) &&
    hasText(estimate.address, MAX_ADDRESS_LENGTH, true) &&
    hasText(estimate.notes, MAX_NOTES_LENGTH, true) &&
    hasText(estimate.profileId, MAX_NAME_LENGTH) &&
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
  if (!isValidEstimate(value)) return null;

  return {
    ...value,
    items: value.items.map(normalizeEstimateItem),
  };
}

export function filterValidEstimates(value: unknown): Estimate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(parseStoredEstimate)
    .filter((estimate): estimate is Estimate => estimate !== null);
}
