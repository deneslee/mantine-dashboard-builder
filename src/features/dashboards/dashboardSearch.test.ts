import { expect, it } from 'vitest';
import { dashboardSearchSchema } from './dashboardSearch';

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
