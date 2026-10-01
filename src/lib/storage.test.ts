import { readFileSync } from 'node:fs';
import { beforeEach, expect, it } from 'vitest';
import { migrateLegacyKeys, storageKey } from './storage';

beforeEach(() => localStorage.clear());

it('moves pre-Oct-2026 keys to the prefixed names and keeps newer values', () => {
  localStorage.setItem('shell.v1', '{"version":1}');
  localStorage.setItem('color-scheme', 'dark');
  localStorage.setItem('dashboard.saved.v1:sales', '{"id":"sales"}');
  localStorage.setItem('dashboard.draft.v1:ops', '{"id":"ops"}');
  localStorage.setItem('motion.v1', 'reduce');
  localStorage.setItem(storageKey('motion'), 'system');
  localStorage.setItem('other-app', 'untouched');

  migrateLegacyKeys();

  const stored = Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]));
  expect(stored).toEqual({
    [storageKey('shell')]: '{"version":1}',
    [storageKey('color-scheme')]: 'dark',
    [storageKey('saved:sales')]: '{"id":"sales"}',
    [storageKey('draft:ops')]: '{"id":"ops"}',
    [storageKey('motion')]: 'system',
    'other-app': 'untouched',
  });
});

it("matches the color-scheme key in index.html's pre-paint script", () => {
  expect(readFileSync('index.html', 'utf8')).toContain(
    `localStorage.getItem('${storageKey('color-scheme')}')`,
  );
});
