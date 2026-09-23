import { Group, NumberFormatter, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchKpis } from '../../api/demo';
import type { WidgetProps } from '../../model/types';
import classes from './widgets.module.css';

export function Kpis({ dashboardId }: WidgetProps) {
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
