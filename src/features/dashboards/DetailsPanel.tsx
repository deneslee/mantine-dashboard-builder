import { Badge, DataList, Group, Stack, Text } from '@mantine/core';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { fontWeight } from '@/ui/tokens/semantic';
import { dashboardQuery } from './data/dashboardQueries';

/** Context-bar tab on a dashboard route: what this dashboard is. */
export function DetailsTab() {
  const { id } = useParams({ from: '/dashboards/$id' });
  const { data } = useSuspenseQuery(dashboardQuery(id));
  return (
    <Stack p="md" gap="md">
      <Stack gap="3xs">
        <Text fw={fontWeight.medium}>{data.title}</Text>
        <Text size="sm" c="dimmed">
          {data.description}
        </Text>
      </Stack>
      <DataList size="sm" labelWidth={90} withDivider>
        <DataList.Item>
          <DataList.ItemLabel>Id</DataList.ItemLabel>
          <DataList.ItemValue>{data.id}</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel>Widgets</DataList.ItemLabel>
          <DataList.ItemValue>{Object.keys(data.widgets).length}</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel>Updated</DataList.ItemLabel>
          <DataList.ItemValue>{dayjs(data.updatedAt).format('D MMM YYYY, HH:mm')}</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel>Tags</DataList.ItemLabel>
          <DataList.ItemValue>
            <Group gap="2xs">
              {data.tags.map((t) => (
                <Badge key={t} size="xs" variant="light" color="neutral">
                  {t}
                </Badge>
              ))}
            </Group>
          </DataList.ItemValue>
        </DataList.Item>
      </DataList>
    </Stack>
  );
}
