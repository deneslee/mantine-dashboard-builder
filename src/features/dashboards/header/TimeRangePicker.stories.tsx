import { Code, Group, Stack } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { TimeRange } from '@/core/time/timeRange';
import { RefreshPicker } from './RefreshPicker';
import { TimeRangePicker } from './TimeRangePicker';

const meta = {} satisfies Meta;
export default meta;
type Story = StoryObj;

/** Both pickers as the control bar shows them; the value they would write to the URL is below. */
function Controls({ initial }: { initial: TimeRange }) {
  const [range, setRange] = useState(initial);
  const [refresh, setRefresh] = useState('off');
  return (
    <Stack gap="md" p="lg">
      <Group gap="xs">
        <TimeRangePicker value={range} onChange={setRange} />
        <RefreshPicker value={refresh} onChange={setRefresh} />
      </Group>
      <Code>{`?from=${range.from}&to=${range.to}&refresh=${refresh}`}</Code>
    </Stack>
  );
}

export const Preset: Story = { render: () => <Controls initial={{ from: 'now-24h', to: 'now' }} /> };

export const AbsoluteRange: Story = {
  render: () => <Controls initial={{ from: '2026-09-20T00:00:00.000Z', to: '2026-09-26T23:59:59.999Z' }} />,
};
