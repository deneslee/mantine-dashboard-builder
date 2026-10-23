import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vite-plus/test';
import { reportError } from '@/lib/sentry/runtime';
import { createQueryClient } from './queryClient';
import { createAppRouter } from './router';

vi.mock('@/lib/sentry/runtime', { spy: true });

describe('createAppRouter', () => {
  it('reports errors a route boundary catches, with the route', () => {
    const history = createMemoryHistory({ initialEntries: ['/dashboards/sales'] });
    const router = createAppRouter(createQueryClient(), { history, basepath: '/' });
    const error = new Error('The chart failed to render.');

    router.options.defaultOnCatch?.(error, { componentStack: '' });
    expect(reportError).toHaveBeenCalledExactlyOnceWith(error, {
      tags: { boundary: 'route', route: '/dashboards/sales' },
    });
  });
});
