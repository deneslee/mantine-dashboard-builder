import { Box } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import type { DataFrame } from '@/core/data/DataFrame';
import { TimeSeriesChart } from './TimeSeriesChart';

const START = Date.UTC(2026, 0, 1);
const HOUR = 3_600_000;
const times = Array.from({ length: 48 }, (_, i) => START + i * HOUR);

const FRAME: DataFrame = {
  length: 48,
  fields: [
    { name: 'time', type: 'time', values: times },
    {
      name: 'requests',
      type: 'number',
      values: times.map((_, i) => Math.round(200 + 80 * Math.sin(i / 4))),
      config: { label: 'Requests' },
    },
    {
      name: 'errors',
      type: 'number',
      values: times.map((_, i) => Math.round(20 + 8 * Math.cos(i / 3))),
      config: { label: 'Errors' },
    },
  ],
};

const meta = {
  component: TimeSeriesChart,
  args: { frames: [FRAME], options: { form: 'area' }, timeZone: 'UTC' },
  decorators: [
    (Story) => (
      <Box h={240} p="md">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof TimeSeriesChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Area: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('.recharts-surface')).not.toBeNull());
  },
};

export const Line: Story = { args: { options: { form: 'line' } } };

export const Bar: Story = { args: { options: { form: 'bar' } } };

export const Dark: Story = { globals: { scheme: 'dark' } };
