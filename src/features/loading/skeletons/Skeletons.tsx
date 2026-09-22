import { Box, Group, Paper, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import type { ReactNode } from 'react';
import classes from './Skeletons.module.css';

/**
 * Named skeletons shaped like what arrives. Each region is `aria-busy` with one hidden "Loading" label;
 * the placeholder shapes themselves are hidden from assistive tech.
 */
function Region({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <Box aria-busy="true" aria-live="polite" className={className}>
      <span className={classes.srOnly}>{label}</span>
      <Box aria-hidden="true" h="100%">
        {children}
      </Box>
    </Box>
  );
}

export function TextSkeleton({ lines = 4, label = 'Loading text' }: { lines?: number; label?: string }) {
  return (
    <Region label={label}>
      <Stack gap={8}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} height={10} width={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </Stack>
    </Region>
  );
}

const barHeights = [45, 70, 55, 85, 40, 65, 75];

export function ChartSkeleton({ label = 'Loading chart' }: { label?: string }) {
  return (
    <Region label={label} className={classes.fill}>
      <Box className={classes.chart}>
        <Stack gap={0} justify="space-between" className={classes.yAxis}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={8} width={24} />
          ))}
        </Stack>
        <Group className={classes.bars} align="flex-end" gap="xs" wrap="nowrap">
          {barHeights.map((h, i) => (
            <Skeleton key={i} className={classes.bar} height={`${h}%`} radius="xs" />
          ))}
        </Group>
      </Box>
    </Region>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  label = 'Loading table',
}: {
  rows?: number;
  columns?: number;
  label?: string;
}) {
  return (
    <Region label={label}>
      <Stack gap={0}>
        <Group gap="md" wrap="nowrap" className={classes.tableRow} data-header>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} height={10} className={classes.cell} />
          ))}
        </Group>
        {Array.from({ length: rows }, (_, r) => (
          <Group key={r} gap="md" wrap="nowrap" className={classes.tableRow}>
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} height={8} className={classes.cell} width={c === 0 ? '80%' : undefined} />
            ))}
          </Group>
        ))}
      </Stack>
    </Region>
  );
}

/** Context-bar and side-panel content. */
export function PanelSkeleton({ label = 'Loading panel' }: { label?: string }) {
  return (
    <Region label={label}>
      <Stack gap="md" p="sm">
        {[0, 1, 2].map((i) => (
          <Group key={i} gap="sm" wrap="nowrap" align="flex-start">
            <Skeleton height={28} circle />
            <Stack gap={6} className={classes.grow}>
              <Skeleton height={10} width="70%" />
              <Skeleton height={8} />
              <Skeleton height={8} width="40%" />
            </Stack>
          </Group>
        ))}
      </Stack>
    </Region>
  );
}

/** Route-level: page header plus a grid of tiles, matching the dashboard view. */
export function DashboardSkeleton({ label = 'Loading dashboard' }: { label?: string }) {
  return (
    <Region label={label}>
      <Stack gap="lg" p="lg">
        <Group justify="space-between">
          <Stack gap={8}>
            <Skeleton height={20} width={220} />
            <Skeleton height={10} width={320} />
          </Stack>
          <Group gap="xs">
            <Skeleton height={30} width={90} />
            <Skeleton height={30} width={30} />
          </Group>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Paper key={i} variant="panel" p="md" h={220}>
              <Stack gap="sm" h="100%">
                <Skeleton height={12} width="40%" />
                <Box className={classes.grow}>
                  {i % 3 === 1 ? <TableSkeleton rows={4} columns={3} /> : <ChartSkeleton />}
                </Box>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </Region>
  );
}

/** Route-level: a list page (dashboards, data sources). */
export function ListSkeleton({ rows = 6, label = 'Loading list' }: { rows?: number; label?: string }) {
  return (
    <Region label={label}>
      <Stack gap="lg" p="lg">
        <Skeleton height={20} width={200} />
        <Stack gap="xs">
          {Array.from({ length: rows }, (_, i) => (
            <Paper key={i} variant="panel" p="sm">
              <Group gap="sm" wrap="nowrap">
                <Skeleton height={32} width={32} />
                <Stack gap={6} className={classes.grow}>
                  <Skeleton height={10} width="35%" />
                  <Skeleton height={8} width="60%" />
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Region>
  );
}
