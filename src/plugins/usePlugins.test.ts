import { describe, expect, it } from 'vite-plus/test';
import { toRegistry } from './usePlugins';

describe('toRegistry', () => {
  it('keys items by id', () => {
    expect(toRegistry('widget', [{ id: 'a' }, { id: 'b' }], (x) => x.id)).toEqual({
      a: { id: 'a' },
      b: { id: 'b' },
    });
  });

  it('throws on a duplicate id', () => {
    expect(() => toRegistry('action', [{ id: 'x' }, { id: 'x' }], (x) => x.id)).toThrow(
      'Two action plugins have the id "x"',
    );
  });

  it('accepts an empty list', () => {
    expect(toRegistry('action', [], (x: { id: string }) => x.id)).toEqual({});
  });
});
