import { describe, expect, it, vi } from 'vite-plus/test';
import { createPoolCache } from './poolCache';

describe('createPoolCache', () => {
  it('opens one pool per connection string and reuses it', async () => {
    const open = vi.fn(async (connectionString: string) => ({ connectionString }));
    const cache = createPoolCache({ open, close: async () => {} });
    const pool = await cache.get('Server=a');
    expect(await cache.get('Server=a')).toBe(pool);
    await cache.get('Server=b');
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('closes the least recently used pool when there are too many', async () => {
    const close = vi.fn(async (_pool: string) => {});
    const cache = createPoolCache({ open: async (connectionString) => connectionString, close, size: 2 });
    await cache.get('a');
    await cache.get('b');
    await cache.get('a');
    await cache.get('c');
    await vi.waitFor(() => expect(close).toHaveBeenCalledWith('b'));
    expect(close).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(2);
  });

  it('forgets a pool that failed to open, so the next query tries again', async () => {
    const open = vi.fn<(connectionString: string) => Promise<string>>();
    open.mockRejectedValueOnce(new Error('down')).mockResolvedValue('pool');
    const cache = createPoolCache({ open, close: async () => {} });
    await expect(cache.get('a')).rejects.toThrow('down');
    await expect(cache.get('a')).resolves.toBe('pool');
  });

  it('closes every pool when the relay stops', async () => {
    const close = vi.fn(async (_pool: string) => {});
    const cache = createPoolCache({ open: async (connectionString) => connectionString, close });
    await cache.get('a');
    await cache.get('b');
    await cache.closeAll();
    expect(close.mock.calls).toEqual([['a'], ['b']]);
    expect(cache.size).toBe(0);
  });
});
