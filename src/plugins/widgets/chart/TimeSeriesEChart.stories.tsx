import { Box } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import type { DataFrame } from '@/core/data/DataFrame';
import { TimeSeriesEChart } from './TimeSeriesEChart';

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

const MS_FRAME: DataFrame = {
  length: 48,
  fields: [
    { name: 'time', type: 'time', values: times },
    {
      name: 'latency',
      type: 'number',
      values: times.map((_, i) => Math.round(120 + 30 * Math.sin(i / 5))),
      config: { unit: 'ms', label: 'Latency' },
    },
  ],
};

const meta = {
  component: TimeSeriesEChart,
  args: { frames: [FRAME], options: { form: 'area' }, timeZone: 'UTC' },
  decorators: [
    (Story) => (
      <Box h={240} p="md">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof TimeSeriesEChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Area: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('img', { name: /Requests/ })).toBeInTheDocument();
    await waitFor(() => expect(canvasElement.querySelector('canvas')).not.toBeNull());
  },
};

export const Line: Story = { args: { options: { form: 'line' } } };

export const Bar: Story = { args: { options: { form: 'bar' } } };

export const WithUnit: Story = { args: { frames: [MS_FRAME] } };

export const Empty: Story = {
  args: { frames: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('img')).toBeInTheDocument();
  },
};

export const Dark: Story = {
  globals: { scheme: 'dark' },
  play: Area.play,
};

export const DarkBar: Story = {
  args: { options: { form: 'bar' } },
  globals: { scheme: 'dark' },
};
