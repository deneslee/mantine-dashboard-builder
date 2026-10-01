import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconSettings } from '@tabler/icons-react';
import { primitives } from './primitives';
import { iconSize, iconStroke, semantic, shape, toCssVars } from './semantic';
import { dimensions } from './dimensions';

/**
 * The token tiers (docs/design-system.md): primitives hold the raw values, semantic tokens name them per scheme,
 * and the Mantine theme binds components to them. The semantic table shows light and dark side by
 * side, whatever the toolbar scheme is.
 */
const meta = {} satisfies Meta;
export default meta;
type Story = StoryObj;

/** Raw value → primitive path, for the "points to" column. */
const primitiveOf = new Map<string, string>();
function index(node: unknown, path: string) {
  if (typeof node === 'string') {
    if (!primitiveOf.has(node)) primitiveOf.set(node, path);
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node))
      index(value, /^\d+$/.test(key) ? `${path}[${key}]` : `${path}.${key}`);
  }
}
for (const group of ['palette', 'white', 'black', 'alpha', 'shadows', 'motion', 'radius'] as const) {
  index(primitives[group], group);
}

const isColor = (value: string) => /^(#|rgba?\(|color-mix\()/.test(value);

function Swatch({ value }: { value: string }) {
  if (!isColor(value)) return null;
  return <Box w={28} h={20} bdrs="sm" bg={value} bd="1px solid var(--app-color-border-default)" />;
}

function Value({ value }: { value: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Swatch value={value} />
      <Text size="xs" ff="monospace">
        {primitiveOf.get(value) ?? value}
      </Text>
    </Group>
  );
}

const cssVars = toCssVars(semantic, '--app');
const schemeRows = Object.keys(cssVars.light).sort();
const fixedRows = Object.keys(cssVars.variables).sort();

export const Semantic: Story = {
  render: () => (
    <Stack p="lg" gap="xl">
      <Stack gap="xs">
        <Title order={3}>Per scheme</Title>
        <Text size="sm" c="dimmed">
          Feature CSS reads these variables; they switch with the color scheme.
        </Text>
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Variable</Table.Th>
              <Table.Th>Light</Table.Th>
              <Table.Th>Dark</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {schemeRows.map((name) => (
              <Table.Tr key={name}>
                <Table.Td>
                  <Code>{name}</Code>
                </Table.Td>
                <Table.Td>
                  <Value value={cssVars.light[name] ?? ''} />
                </Table.Td>
                <Table.Td>
                  <Value value={cssVars.dark[name] ?? ''} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>

      <Stack gap="xs">
        <Title order={3}>Fixed</Title>
        <Text size="sm" c="dimmed">
          The same in both schemes: radius, motion, z-index, chart sizes, shell sizes and the always-dark
          chrome.
        </Text>
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Variable</Table.Th>
              <Table.Th>Value</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {fixedRows.map((name) => (
              <Table.Tr key={name}>
                <Table.Td>
                  <Code>{name}</Code>
                </Table.Td>
                <Table.Td>
                  <Value value={cssVars.variables[name] ?? ''} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Stack>
  ),
};

export const Primitives: Story = {
  render: () => (
    <Stack p="lg" gap="xl">
      <Stack gap="xs">
        <Title order={3}>Palette</Title>
        {Object.entries(primitives.palette).map(([name, shades]) => (
          <Group key={name} gap="2xs" wrap="nowrap">
            <Text size="xs" ff="monospace" w={60}>
              {name}
            </Text>
            {shades.map((hex, i) => (
              <Box key={hex} w={48} h={32} bdrs="sm" bg={hex} title={`palette.${name}[${i}] ${hex}`} />
            ))}
          </Group>
        ))}
      </Stack>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
        <Stack gap="xs">
          <Title order={3}>Spacing</Title>
          {Object.entries(primitives.spacingPx).map(([key, px]) => (
            <Group key={key} gap="sm" wrap="nowrap">
              <Text size="xs" ff="monospace" w={40}>
                {key}
              </Text>
              <Box h={12} w={px} bg="brand.5" bdrs="xs" />
              <Text size="xs" c="dimmed">
                {px}px
              </Text>
            </Group>
          ))}
        </Stack>

        <Stack gap="xs">
          <Title order={3}>Type</Title>
          {Object.entries(primitives.fontSizesPx).map(([key, px]) => (
            <Text key={key} fz={key}>
              {key} · {px}px
            </Text>
          ))}
          {Object.entries(primitives.fontWeights).map(([key, weight]) => (
            <Text key={key} size="sm" fw={weight}>
              {key} · {weight}
            </Text>
          ))}
        </Stack>

        <Stack gap="xs">
          <Title order={3}>Icons</Title>
          {Object.entries(iconSize).map(([key, px]) => (
            <Group key={key} gap="sm">
              <IconSettings size={px} stroke={iconStroke} />
              <Text size="xs" ff="monospace">
                iconSize.{key} · {px}px
              </Text>
            </Group>
          ))}
        </Stack>
      </SimpleGrid>

      <Group align="flex-start" gap="xl">
        <Stack gap="xs">
          <Title order={3}>Shell sizes (px)</Title>
          <Table withTableBorder w={360}>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Navbar height</Table.Td>
                <Table.Td>{dimensions.shell.navbarHeight}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Sidebar expanded / compact</Table.Td>
                <Table.Td>
                  {dimensions.shell.sidebar.expanded} / {dimensions.shell.sidebar.compact}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Sidebar min / max</Table.Td>
                <Table.Td>
                  {dimensions.shell.sidebar.min} / {dimensions.shell.sidebar.max}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Context bar default / min / max</Table.Td>
                <Table.Td>
                  {dimensions.shell.contextBar.default} / {dimensions.shell.contextBar.min} /{' '}
                  {dimensions.shell.contextBar.max}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
        <Stack gap="xs">
          <Title order={3}>Z-index ladder</Title>
          <Table withTableBorder w={280}>
            <Table.Tbody>
              {Object.entries(dimensions.zIndex)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => (
                  <Table.Tr key={k}>
                    <Table.Td>{k}</Table.Td>
                    <Table.Td>{v}</Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Group>
    </Stack>
  ),
};

/** Change `shape.control` or `shape.container` in semantic.ts and every component here follows. */
export const Shape: Story = {
  render: () => (
    <Stack p="lg" gap="xl">
      <Stack gap="xs">
        <Title order={3}>
          Controls · <Code>shape.control = &apos;{shape.control}&apos;</Code>
        </Title>
        <Group>
          <Button>Button</Button>
          <Button variant="default">Default</Button>
          <ActionIcon variant="default" aria-label="Settings">
            <IconSettings size={iconSize.md} stroke={iconStroke} />
          </ActionIcon>
          <TextInput placeholder="Input" aria-label="Input" />
          <Badge color="success">Badge</Badge>
        </Group>
      </Stack>
      <Stack gap="xs">
        <Title order={3}>
          Containers · <Code>shape.container = &apos;{shape.container}&apos;</Code>
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Paper variant="panel" p="md">
            Paper · panel
          </Paper>
          <Paper variant="widget" p="md" h={80}>
            Paper · widget
          </Paper>
          <Card withBorder>Card</Card>
        </SimpleGrid>
      </Stack>
      <Stack gap="xs">
        <Title order={3}>Status aliases</Title>
        <Group>
          {(['brand', 'neutral', 'danger', 'warning', 'success', 'info'] as const).map((color) => (
            <Badge key={color} color={color} variant="light">
              {color}
            </Badge>
          ))}
        </Group>
      </Stack>
    </Stack>
  ),
};
