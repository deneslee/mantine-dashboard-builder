import { expect, it } from 'vite-plus/test';
import { slugify } from './slugify';

it('turns free text into a lowercase id', () => {
  expect(slugify('Sales DB (EU)')).toBe('sales-db-eu');
  expect(slugify('  Árvíztűrő tükörfúrógép  ')).toBe('arvizturo-tukorfurogep');
  expect(slugify('---')).toBe('');
  expect(slugify('a'.repeat(70))).toHaveLength(63);
  expect(slugify(`${'a'.repeat(62)} b`)).toBe('a'.repeat(62));
});
