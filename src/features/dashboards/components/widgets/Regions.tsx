import { NumberFormatter, Progress, Table } from '@mantine/core';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchRegions } from '../../api/demo';
import type { WidgetProps } from '../../model/types';
import classes from './widgets.module.css';

export function Regions({ dashboardId }: WidgetProps) {
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
