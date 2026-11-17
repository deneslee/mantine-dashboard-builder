import { describe, expect, it } from 'vite-plus/test';
import { localTimeZone } from '@/core/time/timeRange';
import { dashboardSearchSchema, resolveDashboardTime } from './dashboardSearch';

it('keeps valid search params and drops invalid ones, so the dashboard defaults apply', () => {
  expect(dashboardSearchSchema.parse({ mode: 'edit', from: 'now-7d', to: 'now', refresh: '1m' })).toEqual({
    mode: 'edit',
    from: 'now-7d',
    to: 'now',
    refresh: '1m',
  });
  expect(
    dashboardSearchSchema.parse({
      mode: 'admin',
      widget: '',
      editor: 'sql',
      from: 'yesterday',
      refresh: '0s',
    }),
  ).toEqual({ mode: 'view' });
});

describe('resolveDashboardTime', () => {
  const dashboard = { timeRange: { from: 'now-24h', to: 'now' }, refresh: 'off', timeZone: 'UTC' };

  it('uses the URL over the defaults', () => {
    expect(resolveDashboardTime(dashboard, { from: 'now-7d', refresh: '1m', tz: 'Europe/Berlin' })).toEqual({
      range: { from: 'now-7d', to: 'now' },
      refresh: '1m',
      timeZone: 'Europe/Berlin',
    });
  });

  it("falls back to the dashboard's defaults", () => {
    expect(resolveDashboardTime(dashboard, {})).toEqual({
      range: dashboard.timeRange,
      refresh: 'off',
      timeZone: 'UTC',
    });
  });

  it('falls back to the local time zone', () => {
    expect(resolveDashboardTime({ ...dashboard, timeZone: undefined }, {}).timeZone).toBe(localTimeZone());
  });
});
