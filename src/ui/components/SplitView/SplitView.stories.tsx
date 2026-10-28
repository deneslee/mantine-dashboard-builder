import { BarChart } from '@mantine/charts';
import {
  Badge,
  Box,
  Button,
  Center,
  NavLink,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Timeline,
  Toolbar,
  Tooltip,
} from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  IconAbc,
  IconBarbell,
  IconChartBar,
  IconChartLine,
  IconListDetails,
  IconNumber,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconTable,
  IconUser,
  type Icon,
} from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { iconSize, iconStroke } from '../../tokens/semantic';
import { Surface } from '../Surface/Surface';
import { SplitView } from './SplitView';
import type { PaneState } from './splitViewLayout';
import { useSplitView, useSplitViewPane } from './useSplitView';

/* ---------- Content used by the stories ---------- */

interface Item {
  id: string;
  label: string;
  description: string;
  icon: Icon;
}

const WIDGETS: Item[] = [
  { id: 'line', label: 'Line chart', description: 'Values over time', icon: IconChartLine },
  { id: 'bar', label: 'Bar chart', description: 'Compare categories', icon: IconChartBar },
  { id: 'stat', label: 'Stat', description: 'One number with a trend', icon: IconNumber },
  { id: 'table', label: 'Table', description: 'Rows and columns', icon: IconTable },
  { id: 'text', label: 'Text', description: 'Markdown notes', icon: IconAbc },
  { id: 'image', label: 'Image', description: 'A picture or logo', icon: IconPhoto },
];

const glyph = (Glyph: Icon) => <Glyph size={iconSize.md} stroke={iconStroke} />;

/** A list of cards that turns into an icon Toolbar when its pane is compact. */
function ItemList({ items, label, onPick }: { items: Item[]; label: string; onPick?: (item: Item) => void }) {
  const { isCompact, side } = useSplitViewPane();
  if (isCompact) {
    return (
      <Center pt="xs">
        <Toolbar orientation="vertical" withBorder={false} aria-label={label}>
          {items.map((item) => (
            <Tooltip key={item.id} label={item.label} position={side === 'end' ? 'left' : 'right'}>
              <Toolbar.Toggle aria-label={item.label} onClick={() => onPick?.(item)}>
                {glyph(item.icon)}
              </Toolbar.Toggle>
            </Tooltip>
          ))}
        </Toolbar>
      </Center>
    );
  }
  return (
    <Stack gap={0} p="xs" role="list" aria-label={label}>
      {items.map((item) => (
        <Box role="listitem" key={item.id}>
          <NavLink
            component="button"
            label={item.label}
            description={item.description}
            leftSection={glyph(item.icon)}
            onClick={() => onPick?.(item)}
          />
        </Box>
      ))}
    </Stack>
  );
}

/** The palette, with a Back step into a widget's settings. */
function AddWidgetPane() {
  const [picked, setPicked] = useState<Item | null>(null);
  if (picked) {
    return (
      <>
        <SplitView.Header title={`New ${picked.label}`} icon={picked.icon} onBack={() => setPicked(null)} />
        <Stack p="sm" gap="xs">
          <TextInput label="Title" defaultValue={picked.label} />
          <Button>Add to dashboard</Button>
        </Stack>
      </>
    );
  }
  return (
    <>
      <SplitView.Header title="Add widget" icon={IconPlus} />
      <ItemList items={WIDGETS} label="Widgets" onPick={setPicked} />
    </>
  );
}

