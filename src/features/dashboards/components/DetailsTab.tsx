import { Badge, DataList, Group, Stack, Text } from '@mantine/core';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { dashboardQuery } from '../api/queries';

/** Context-bar tab on a dashboard route: what this dashboard is. */
export function DetailsTab() {
  const { id } = useParams({ from: '/dashboards/$id' });
  const { data } = useSuspenseQuery(dashboardQuery(id));
  return (
    <Stack p="md" gap="md">
      <Stack gap={2}>
        <Text fw={600}>{data.title}</Text>
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
          <DataList.ItemValue>{data.widgetCount}</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel>Updated</DataList.ItemLabel>
          <DataList.ItemValue>{dayjs(data.updatedAt).format('D MMM YYYY, HH:mm')}</DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel>Tags</DataList.ItemLabel>
          <DataList.ItemValue>
            <Group gap={4}>
              {data.tags.map((t) => (
                <Badge key={t} size="xs" variant="light" color="gray">
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
