import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalogItems, tokenizeQuery } from './smartSearch';
import type { CatalogItem } from '../types';

const catalog: CatalogItem[] = [
  { id: '1', name: 'Монтаж смесителя', category: 'Сантехника', unit: 'шт', price: 1000, type: 'work' },
  { id: '2', name: 'Радиатор алюминиевый', category: 'Отопление', unit: 'шт', price: 5000, type: 'material' },
  { id: '3', name: 'Розетка двойная', category: 'Электрика', unit: 'шт', price: 300, type: 'material' },
];

test('tokenizeQuery removes stop words and normalizes decimal comma', () => {
  assert.deepEqual(tokenizeQuery('кран для 2,5 м'), ['кран', '2.5']);
});

test('searchCatalogItems supports construction synonyms', () => {
  assert.equal(searchCatalogItems(catalog, 'кран')[0]?.id, '1');
  assert.equal(searchCatalogItems(catalog, 'розетка')[0]?.id, '3');
});

test('searchCatalogItems respects category filter', () => {
  const result = searchCatalogItems(catalog, '', 'Отопление');
  assert.deepEqual(result.map((item) => item.id), ['2']);
});
