import { BarChart } from '@mantine/charts';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconDots, IconFilter, IconRefresh, IconShare } from '@tabler/icons-react';
import { use, type ReactNode } from 'react';
import { expect } from 'storybook/test';
import { iconSize, iconStroke } from '../../tokens/semantic';
import { Surface } from './Surface';
import { SurfaceLevelContext, type SurfaceLevel } from './surfaceLevel';

/** Shows the level the surrounding Surface resolved to. */
function LevelLabel({ children }: { children?: ReactNode }) {
  const level = use(SurfaceLevelContext);
  return (
    <Text size="xs" c="dimmed" ff="monospace">
      {level}
      {children}
    </Text>
  );
}

const LEVELS: SurfaceLevel[] = ['canvas', 'panel', 'raised', 'sunken', 'overlay'];

interface PlaygroundArgs {
  level: SurfaceLevel | 'auto';
  material: 'solid' | 'acrylic';
  withBorder: boolean;
  nested: boolean;
}

const meta = {
  args: { level: 'auto', material: 'solid', withBorder: true, nested: true },
  argTypes: {
    level: { control: 'inline-radio', options: ['auto', ...LEVELS] },
    material: { control: 'inline-radio', options: ['solid', 'acrylic'] },
    withBorder: { control: 'boolean' },
    nested: { control: 'boolean', name: 'nest an auto Surface inside' },
  },
  render: ({ level, material, withBorder, nested }) => (
    <Surface level="canvas" withBorder={false} radius={0} p="xl" mih={360}>
      <Surface
        level={level === 'auto' ? undefined : level}
        material={material}
        withBorder={withBorder}
        p="lg"
        maw={520}
      >
        <Title order={3} size="h4">
          A surface
        </Title>
        <LevelLabel />
        {nested ? (
          <Surface p="md" mt="md">
            <Text size="sm">Nested, no level given</Text>
            <LevelLabel />
          </Surface>
        ) : null}
      </Surface>
    </Surface>
  ),
} satisfies Meta<PlaygroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every option as a control; "auto" takes one step in front of the canvas behind it. */
export const Playground: Story = {};

/** Every level on the canvas, back to front. Toggle the scheme in the toolbar to compare. */
export const Levels: Story = {
  render: () => (
    <Surface level="canvas" withBorder={false} radius={0} p="xl">
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
        {LEVELS.filter((l) => l !== 'canvas').map((level) => (
          <Surface key={level} level={level} p="lg" h={140}>
            <Text fw={600} size="sm">
              {level}
            </Text>
            <Text size="xs" c="dimmed">
              {DESCRIPTIONS[level]}
            </Text>
          </Surface>
        ))}
      </SimpleGrid>
    </Surface>
  ),
};

const DESCRIPTIONS: Record<SurfaceLevel, string> = {
  canvas: 'The page',
  panel: 'Regions: panes, sections, side bars',
  raised: 'Cards and widgets, with a shadow',
  sunken: 'Wells inside a card',
  overlay: 'Menus and popovers',
};

/**
 * Levels resolve themselves: panel on the canvas, raised on a panel, a sunken well inside the card.
 * A widget dropped anywhere gets the right look without choosing one.
 */
export const Nesting: Story = {
  render: () => (
    <Surface level="canvas" withBorder={false} radius={0} p="xl">
      <Surface p="lg" data-testid="outer">
        <LevelLabel> · a region</LevelLabel>
        <SimpleGrid cols={2} mt="md">
          <Surface p="md" data-testid="card">
            <LevelLabel> · a card</LevelLabel>
            <Surface p="sm" mt="sm" data-testid="well">
              <LevelLabel> · a well</LevelLabel>
            </Surface>
          </Surface>
          <Surface p="md">
            <LevelLabel> · a card</LevelLabel>
          </Surface>
        </SimpleGrid>
      </Surface>
    </Surface>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('outer')).toHaveAttribute('data-level', 'panel');
    await expect(canvas.getByTestId('card')).toHaveAttribute('data-level', 'raised');
    await expect(canvas.getByTestId('well')).toHaveAttribute('data-level', 'sunken');
  },
};

const ROWS = Array.from({ length: 14 }, (_, i) => ({
  month: `M${i + 1}`,
  north: 200 + ((i * 53) % 180),
  south: 140 + ((i * 37) % 160),
}));

const glyph = (Glyph: typeof IconFilter) => <Glyph size={iconSize.md} stroke={iconStroke} />;

/** Acrylic: a toolbar floating over a chart; the content shows through, blurred. */
export const Acrylic: Story = {
  render: () => (
    <Surface level="canvas" withBorder={false} radius={0} p="xl">
      <Surface level="raised" p={0} maw={760} pos="relative" style={{ overflow: 'hidden' }}>
        <Box p="md" pt={64}>
          <BarChart
            h={260}
            data={ROWS}
            dataKey="month"
            series={[
              { name: 'north', color: 'brand' },
              { name: 'south', color: 'info' },
            ]}
          />
        </Box>
        <Surface
          level="overlay"
          material="acrylic"
          radius={0}
          pos="absolute"
          top={0}
          left={0}
          right={0}
          px="md"
          py="xs"
          style={{ borderInline: 0, borderTop: 0 }}
        >
          <Group justify="space-between">
            <Text fw={600} size="sm">
              Revenue by month
            </Text>
            <Group gap={4}>
              {[
                { icon: IconFilter, label: 'Filter' },
                { icon: IconRefresh, label: 'Refresh' },
                { icon: IconShare, label: 'Share' },
              ].map(({ icon, label }) => (
                <Tooltip key={label} label={label}>
                  <ActionIcon aria-label={label}>{glyph(icon)}</ActionIcon>
                </Tooltip>
              ))}
            </Group>
          </Group>
        </Surface>
      </Surface>
    </Surface>
  ),
};

/** A dashboard-like composition: a region with widgets, a table in a well, and a menu-like overlay. */
export const Composition: Story = {
  render: () => (
    <Surface level="canvas" withBorder={false} radius={0} p="xl">
      <Stack gap="lg" maw={960}>
        <Surface p="lg">
          <Group justify="space-between" mb="md">
            <Title order={3} size="h4">
              Sales overview
            </Title>
            <Button size="xs">Add widget</Button>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Surface p="md">
              <Group justify="space-between">
                <Text fw={600} size="sm">
                  Revenue
                </Text>
                <ActionIcon aria-label="Widget menu">{glyph(IconDots)}</ActionIcon>
              </Group>
              <BarChart
                h={160}
                data={ROWS.slice(0, 6)}
                dataKey="month"
                series={[{ name: 'north', color: 'brand' }]}
              />
            </Surface>
            <Surface p="md">
              <Text fw={600} size="sm" mb="xs">
                Top regions
              </Text>
              <Surface p={0}>
                <Table>
                  <Table.Tbody>
                    {['North', 'South', 'East'].map((r, i) => (
                      <Table.Tr key={r}>
                        <Table.Td>{r}</Table.Td>
                        <Table.Td>{420 - i * 60}k</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Surface>
            </Surface>
          </SimpleGrid>
        </Surface>
        <Surface level="overlay" p="sm" maw={240}>
          <Text size="sm">Overlay: a menu or popover</Text>
        </Surface>
      </Stack>
    </Surface>
  ),
};
