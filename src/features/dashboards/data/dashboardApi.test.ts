import { afterEach, expect, it, vi } from 'vitest';
import { isAppError } from '@/core/errors/AppError';
import { getDashboard, listDashboards, savedKey } from './dashboardApi';

const index = {
  items: [
    { id: 'sales', title: 'Sales', updatedAt: '2026-09-21T14:12:00Z', widgetCount: 5 },
    { id: 'ops', title: 'Operations', updatedAt: '2026-09-21T14:12:00Z', widgetCount: 5 },
  ],
};

afterEach(() => vi.unstubAllGlobals());

it('keeps the list working when one saved copy is corrupt, and reports it on the dashboard', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(JSON.stringify(index), { headers: { 'content-type': 'application/json' } }),
    ),
  );
  localStorage.setItem(savedKey('ops'), '{not json');

  const list = await listDashboards();
  expect(list.map((item) => item.title)).toEqual(['Sales', 'Operations']);

  const error = await getDashboard('ops').catch((e: unknown) => e);
  expect(isAppError(error) && error.code).toBe('validation');
  expect(localStorage.getItem(savedKey('ops'))).toBe('{not json');
});
