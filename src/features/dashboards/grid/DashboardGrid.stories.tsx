import { Box } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TestRouter } from '@/testing/TestRouter';
import type { LayoutItem } from '@/core/dashboard/layout';
import { DashboardProvider } from '../state/DashboardProvider';
import { createDashboardStore } from '../state/createDashboardStore';
import { localRepository } from '../data/dashboardApi';
import type { Dashboard, Widget } from '../state/types';
import { DashboardGrid } from './DashboardGrid';

// Built inline with mock queries: Storybook doesn't serve public/data.
const series = (seed: string, name: string, base: number) => [
  { datasource: 'mock', spec: { kind: 'series', seed, fields: [{ name, base, spread: base / 10 }] } },
];

function dashboard(tiles: [Widget, LayoutItem][]): Dashboard {
  return {
    version: 1,
    id: 'story',
    title: 'Story',
    description: '',
    tags: [],
    variables: [],
    updatedAt: '2026-09-30',
    timeRange: { from: 'now-24h', to: 'now' },
    refresh: 'off',
    widgets: Object.fromEntries(tiles.map(([w]) => [w.id, w])),
    layouts: { lg: tiles.map(([, item]) => item) },
  };
}

const sales = dashboard([
  [
    {
      id: 'kpis',
      type: 'kpi',
      title: 'Key figures',
      options: {},
      queries: [
        {
          datasource: 'mock',
          spec: {
            kind: 'series',
            seed: 'kpis',
            points: 24,
            fields: [
              { name: 'revenue', label: 'Revenue', unit: '€', base: 120000, spread: 4000 },
              { name: 'alarms', label: 'Open alarms', base: 18, spread: 3 },
            ],
          },
        },
      ],
    },
    { i: 'kpis', x: 0, y: 0, w: 12, h: 3 },
  ],
  [
    {
      id: 'revenue',
      type: 'chart',
      title: 'Revenue',
      options: { form: 'area' },
      queries: series('revenue', 'revenue', 60),
    },
    { i: 'revenue', x: 0, y: 3, w: 8, h: 6 },
  ],
  [
    {
      id: 'log',
      type: 'table',
      title: 'Request log',
      options: {},
      queries: [{ datasource: 'mock', spec: { kind: 'table', seed: 'log', rows: 500 } }],
    },
    { i: 'log', x: 8, y: 3, w: 4, h: 6 },
  ],
  [
    {
      id: 'alarms',
      type: 'table',
      title: 'HVAC alarms',
      options: {},
      queries: [{ datasource: 'mock', spec: { kind: 'error', message: 'Haystack server returned 502.' } }],
    },
    { i: 'alarms', x: 0, y: 9, w: 6, h: 6 },
  ],
  [
    {
      id: 'occupancy',
      type: 'chart',
      title: 'Occupancy',
      options: { form: 'line' },
      queries: series('occ', 'occupancy', 55),
    },
    { i: 'occupancy', x: 6, y: 9, w: 6, h: 6 },
  ],
]);

const forms = ['area', 'line', 'bar'];
const perf = dashboard(
  Array.from({ length: 20 }, (_, n): [Widget, LayoutItem] => [
    {
      id: `chart-${n + 1}`,
      type: 'chart',
      title: `Series ${n + 1}`,
      options: { form: forms[n % 3] },
      queries: series(`perf-${n}`, 'value', 60),
    },
    { i: `chart-${n + 1}`, x: (n % 3) * 4, y: Math.floor(n / 3) * 6, w: 4, h: 6 },
  ]),
);

const dashboards = { sales, perf };

function GridStory({ id, mode = 'view' }: { id: keyof typeof dashboards; mode?: 'view' | 'edit' }) {
  const [store] = useState(() => createDashboardStore(dashboards[id], localRepository, mode, false));
  return (
    <TestRouter
      wrap={(outlet) => outlet}
      page={
        <Box p="lg">
          <DashboardProvider dashboard={dashboards[id]} store={store}>
            <DashboardGrid range={{ from: 'now-24h', to: 'now' }} />
          </DashboardProvider>
        </Box>
      }
    />
  );
}

const meta = {
  component: GridStory,
} satisfies Meta<typeof GridStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figures, charts, a table and a widget whose datasource fails inside its own boundary. */
export const Default: Story = { args: { id: 'sales' } };
/** 20 charts; tiles below the fold mount when scrolled near. Resize the canvas to see md and sm. */
export const TwentyCharts: Story = { args: { id: 'perf' } };
export const Editing: Story = { args: { id: 'sales', mode: 'edit' } };
