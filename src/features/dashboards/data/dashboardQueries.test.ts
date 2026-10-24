import { describe, expect, it } from 'vite-plus/test';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import { datasourceQuery } from './dashboardQueries';

const time = { range: { from: 'now-24h', to: 'now' }, shifts: ['1w'], timeZone: 'UTC' };

const keyFor = (isTimeAware: boolean, revision?: string) => {
  const datasource: DatasourcePlugin = { id: 'x', name: 'X', isTimeAware, revision, query: async () => [] };
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

  it("keys a connection's queries by its revision, so an edit never shows results from before it", () => {
    expect(keyFor(false, '2026-10-24T08:00:00.000Z:1')).toEqual([
      'ds',
      'x',
      '2026-10-24T08:00:00.000Z:1',
      'a',
    ]);
    expect(keyFor(false, 'r2')).not.toEqual(keyFor(false, 'r1'));
  });
});
