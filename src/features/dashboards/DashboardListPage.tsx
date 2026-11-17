import { Alert, Badge, Button, Card, EmptyState, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconLayoutDashboard, IconPlus } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useActivePlace } from '@/lib/records/activeRecordProvider';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { fontWeight, iconSize, iconStroke } from '@/ui/tokens/semantic';
import { dashboardListQuery } from './data/dashboardQueries';
import classes from './DashboardListPage.module.css';

dayjs.extend(relativeTime);

export function DashboardListPage() {
  const place = useActivePlace();
  const {
    data: { items: data, placeError },
  } = useSuspenseQuery(dashboardListQuery(place));

  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>Dashboards</Page.Title>
        <Page.Description>{`${data.length} dashboards`}</Page.Description>
        <Page.Actions>
          <Badge
            variant="light"
            color="neutral"
            size="lg"
            renderRoot={(props) => <Link to="/storage/$id" params={{ id: place.id }} {...props} />}
          >
            {`Save destination: ${place.name}`}
          </Badge>
          <Button
            size="sm"
            leftSection={<IconPlus size={iconSize.sm} />}
            disabled
            title="Builder arrives in phase 3"
          >
            New dashboard
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Body>
        <Stack gap="md">
          {placeError && (
            <Alert color="warning" title={`Couldn't read ${placeError.placeName}: ${placeError.message}`}>
              <Group gap="sm">
                <Text size="sm">The built-in dashboards are shown.</Text>
                <Button size="xs" variant="default" renderRoot={(props) => <Link to="/storage" {...props} />}>
                  Open Storage
                </Button>
              </Group>
            </Alert>
          )}
          {data.length === 0 ? (
            <EmptyState
              mt="xl"
              variant="light"
              icon={<IconLayoutDashboard size={iconSize.lg} stroke={iconStroke} />}
              title="No dashboards yet"
              description="Create one from scratch or start from a template."
            />
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
              {data.map((d) => (
                <Card
                  key={d.id}
                  withBorder
                  padding="md"
                  className={classes.card}
                  renderRoot={(props) => <Link to="/dashboards/$id" params={{ id: d.id }} {...props} />}
                >
                  <Group justify="space-between" wrap="nowrap" mb="xs">
                    <Text fw={fontWeight.medium} truncate>
                      {d.title}
                    </Text>
                    <Text size="xs" c="dimmed" className={classes.nowrap}>
                      {d.widgetCount} widgets
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed" lineClamp={2} mb="md">
                    {d.description}
                  </Text>
                  <Group justify="space-between" mt="auto">
                    <Group gap="2xs">
                      {d.tags.map((t) => (
                        <Badge key={t} size="xs" variant="light" color="neutral">
                          {t}
                        </Badge>
                      ))}
                    </Group>
                    <Text size="xs" c="dimmed">
                      Updated {dayjs(d.updatedAt).fromNow()}
                    </Text>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}