/** Stands in for the dashboard grid. The button opens the side pane from outside it. */
function Canvas({ sidePane = 'side' }: { sidePane?: string }) {
  const split = useSplitView();
  return (
    <Stack p="md" gap="md">
      <Button
        leftSection={glyph(IconPlus)}
        onClick={() => split.open(sidePane)}
        disabled={split.state(sidePane) === 'open'}
        w="fit-content"
      >
        Add widget
      </Button>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        {['Revenue', 'Pipeline', 'Win rate', 'Top accounts'].map((title) => (
          <Surface key={title} level="raised" p="md" h={140}>
            <Text size="sm" fw={600}>
              {title}
            </Text>
          </Surface>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function Frame({ children, w, h = 520 }: { children: ReactNode; w?: number; h?: number }) {
  return (
    <Box p="md">
      <Surface level="canvas" h={h} w={w} style={{ overflow: 'hidden' }}>
        {children}
      </Surface>
    </Box>
  );
}

/* ---------- Playground ---------- */

interface PlaygroundArgs {
  orientation: 'horizontal' | 'vertical';
  variant: 'line' | 'grip';
  panes: 2 | 3;
  sideSize: number;
  sideMin: number;
  sideMax: number;
  defaultState: PaneState;
  canCompact: boolean;
  canClose: boolean;
  collapsible: boolean;
  drawer: boolean;
  drawerBelow: number;
  frameWidth: number;
  onStateChange: (state: PaneState) => void;
  onLayoutChange: (sizes: Record<string, unknown>) => void;
}

const meta = {
  args: {
    orientation: 'horizontal',
    variant: 'line',
    panes: 2,
    sideSize: 320,
    sideMin: 240,
    sideMax: 480,
    defaultState: 'open',
    canCompact: true,
    canClose: true,
    collapsible: false,
    drawer: true,
    drawerBelow: 640,
    frameWidth: 1000,
    onStateChange: fn(),
    onLayoutChange: fn(),
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'inline-radio', options: ['line', 'grip'] },
    panes: { control: 'inline-radio', options: [2, 3] },
    sideSize: { control: { type: 'range', min: 120, max: 600, step: 8 }, name: 'side pane size (px)' },
    sideMin: { control: { type: 'range', min: 80, max: 400, step: 8 }, name: 'side pane min (px)' },
    sideMax: { control: { type: 'range', min: 240, max: 800, step: 8 }, name: 'side pane max (px)' },
    defaultState: { control: 'inline-radio', options: ['open', 'compact', 'collapsed', 'closed'] },
    canCompact: { control: 'boolean' },
    canClose: { control: 'boolean' },
    collapsible: { control: 'boolean', name: 'collapsible (drag past min)' },
    drawer: { control: 'boolean', name: 'Drawer when narrow' },
    drawerBelow: { control: { type: 'range', min: 320, max: 1200, step: 20 } },
    frameWidth: { control: { type: 'range', min: 360, max: 1400, step: 20 }, name: 'container width (px)' },
  },
  render: (args) => (
    <Frame w={args.frameWidth} h={args.orientation === 'vertical' ? 640 : 520}>
      {/* Remount when a default changes, since defaults only apply on mount. */}
      <SplitView.Root
        key={`${args.defaultState}-${args.sideSize}-${args.panes}-${args.orientation}`}
        orientation={args.orientation}
        variant={args.variant}
        drawerBelow={args.drawerBelow}
        onLayoutChange={args.onLayoutChange}
      >
        {args.panes === 3 ? (
          <SplitView.Pane
            id="outline"
            level="panel"
            label="Outline"
            defaultSize="220px"
            min="160px"
            max="360px"
            canCompact={args.canCompact}
            canClose={args.canClose}
          >
            <SplitView.Header title="Outline" icon={IconListDetails} />
            <ItemList items={WIDGETS.slice(0, 4)} label="Outline" />
          </SplitView.Pane>
        ) : null}
        <SplitView.Pane id="canvas" label="Canvas" level="canvas" defaultSize={100} min="240px">
          <Canvas />
        </SplitView.Pane>
        <SplitView.Pane
          id="side"
          level="panel"
          label="Add widget"
          defaultSize={`${args.sideSize}px`}
          min={`${args.sideMin}px`}
          max={`${args.sideMax}px`}
          defaultState={args.defaultState}
          canCompact={args.canCompact}
          canClose={args.canClose}
          collapsible={args.collapsible}
          fallback={args.drawer ? 'drawer' : undefined}
          onStateChange={args.onStateChange}
        >
          <AddWidgetPane />
        </SplitView.Pane>
      </SplitView.Root>
    </Frame>
  ),
} satisfies Meta<PlaygroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every option as a control. Defaults show the editor: canvas plus an "Add widget" pane. */
export const Playground: Story = {};

/** The editor's side pane: pick a widget, then Back from its settings to the list. */
export const EditorPane: Story = {
  args: { canCompact: false },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Bar chart/ }));
    await expect(canvas.getByRole('heading', { name: 'New Bar chart' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(canvas.getByRole('heading', { name: 'Add widget' })).toBeVisible();
  },
};

/** The same pane as an icon rail; the header icon expands it and focus lands on its title. */
export const Compact: Story = {
  args: { defaultState: 'compact' },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByRole('toolbar', { name: 'Widgets' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Expand Add widget' }));
    await expect(args.onStateChange).toHaveBeenCalledWith('open');
    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Add widget' })).toHaveFocus());
  },
};

/** Three columns, both outer panes compactable. */
export const ThreePanes: Story = { args: { panes: 3 } };

/** Stacked: the side pane sits under the canvas. */
export const Vertical: Story = { args: { orientation: 'vertical', canCompact: false, sideSize: 220 } };

/** In a container narrower than `drawerBelow`, the side pane opens as a Drawer. */
export const Narrow: Story = {
  args: { frameWidth: 480 },
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body;
    await waitFor(() =>
      expect(body.querySelector('[role="dialog"][aria-label="Add widget"]')).not.toBeNull(),
    );
  },
};

/**
 * Keyboard: the trigger opens the pane and focus moves to its title; arrow keys on the handle
 * resize it; Escape closes it and focus returns to the trigger.
 */
export const Keyboard: Story = {
  args: { defaultState: 'closed' },
  play: async ({ canvas, args }) => {
    const trigger = await canvas.findByRole('button', { name: 'Add widget' });
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Add widget' })).toHaveFocus());

    const handle = canvas.getByRole('separator');
    handle.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(args.onLayoutChange).toHaveBeenCalled());

    canvas.getByRole('heading', { name: 'Add widget' }).focus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onStateChange).toHaveBeenLastCalledWith('closed');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/* ---------- Other layouts ---------- */

const ROWS = [
  { region: 'North', revenue: 420, deals: 31 },
  { region: 'South', revenue: 310, deals: 24 },
  { region: 'East', revenue: 280, deals: 19 },
  { region: 'West', revenue: 365, deals: 27 },
];

function WidgetSplit({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  return (
    <Box p="md">
      <Surface
        level="raised"
        w={720}
        h={orientation === 'horizontal' ? 300 : 460}
        style={{ overflow: 'hidden' }}
      >
        <SplitView.Root orientation={orientation} variant="grip">
          <SplitView.Pane id="chart" label="Chart" defaultSize={60} min={25} collapsible>
            <Box p="sm" h="100%">
              <BarChart
                h="100%"
                data={ROWS}
                dataKey="region"
                series={[{ name: 'revenue', color: 'brand' }]}
              />
            </Box>
          </SplitView.Pane>
          <SplitView.Pane id="table" label="Table" defaultSize={40} min={20} collapsible>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Region</Table.Th>
                  <Table.Th>Revenue</Table.Th>
                  <Table.Th>Deals</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ROWS.map((row) => (
                  <Table.Tr key={row.region}>
                    <Table.Td>{row.region}</Table.Td>
                    <Table.Td>{row.revenue}k</Table.Td>
                    <Table.Td>{row.deals}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </SplitView.Pane>
        </SplitView.Root>
      </Surface>
    </Box>
  );
}

/** Inside a widget: chart | table, both collapsible, `%` sizes so they follow the tile's width. */
export const InWidget: Story = { render: () => <WidgetSplit orientation="horizontal" /> };

/** Inside a widget, stacked. */
export const InWidgetStacked: Story = { render: () => <WidgetSplit orientation="vertical" /> };

const EXERCISES: Item[] = [
  { id: 'squat', label: 'Squat', description: 'Legs · 3 × 10', icon: IconBarbell },
  { id: 'bridge', label: 'Glute bridge', description: 'Hips · 3 × 12', icon: IconBarbell },
  { id: 'row', label: 'Band row', description: 'Back · 3 × 15', icon: IconBarbell },
  { id: 'plank', label: 'Plank', description: 'Core · 3 × 30 s', icon: IconBarbell },
  { id: 'lunge', label: 'Lunge', description: 'Legs · 2 × 8', icon: IconBarbell },
  { id: 'press', label: 'Shoulder press', description: 'Shoulders · 3 × 10', icon: IconBarbell },
];

function Planner() {
  const [plan, setPlan] = useState<Item[]>(EXERCISES.slice(0, 2));
  const [query, setQuery] = useState('');
  const found = EXERCISES.filter((e) => e.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <Frame w={1200} h={560}>
      <SplitView.Root>
        <SplitView.Pane
          id="plan"
          label="Plan"
          level="panel"
          defaultSize="280px"
          min="220px"
          max="420px"
          canCompact
        >
          <SplitView.Header title="Plan" icon={IconListDetails}>
            <Badge variant="light">{plan.length}</Badge>
          </SplitView.Header>
          <PlanList plan={plan} />
        </SplitView.Pane>
        <SplitView.Pane id="exercises" label="Exercises" level="canvas" defaultSize={100} min="320px">
          <SplitView.Header title="Exercises" icon={IconBarbell} />
          <Stack p="sm" gap="sm">
            <TextInput
              aria-label="Search exercises"
              placeholder="Search exercises"
              leftSection={glyph(IconSearch)}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
              {found.map((e) => (
                <Surface key={e.id} level="raised" p="sm">
                  <Text size="sm" fw={600}>
                    {e.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {e.description}
                  </Text>
                  <Button size="xs" variant="light" mt="xs" onClick={() => setPlan((p) => [...p, e])}>
                    Add to plan
                  </Button>
                </Surface>
              ))}
            </SimpleGrid>
          </Stack>
        </SplitView.Pane>
        <SplitView.Pane
          id="body"
          level="panel"
          label="Body map"
          defaultSize="260px"
          min="200px"
          max="400px"
          canCompact
          canClose
        >
          <SplitView.Header title="Body map" icon={IconUser} />
          <BodyMap />
        </SplitView.Pane>
      </SplitView.Root>
    </Frame>
  );
}

function PlanList({ plan }: { plan: Item[] }) {
  const { isCompact } = useSplitViewPane();
  if (isCompact) return <ItemList items={plan} label="Plan" />;
  return (
    <Box p="sm">
      <Timeline bulletSize={20} lineWidth={2}>
        {plan.map((e, i) => (
          <Timeline.Item key={`${e.id}-${i}`} title={e.label}>
            <Text size="xs" c="dimmed">
              {e.description}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </Box>
  );
}

function BodyMap() {
  const { isCompact } = useSplitViewPane();
  if (isCompact) return null;
  return (
    <Center h="100%" p="md">
      <Text size="sm" c="dimmed">
        Body map
      </Text>
    </Center>
  );
}

/**
 * A three-column page, e.g. a therapy planner: plan | exercise search | body map. The outer panes
 * compact to rails; the body map can also close.
 */
export const Planner3Column: Story = { render: () => <Planner /> };
