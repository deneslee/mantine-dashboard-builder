import { Box } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TestRouter } from '@/testing/TestRouter';
import { loadDemoDashboard } from '@/testing/fixtures/dashboards';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import { DashboardProvider } from '../state/DashboardProvider';
import { createDashboardStore } from '../state/createDashboardStore';
import { DashboardGrid } from './DashboardGrid';

interface Args {
  /** A demo dashboard in `public/data/dashboards/`. */
  id: 'sales' | 'perf';
  mode?: 'view' | 'edit';
}

function Grid({ dashboard, mode }: { dashboard: Dashboard; mode: 'view' | 'edit' }) {
  const [store] = useState(() => createDashboardStore(dashboard, { mode, shouldPersist: false }));
  return (
    <TestRouter
      page={
        <Box p="lg">
          <DashboardProvider dashboard={dashboard} store={store}>
            <DashboardGrid range={{ from: 'now-24h', to: 'now' }} />
          </DashboardProvider>
        </Box>
      }
    />
  );
}

const meta = {
  loaders: [async ({ args }) => ({ dashboard: await loadDemoDashboard(args.id) })],
  render: ({ mode = 'view' }, { loaded }) => <Grid dashboard={loaded.dashboard as Dashboard} mode={mode} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figures, charts, a table and a widget whose datasource fails inside its own boundary. */
export const Default: Story = { args: { id: 'sales' } };
/** 20 charts; tiles below the fold mount when scrolled near. Resize the canvas to see md and sm. */
export const TwentyCharts: Story = { args: { id: 'perf' } };
export const Editing: Story = { args: { id: 'sales', mode: 'edit' } };
