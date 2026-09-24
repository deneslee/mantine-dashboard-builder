import { Badge, Code, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconActivity,
  IconAlertTriangle,
  IconChartDots,
  IconCheck,
  IconFileCode,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { useState } from 'react';
import { getSentryStatus } from '@/lib/sentry/client';

export function SentryStatusCard() {
  const [status] = useState(getSentryStatus);

  const featureList = [
    {
      label: 'Error Tracking',
      icon: IconAlertTriangle,
      active: status.features.errors,
      desc: 'Global unhandled crashes & route errors',
    },
    {
      label: 'Structured Logs',
      icon: IconFileCode,
      active: status.features.logs,
      desc: 'Sentry.logger & console log ingestion',
    },
    {
      label: 'App Metrics',
      icon: IconChartDots,
      active: status.features.metrics,
      desc: 'Counters, distributions & gauges',
    },
    {
      label: 'Session Replay',
      icon: IconPlayerPlay,
      active: status.features.replay,
      desc: '100% on error & sampling in dev',
    },
    {
      label: 'Router Tracing',
      icon: IconActivity,
      active: status.features.tracing,
      desc: 'TanStack Router navigation spans',
    },
  ];

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <div>
          <Text fw={600} size="sm">
            Active Instrumentation Subsystems
          </Text>
          <Text size="xs" c="dimmed">
            Telemetry channels enabled and active for this project
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {featureList.map((f) => {
            const Icon = f.icon;
            return (
              <Paper key={f.label} p="xs" radius="sm" withBorder>
                <Group justify="space-between" mb={4}>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color={f.active ? 'teal' : 'gray'}>
                      <Icon size={14} />
                    </ThemeIcon>
                    <Text size="xs" fw={600}>
                      {f.label}
                    </Text>
                  </Group>
                  <Badge size="xs" color="teal" variant="dot">
                    Active
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {f.desc}
                </Text>
              </Paper>
            );
          })}
        </SimpleGrid>

        <Group gap="xl" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed">
              Environment
            </Text>
            <Code>{status.environment}</Code>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Release
            </Text>
            <Code>{status.release}</Code>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              DSN Endpoint
            </Text>
            <Code>{status.dsn}</Code>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              SDK Version
            </Text>
            <Group gap={4}>
              <IconCheck size={14} color="var(--mantine-color-teal-6)" />
              <Text size="xs" fw={500}>
                @sentry/react 10.75.2
              </Text>
            </Group>
          </div>
        </Group>
      </Stack>
    </Paper>
  );
}
