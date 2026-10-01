import { Group, NumberFormatter, Stack, Text } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import { fontWeight, iconSize, iconStroke } from '@/ui/tokens/semantic';
import { getFieldLabel, getUnitAffix, type Field } from '@/core/data/DataFrame';
import type { WidgetProps } from '@/plugins/WidgetPlugin';
import classes from './Stats.module.css';

/** The last value in the range, and its change since the first. */
function stat(field: Field) {
  const values = field.values.filter((v): v is number => typeof v === 'number');
  const first = values[0];
  const last = values.at(-1);
  const change = first && last !== undefined && values.length > 1 ? (last - first) / first : undefined;
  return { field, last, change };
}

/** One stat per number field of the first frame, as Grafana's stat panel does. */
export function Stats({ frames }: WidgetProps<unknown>) {
  const stats = (frames[0]?.fields ?? []).filter((field) => field.type === 'number').map(stat);
  return (
    <div className={classes.stats}>
      {stats.map(({ field, last, change }) => {
        const isUp = (change ?? 0) >= 0;
        const Icon = isUp ? IconArrowUpRight : IconArrowDownRight;
        return (
          <Stack key={field.name} gap="3xs" className={classes.stat}>
            <Text size="xs" c="dimmed">
              {getFieldLabel(field)}
            </Text>
            <Text className={classes.value}>
              {last === undefined ? (
                '–'
              ) : (
                <NumberFormatter value={last} thousandSeparator=" " {...getUnitAffix(field.config?.unit)} />
              )}
            </Text>
            {change === undefined ? null : (
              <Group gap="3xs" c={isUp ? 'success' : 'danger'}>
                <Icon size={iconSize.xs} stroke={iconStroke} aria-hidden />
                <Text size="xs" fw={fontWeight.medium}>
                  {isUp ? '+' : '−'}
                  {(Math.abs(change) * 100).toFixed(1)}% vs start of range
                </Text>
              </Group>
            )}
          </Stack>
        );
      })}
    </div>
  );
}
