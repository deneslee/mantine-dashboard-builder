import { Box, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { tokens } from './tokens';

const meta = { title: 'Design system/Tokens' } satisfies Meta;
export default meta;
type Story = StoryObj;

const chromeVars = [
  ['Navbar background', '--app-navbar-bg'],
  ['Navbar text', '--app-navbar-text'],
  ['Sidebar background', '--app-sidebar-bg'],
  ['Sidebar text', '--app-sidebar-text'],
  ['Sidebar hover', '--app-sidebar-hover'],
  ['Sidebar active', '--app-sidebar-active-bg'],
  ['Surface', '--app-surface'],
  ['Surface raised', '--app-surface-raised'],
  ['Border', '--app-border'],
] as const;

export const Overview: Story = {
  render: () => (
    <Stack p="lg" gap="xl">
      <Stack gap="sm">
        <Title order={3}>Colors</Title>
        <SimpleGrid cols={{ base: 2, md: 3, lg: 5 }} spacing="sm">
          {chromeVars.map(([label, v]) => (
            <Paper key={v} variant="panel" p="xs">
              <Box h={48} mb="xs" bdrs="sm" bg={`var(${v})`} bd="1px solid var(--app-border)" />
              <Text size="xs" fw={500}>
                {label}
              </Text>
              <Text size="xs" c="dimmed" ff="monospace">
                {v}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>

      <Group align="flex-start" gap="xl">
        <Stack gap="sm">
          <Title order={3}>Shell sizes (px)</Title>
          <Table withTableBorder w={360}>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Navbar height</Table.Td>
                <Table.Td>{tokens.shell.navbarHeight}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Sidebar expanded / compact</Table.Td>
                <Table.Td>
                  {tokens.shell.sidebar.expanded} / {tokens.shell.sidebar.compact}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Sidebar min / max</Table.Td>
                <Table.Td>
                  {tokens.shell.sidebar.min} / {tokens.shell.sidebar.max}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Context bar default</Table.Td>
                <Table.Td>{tokens.shell.contextBar.default}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Context bar min / max</Table.Td>
                <Table.Td>
                  {tokens.shell.contextBar.min} / {tokens.shell.contextBar.max}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
        <Stack gap="sm">
          <Title order={3}>Z-index ladder</Title>
          <Table withTableBorder w={280}>
            <Table.Tbody>
              {Object.entries(tokens.zIndex)
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
