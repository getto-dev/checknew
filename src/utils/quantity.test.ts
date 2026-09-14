import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_QUANTITY, changeQuantity, formatQuantity, normalizeQuantity } from './quantity';

test('normalizeQuantity accepts decimal comma and clamps to half steps', () => {
  assert.equal(normalizeQuantity('2,5'), 2.5);
  assert.equal(normalizeQuantity('2.4'), 2.5);
  assert.equal(normalizeQuantity('0'), MIN_QUANTITY);
});

test('changeQuantity never goes below minimum', () => {
  assert.equal(changeQuantity(0.5, -1), 0.5);
  assert.equal(changeQuantity(1, 1), 1.5);
  assert.equal(changeQuantity(2, -1), 1.5);
});

test('formatQuantity produces compact catalog values', () => {
  assert.equal(formatQuantity(1), '1');
  assert.equal(formatQuantity(2.5), '2.5');
});
