import { expect, it } from 'vite-plus/test';
import { canonicalJson } from './canonicalJson';

it('gives the same text for the same value in any key order, at any depth', () => {
  expect(canonicalJson({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: null } })).toBe(
    '{"a":{"c":null,"d":[2,{"x":2,"y":1}]},"b":1}',
  );
  expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  expect(canonicalJson({ a: 1 })).not.toBe(canonicalJson({ a: '1' }));
});
