import {
  Badge,
  Card,
  Center,
  EmptyState,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import {
  IconChevronRight,
  IconLayoutGrid,
  IconList,
  IconPlugConnected,
  IconSearch,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Page } from '@/design-system';
import { getIntegrations } from '../registry';
import classes from './IntegrationsCatalog.module.css';

export function IntegrationsCatalog() {
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  const [query, setQuery] = useState('');

  const allIntegrations = getIntegrations();
  const integrations = allIntegrations.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Page.Root>
      <Page.Header
        title="Integrations & Plugins"
        description="Connect application observability, telemetry, and external providers"
        actions={
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(val) => setViewMode(val as 'grid' | 'row')}
            data={[
              {
                value: 'grid',
                label: (
                  <Center>
                    <IconLayoutGrid size={16} />
                  </Center>
                ),
              },
              {
                value: 'row',
                label: (
                  <Center>
                    <IconList size={16} />
                  </Center>
                ),
              },
            ]}
          />
        }
      />
      <Page.Body>
        <Stack gap="md">
          <TextInput
            placeholder="Search integrations…"
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            maw={360}
          />

          {integrations.length === 0 ? (
            <EmptyState
              mt="xl"
              variant="light"
              icon={<IconPlugConnected size={22} />}
              title="No integrations found"
              description="Try adjusting your search criteria."
            />
          ) : viewMode === 'grid' ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {integrations.map((item) => {
                const Icon = item.icon;
                const isConnected = item.status === 'connected';

                return (
                  <Card
                    key={item.id}
                    withBorder
                    padding="md"
                    className={classes.card}
                    renderRoot={(props) => <Link to={item.to} {...props} />}
                  >
                    <Stack justify="space-between" h="100%" gap="md">
                      <Stack gap="xs">
                        <Group justify="space-between" align="center">
                          <ThemeIcon size="lg" radius="md" variant="filled" color="#7553FF" c="white">
                            <Icon size={22} />
                          </ThemeIcon>
                          <Badge color={isConnected ? 'teal' : 'yellow'} variant="light" size="sm">
                            {isConnected ? 'Connected' : 'Not configured'}
                          </Badge>
                        </Group>

                        <div>
                          <Text fw={600} size="sm">
                            {item.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.category}
                          </Text>
                        </div>

                        <Text size="xs" c="dimmed" lineClamp={3}>
                          {item.description}
                        </Text>
                      </Stack>

                      <Group gap={4} wrap="wrap">
                        {item.features.map((feat) => (
                          <Badge key={feat} size="xs" variant="outline" color="gray">
                            {feat}
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          ) : (
            <Stack gap="sm">
              {integrations.map((item) => {
                const Icon = item.icon;
                const isConnected = item.status === 'connected';

                return (
                  <Paper
                    key={item.id}
                    withBorder
                    p="sm"
                    radius="md"
                    className={classes.row}
                    renderRoot={(props) => <Link to={item.to} {...props} />}
                  >
                    <Group justify="space-between" w="100%" wrap="nowrap">
                      <Group gap="md" wrap="nowrap">
                        <ThemeIcon size="lg" radius="md" variant="filled" color="#7553FF" c="white">
                          <Icon size={22} />
                        </ThemeIcon>
                        <div>
                          <Group gap="xs" align="center">
                            <Text fw={600} size="sm">
                              {item.name}
                            </Text>
                            <Badge color={isConnected ? 'teal' : 'yellow'} variant="light" size="xs">
                              {isConnected ? 'Connected' : 'Not configured'}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {item.description}
                          </Text>
                        </div>
                      </Group>

                      <Group gap="md" wrap="nowrap">
                        <Group gap={4} wrap="wrap" visibleFrom="sm">
                          {item.features.map((feat) => (
                            <Badge key={feat} size="xs" variant="outline" color="gray">
                              {feat}
                            </Badge>
                          ))}
                        </Group>
                        <IconChevronRight size={18} color="var(--mantine-color-dimmed)" />
                      </Group>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}
