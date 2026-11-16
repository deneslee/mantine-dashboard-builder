import { describe, expect, it } from 'vite-plus/test';
import { recordKeys, staleKeys } from './recordKeys';

const isPrefix = (prefix: readonly unknown[], key: readonly unknown[]) =>
  prefix.every((part, i) => key[i] === part);

describe('recordKeys', () => {
  it('orders a key: provider, collection, kind of read, parameters', () => {
    const query = { text: 'ann', page: { size: 10 } };
    expect(recordKeys.list('browser', 'patients', query)).toEqual([
      'records',
      'browser',
      'patients',
      'list',
      query,
    ]);
    expect(recordKeys.one('browser', 'patients', 'p1')).toEqual([
      'records',
      'browser',
      'patients',
      'one',
      'p1',
    ]);
  });

  it('makes each shorter key a prefix of the longer ones', () => {
    const list = recordKeys.list('browser', 'patients', { text: 'ann' });
    const one = recordKeys.one('browser', 'patients', 'p1');
    expect(isPrefix(recordKeys.lists('browser', 'patients'), list)).toBe(true);
    expect(isPrefix(recordKeys.lists('browser', 'patients'), one)).toBe(false);
    expect(isPrefix(recordKeys.ones('browser', 'patients'), one)).toBe(true);
    for (const prefix of [
      recordKeys.all,
      recordKeys.provider('browser'),
      recordKeys.collection('browser', 'patients'),
    ]) {
      expect(isPrefix(prefix, list)).toBe(true);
      expect(isPrefix(prefix, one)).toBe(true);
    }
    expect(isPrefix(recordKeys.collection('convex', 'patients'), list)).toBe(false);
  });

  it('gives a list without a query the same key as an empty query', () => {
    expect(recordKeys.list('browser', 'patients')).toEqual(recordKeys.list('browser', 'patients', {}));
  });
});

describe('staleKeys', () => {
  it('a create makes every list of the collection stale', () => {
    expect(staleKeys('browser', 'patients', { operation: 'create' })).toEqual([
      recordKeys.lists('browser', 'patients'),
    ]);
  });

  it('an update or delete makes the lists and that record stale', () => {
    const expected = [recordKeys.lists('browser', 'patients'), recordKeys.one('browser', 'patients', 'p1')];
    expect(staleKeys('browser', 'patients', { operation: 'update', id: 'p1' })).toEqual(expected);
    expect(staleKeys('browser', 'patients', { operation: 'delete', id: 'p1' })).toEqual(expected);
  });

  it('an import makes the whole collection stale', () => {
    expect(staleKeys('browser', 'patients', { operation: 'import' })).toEqual([
      recordKeys.collection('browser', 'patients'),
    ]);
  });
});
