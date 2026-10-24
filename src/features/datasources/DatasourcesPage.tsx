import { Anchor, Badge, Button, Code, EmptyState, Group, Menu, Stack, Table, Text } from '@mantine/core';
import { IconChevronDown, IconDatabase, IconPlus } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { Connection } from '@/plugins/OptionalPlugin';
import { usePlugins } from '@/plugins/usePlugins';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { Section, SectionBody } from '@/ui/components/Section';
import { fontWeight, iconSize, iconStroke } from '@/ui/tokens/semantic';
import { useConnections } from './connections/useConnections';
import { PluginsSection } from './PluginsSection';
import { CONNECTION_STATUS, useConnectionStatus } from './useConnectionStatus';
import { VaultStatus } from './vault/VaultStatus';

/** `/datasources`: the connections widgets query, the built-in datasources, and the optional plugins. */
export function DatasourcesPage() {
  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>Data sources</Page.Title>
        <Page.Description>
          Connections your widgets query, and the plugins that provide them. Secrets stay in this browser.
        </Page.Description>
        <Page.Actions>
          <VaultStatus />
          <AddConnectionMenu />
        </Page.Actions>
      </Page.Header>
      <Page.Body>
        <Stack gap="lg">
          <ConnectionsSection />
          <PluginsSection />
          <BuiltInSection />
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}

/** A menu of the datasource types in this build; each opens a new connection's form. */
function AddConnectionMenu() {
  const types = Object.values(usePlugins().types);
  if (types.length === 0) return null;
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <Button
          leftSection={<IconPlus size={iconSize.sm} stroke={iconStroke} />}
          rightSection={<IconChevronDown size={iconSize.sm} stroke={iconStroke} />}
        >
          Add connection
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {types.map((type) => (
          <Menu.Item
            key={type.type}
            leftSection={<type.icon size={iconSize.sm} stroke={iconStroke} />}
            renderRoot={(props) => <Link to="/datasources/new" search={{ type: type.type }} {...props} />}
          >
            {type.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function ConnectionsSection() {
  const connections = useConnections();
  const hasTypes = Object.keys(usePlugins().types).length > 0;
  return (
    <Section title="Connections" description="Queries name a connection by its id.">
      {connections.length === 0 ? (
        <SectionBody>
          <EmptyState
            variant="light"
            color="neutral"
            icon={<IconDatabase size={iconSize.lg} stroke={iconStroke} />}
            title="No connections yet"
            description={
              hasTypes
                ? 'Add one with Add connection, then name its id in a widget’s queries.'
                : 'Add a plugin to the build first: Azure SQL, MongoDB, AWS or Google Cloud.'
            }
          />
        </SectionBody>
      ) : (
        <Table.ScrollContainer minWidth={560}>
          <Table verticalSpacing="sm" horizontalSpacing="lg">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Id</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {connections.map((connection) => (
                <ConnectionRow key={connection.id} connection={connection} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Section>
  );
}

function ConnectionRow({ connection }: { connection: Connection }) {
  const type = usePlugins().types[connection.type];
  const status = CONNECTION_STATUS[useConnectionStatus(connection)];
  return (
    <Table.Tr>
      <Table.Td>
        <Anchor
          fw={fontWeight.medium}
          renderRoot={(props) => <Link to="/datasources/$id" params={{ id: connection.id }} {...props} />}
        >
          {connection.name}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          {type ? <type.icon size={iconSize.sm} stroke={iconStroke} /> : null}
          <Text size="sm">{type?.name ?? connection.type}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Code>{connection.id}</Code>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color={status.color}>
          {status.label}
        </Badge>
      </Table.Td>
    </Table.Tr>
  );
}

function BuiltInSection() {
  const { datasources } = usePlugins();
  const builtIns = [
    { id: 'mock', description: 'Generated data for demos and tests.' },
    { id: 'local-json', description: 'Data frames from JSON files under public/data.' },
  ].filter(({ id }) => datasources[id]);
  return (
    <Section title="Built in" description="Always there, with nothing to set up.">
      <Table verticalSpacing="sm" horizontalSpacing="lg">
        <Table.Tbody>
          {builtIns.map(({ id, description }) => (
            <Table.Tr key={id}>
              <Table.Td>
                <Text size="sm" fw={fontWeight.medium}>
                  {datasources[id]?.name}
                </Text>
              </Table.Td>
              <Table.Td>
                <Code>{id}</Code>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {description}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Section>
  );
}
