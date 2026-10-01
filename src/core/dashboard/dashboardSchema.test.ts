import { describe, expect, it } from 'vitest';
import { dashboardSchema, migrateDashboard, orderWidgets, storedDashboardSchema } from './dashboardSchema';

const valid = {
  schemaVersion: 1,
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
  const result = dashboardSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('dashboardSchema', () => {
  it('accepts a valid dashboard and fills the defaults', () => {
    const dashboard = dashboardSchema.parse(valid);
    expect(dashboard.refresh).toBe('off');
    expect(dashboard.tags).toEqual([]);
    expect(dashboard.widgets.kpis?.queries).toEqual([]);
    expect(dashboard.layouts).toEqual(valid.layouts);
  });

  it('rejects an unknown schemaVersion', () => {
    expect(issues({ ...valid, schemaVersion: 2 })).not.toEqual([]);
  });

  it('rejects a dashboard without an lg layout or with a bad time range', () => {
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

describe('migrateDashboard', () => {
  it('reads files saved with `version` as schemaVersion 1', () => {
    const { schemaVersion: _, ...rest } = valid;
    const legacy = { version: 1, ...rest };
    expect(migrateDashboard(legacy)).toEqual(valid);
    expect(storedDashboardSchema.parse(legacy)).toEqual(dashboardSchema.parse(valid));
  });

  it('passes current and unreadable input through for the schema to judge', () => {
    expect(migrateDashboard(valid)).toBe(valid);
    expect(migrateDashboard(null)).toBeNull();
    expect(storedDashboardSchema.safeParse({ version: 2 }).success).toBe(false);
  });
});

describe('orderWidgets', () => {
  it('orders widgets by lg reading order and changes nothing else', () => {
    const dashboard = dashboardSchema.parse(valid);
    const ordered = orderWidgets(dashboard);
    expect(Object.keys(ordered.widgets)).toEqual(['kpis', 'chart']);
    expect(ordered).toEqual(dashboard);
  });
});
