import { createHash } from 'node:crypto';

/**
 * Open connection pools, one per connection string, so each query doesn't sign in again. Keyed by the
 * string's SHA-256 rather than the string; the least recently used pool closes when there are more
 * than `size`, and one that fails to open is forgotten, so the next query tries again.
 */
export function createPoolCache<T>({
  open,
  close,
  size = 10,
}: {
  open: (connectionString: string) => Promise<T>;
  close: (pool: T) => Promise<void>;
  size?: number;
}) {
  const pools = new Map<string, Promise<T>>();
  const keyOf = (connectionString: string) => createHash('sha256').update(connectionString).digest('hex');
  const closeQuietly = (pool: Promise<T>) => pool.then(close).catch(() => {});

  return {
    get(connectionString: string): Promise<T> {
      const key = keyOf(connectionString);
      const cached = pools.get(key);
      if (cached) {
        // Most recently used last, so the first entry is the one to close.
        pools.delete(key);
        pools.set(key, cached);
        return cached;
      }
      const pool = open(connectionString);
      pools.set(key, pool);
      pool.catch(() => {
        if (pools.get(key) === pool) pools.delete(key);
      });
      for (const [oldKey, oldPool] of pools) {
        if (pools.size <= size) break;
        pools.delete(oldKey);
        void closeQuietly(oldPool);
      }
      return pool;
    },
    get size() {
      return pools.size;
    },
    async closeAll(): Promise<void> {
      const all = [...pools.values()];
      pools.clear();
      await Promise.all(all.map(closeQuietly));
    },
  };
}
