import { describe, expect, it } from 'vitest';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import { datasourceQuery } from './dashboardQueries';

const time = { range: { from: 'now-24h', to: 'now' }, shifts: ['1w'], timeZone: 'UTC' };

const keyFor = (isTimeAware: boolean) => {
  const datasource: DatasourcePlugin = { type: 'x', name: 'X', isTimeAware, query: async () => [] };
  return datasourceQuery({ datasource: 'x', spec: 'a' }, time, {
    datasources: { x: datasource },
    getNow: Date.now,
    source: 'Test',
  }).queryKey;
};

describe('datasourceQuery', () => {
  it("keys a query by the widget's time only when the datasource is time-aware", () => {
    expect(keyFor(true)).toEqual(['ds', 'x', 'a', time.range, time.shifts, 'UTC']);
    // A static file is the same at any time: one entry, no refetch when the range changes.
    expect(keyFor(false)).toEqual(['ds', 'x', 'a']);
  });
});
