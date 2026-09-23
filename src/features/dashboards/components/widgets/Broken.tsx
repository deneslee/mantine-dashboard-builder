import { Badge } from '@mantine/core';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchBroken } from '../../api/demo';
import type { WidgetProps } from '../../model/types';

/** Always fails: shows the per-tile error boundary. */
export function Broken({ dashboardId }: WidgetProps) {
  const { data } = useSuspenseQuery({
    queryKey: ['widget', dashboardId, 'broken'],
    queryFn: ({ signal }) => fetchBroken(signal),
    retry: false,
  });
  return <Badge>{String(data)}</Badge>;
}
