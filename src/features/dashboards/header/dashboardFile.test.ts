import { lazy } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '@/plugins/WidgetPlugin';
import type { Plugins } from '@/plugins/usePlugins';
import { testDashboard } from '@/testing/fixtures/dashboards';
import { parseDashboardFile, serializeDashboard } from './dashboardFile';

const widget = (type: string) =>
  defineWidget({
    type,
    name: type,
    defaultSize: { w: 6, h: 3 },
    optionsSchema: z.object({}),
    component: lazy(async () => ({ default: () => null })),
    skeleton: null,
  });

const plugins: Plugins = {
  widgets: { chart: widget('chart'), kpi: widget('kpi') },
  datasources: {
    mock: {
      type: 'mock',
      name: 'Mock',
      querySchema: z.object({ seed: z.string() }),
      query: async () => [{ length: 0, fields: [] }],
    },
  },
};

describe('dashboard files', () => {
  it('exports widgets in reading order and imports the same dashboard back', () => {
    const dashboard = testDashboard();
    // b first in the object, but a sits left of it on the grid.
    const reversed = { ...dashboard, widgets: { b: dashboard.widgets.b!, a: dashboard.widgets.a! } };
    const text = serializeDashboard(reversed);
    expect(Object.keys(JSON.parse(text).widgets)).toEqual(['a', 'b']);
    expect(parseDashboardFile(text, plugins)).toEqual(dashboard);
  });

  it('reads files saved with `version` instead of `schemaVersion`', () => {
    const { schemaVersion: _, ...rest } = testDashboard();
    expect(parseDashboardFile(JSON.stringify({ version: 1, ...rest }), plugins)).toEqual(testDashboard());
  });

  it('rejects unknown widget types and datasources, and specs their datasource refuses', () => {
    const dashboard = testDashboard();
    const withWidget = (patch: object) =>
      JSON.stringify({
        ...dashboard,
        widgets: { ...dashboard.widgets, a: { ...dashboard.widgets.a, ...patch } },
      });
    expect(() => parseDashboardFile(withWidget({ type: 'nope' }), plugins)).toThrow(
      'Unknown widget type "nope".',
    );
    expect(() =>
      parseDashboardFile(withWidget({ queries: [{ datasource: 'sql', spec: {} }] }), plugins),
    ).toThrow('Unknown datasource "sql".');
    expect(() =>
      parseDashboardFile(withWidget({ queries: [{ datasource: 'mock', spec: {} }] }), plugins),
    ).toThrow();
    expect(() => parseDashboardFile('{not json', plugins)).toThrow();
  });
});
