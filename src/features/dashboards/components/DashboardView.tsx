import {
  ActionIcon,
  Badge,
  Box,
  Group,
  NumberFormatter,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight, IconRefresh } from '@tabler/icons-react';
import { useIsFetching, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Suspense, type ReactNode } from 'react';
import { Page } from '@/design-system';
import { WidgetBoundary } from '@/features/errors';
import { TableSkeleton, TextSkeleton } from '@/features/loading';
import { notify } from '@/features/notifications';
import { fetchBroken, fetchKpis, fetchRegions } from '../api/demo';
import { dashboardQuery } from '../api/queries';
import classes from './DashboardView.module.css';

/**
 * Placeholder dashboard view. Real grid and widgets arrive in phase 2; these tiles exist to
 * exercise the loading, refetch and per-widget error paths.
 */
export function DashboardView() {
  const { id } = useParams({ from: '/dashboards/$id' });
  const { data: dashboard } = useSuspenseQuery(dashboardQuery(id));
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: ['widget', id] }) > 0;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['widget', id] });
    notify.success({ title: 'Dashboard refreshed', dedupeKey: `refresh:${id}` });
  };

  return (
    <Page.Root>
      <Page.Header
        title={dashboard.title}
        description={dashboard.description}
        actions={
          <Tooltip label="Refresh all widgets">
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Refresh all widgets"
              loading={fetching}
              onClick={() => void refresh()}
            >
              <IconRefresh size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
        }
      />
      <Page.Body>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          <Tile title="Key figures" span>
            <Suspense fallback={<TextSkeleton lines={3} label="Loading key figures" />}>
              <Kpis dashboardId={id} />
            </Suspense>
          </Tile>
          <Tile title="Revenue by region">
            <Suspense fallback={<TableSkeleton rows={5} columns={3} label="Loading regions" />}>
              <Regions dashboardId={id} />
            </Suspense>
          </Tile>
          <Tile title="HVAC alarms">
            <Suspense fallback={<TextSkeleton lines={4} label="Loading alarms" />}>
              <Broken dashboardId={id} />
            </Suspense>
          </Tile>
        </SimpleGrid>
      </Page.Body>
    </Page.Root>
  );
}

function Tile({ title, children, span }: { title: string; children: ReactNode; span?: boolean }) {
  return (
    <Paper variant="widget" className={span ? classes.span : undefined}>
      <Group className={classes.tileHeader} justify="space-between">
        <Text size="sm" fw={600}>
          {title}
        </Text>
      </Group>
      <Box className={classes.tileBody}>
        <WidgetBoundary name={title}>{children}</WidgetBoundary>
      </Box>
    </Paper>
  );
}

function Kpis({ dashboardId }: { dashboardId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['widget', dashboardId, 'kpis'],
    queryFn: ({ signal }) => fetchKpis(dashboardId, signal),
  });
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
      {data.map((k) => {
        const up = k.delta >= 0;
        const Icon = up ? IconArrowUpRight : IconArrowDownRight;
        return (
          <Stack key={k.label} gap={2}>
            <Text size="xs" c="dimmed">
              {k.label}
            </Text>
            <Text className={classes.kpi}>
              <NumberFormatter
                value={k.value}
                thousandSeparator=" "
                prefix={k.unit ? `${k.unit} ` : undefined}
              />
            </Text>
            <Group gap={2} c={up ? 'teal' : 'red'}>
              <Icon size={14} />
              <Text size="xs" fw={500}>
                {(Math.abs(k.delta) * 100).toFixed(1)}% vs last week
              </Text>
            </Group>
          </Stack>
        );
      })}
    </SimpleGrid>
  );
}

function Regions({ dashboardId }: { dashboardId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['widget', dashboardId, 'regions'],
    queryFn: ({ signal }) => fetchRegions(dashboardId, signal),
  });
  return (
    <Table verticalSpacing={6} fz="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Region</Table.Th>
          <Table.Th ta="right">Revenue (€)</Table.Th>
          <Table.Th w="30%">Share</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.map((r) => (
          <Table.Tr key={r.region}>
            <Table.Td>{r.region}</Table.Td>
            <Table.Td ta="right" className={classes.num}>
              <NumberFormatter value={r.value} thousandSeparator=" " />
            </Table.Td>
            <Table.Td>
              <Progress value={r.share * 100} size="sm" aria-label={`${r.region} share`} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function Broken({ dashboardId }: { dashboardId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['widget', dashboardId, 'broken'],
    queryFn: ({ signal }) => fetchBroken(signal),
    retry: false,
  });
  return <Badge>{String(data)}</Badge>;
}
