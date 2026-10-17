import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/core/errors/AppError';
import { reportError } from '@/lib/sentry/runtime';
import { createQueryClient } from './queryClient';

vi.mock('@/lib/sentry/runtime', { spy: true });

afterEach(() => vi.clearAllMocks());

describe('createQueryClient: error reporting', () => {
  it('reports a failed query once, tagged and grouped by datasource and code', async () => {
    const error = new AppError('datasource', 'Haystack returned 502.');
    const query = createQueryClient().fetchQuery({
      queryKey: ['ds', 'haystack'],
      queryFn: () => Promise.reject(error),
      meta: { source: 'Alarms', datasource: 'haystack' },
      retry: false,
    });

    await expect(query).rejects.toBe(error);
    expect(reportError).toHaveBeenCalledExactlyOnceWith(error, {
      tags: { boundary: 'query', datasource: 'haystack', source: 'Alarms' },
      fingerprint: ['query', 'haystack', 'datasource'],
    });
  });

  it('reports a failed mutation, grouped by code', async () => {
    const error = new AppError('network', 'Could not save the dashboard.');
    const client = createQueryClient();
    const mutation = client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(error), meta: { source: 'Dashboards' } })
      .execute(undefined);

    await expect(mutation).rejects.toBe(error);
    expect(reportError).toHaveBeenCalledExactlyOnceWith(error, {
      tags: { boundary: 'mutation', source: 'Dashboards' },
      fingerprint: ['mutation', 'network'],
    });
  });
});
