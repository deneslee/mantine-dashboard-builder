import { Paper, SimpleGrid } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ChartSkeleton,
  DashboardSkeleton,
  ListSkeleton,
  PanelSkeleton,
  TableSkeleton,
  TextSkeleton,
} from './skeletons/Skeletons';

const meta = { title: 'Loading/Skeletons' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Widgets: Story = {
  render: () => (
    <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} p="lg" spacing="md">
      <Paper variant="panel" p="md" h={200}>
        <TextSkeleton />
      </Paper>
      <Paper variant="panel" p="md" h={200}>
        <ChartSkeleton />
      </Paper>
      <Paper variant="panel" p="md" h={200}>
        <TableSkeleton rows={4} columns={3} />
      </Paper>
      <Paper variant="panel" h={200}>
        <PanelSkeleton />
      </Paper>
    </SimpleGrid>
  ),
};

export const DashboardRoute: Story = { render: () => <DashboardSkeleton /> };
export const ListRoute: Story = { render: () => <ListSkeleton /> };
