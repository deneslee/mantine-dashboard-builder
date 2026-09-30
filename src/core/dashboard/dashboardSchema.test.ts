import { describe, expect, it } from 'vitest';
import { dashboardDoc } from './dashboardSchema';
import { toDashboard, toDocument } from '@/features/dashboards/data/mapper';

const valid = {
  version: 1,
  id: 'sales',
  title: 'Sales overview',
  updatedAt: '2026-09-21T14:12:00Z',
  timeRange: { from: 'now-24h', to: 'now' },
  widgets: {
    chart: {
      type: 'chart',
      title: 'Revenue',
      options: { form: 'area' },
      queries: [{ datasource: 'mock', spec: {} }],
    },
    kpis: { type: 'kpi', title: 'Key figures' },
  },
  layouts: {
    lg: [
      { i: 'chart', x: 0, y: 3, w: 12, h: 6 },
      { i: 'kpis', x: 0, y: 0, w: 12, h: 3 },
    ],
  },
};

const issues = (input: unknown) => {
  const result = dashboardDoc.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('dashboardDoc', () => {
  it('accepts a valid document and fills the defaults', () => {
    const doc = dashboardDoc.parse(valid);
    expect(doc.refresh).toBe('off');
    expect(doc.tags).toEqual([]);
    expect(doc.widgets.kpis?.queries).toEqual([]);
  });

  it('rejects an unknown version', () => {
    expect(issues({ ...valid, version: 2 })).not.toEqual([]);
  });

  it('rejects a document without an lg layout or with a bad time range', () => {
    expect(issues({ ...valid, layouts: {} })).not.toEqual([]);
    expect(issues({ ...valid, timeRange: { from: 'yesterday', to: 'now' } })).not.toEqual([]);
  });

  it('rejects a widget missing from an authored layout, and a layout item without a widget', () => {
    expect(
      issues({ ...valid, layouts: { lg: valid.layouts.lg, sm: [{ ...valid.layouts.lg[0], w: 4 }] } }),
    ).toEqual(['Widget "kpis" has no place in the sm layout.']);
    expect(
      issues({ ...valid, layouts: { lg: [...valid.layouts.lg, { i: 'ghost', x: 0, y: 9, w: 1, h: 1 }] } }),
    ).toEqual([`The lg layout places a widget that doesn't exist: "ghost".`]);
  });
});

describe('toDashboard', () => {
  it('keeps a serializable document with authored layouts and exports widgets in reading order', () => {
    const dashboard = toDashboard(dashboardDoc.parse(valid));
    expect(dashboard.updatedAt).toBe('2026-09-21T14:12:00Z');
    expect(dashboard.timeRange).toEqual({ from: 'now-24h', to: 'now' });
    expect(Object.keys(toDocument(dashboard).widgets)).toEqual(['kpis', 'chart']);
    expect(dashboard.widgets.chart).toEqual({
      id: 'chart',
      type: 'chart',
      title: 'Revenue',
      options: { form: 'area' },
      queries: [{ datasource: 'mock', spec: {} }],
    });
    expect(dashboard.layouts).toEqual(valid.layouts);
    expect(toDashboard(dashboardDoc.parse(toDocument(dashboard)))).toEqual(dashboard);
  });
});
