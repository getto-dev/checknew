import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimateTotals } from './estimateStore';
import type { EstimateItem } from '../types';

const items: EstimateItem[] = [
  {
    id: 'work-1', name: 'Монтаж', category: 'Работы', unit: 'шт', price: 100, quantity: 2,
    total: 200, type: 'work',
  },
  {
    id: 'material-1', name: 'Материал', category: 'Материалы', unit: 'шт', price: 500, quantity: 1,
    total: 500, type: 'material',
  },
];

test('calculateEstimateTotals applies discount only to works', () => {
  const totals = calculateEstimateTotals(items, 10);
  assert.equal(totals.subtotal, 700);
  assert.equal(totals.servicesSum, 200);
  assert.equal(totals.productsSum, 500);
  assert.equal(totals.discountAmount, 20);
  assert.equal(totals.grandTotal, 680);
  assert.equal(totals.workCount, 1);
  assert.equal(totals.materialCount, 1);
});

test('calculateEstimateTotals clamps discount to 0..100', () => {
  assert.equal(calculateEstimateTotals(items, -10).discountPercent, 0);
  assert.equal(calculateEstimateTotals(items, 150).discountPercent, 100);
  assert.equal(calculateEstimateTotals(items, 150).grandTotal, 500);
});
