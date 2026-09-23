import { Box } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryRouter } from '@/test/storyRouter';
import { demoWidgets } from '../../api/demo';
import { DashboardGrid } from './DashboardGrid';

function GridStory({ dashboardId }: { dashboardId: string }) {
  return (
    <StoryRouter
      wrap={(outlet) => outlet}
      page={
        <Box p="lg">
          <DashboardGrid dashboardId={dashboardId} widgets={demoWidgets(dashboardId)} />
        </Box>
      }
    />
  );
}

const meta = {
  title: 'Dashboards/Grid',
  component: GridStory,
} satisfies Meta<typeof GridStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Demo tiles: figures, charts, a table and a widget that fails inside its own boundary. */
export const Default: Story = { args: { dashboardId: 'sales' } };
/** 20 charts; tiles below the fold mount when scrolled near. Resize the canvas to see md and sm. */
export const TwentyCharts: Story = { args: { dashboardId: 'perf' } };
