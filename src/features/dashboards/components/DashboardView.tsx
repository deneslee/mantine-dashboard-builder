import { ActionIcon, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useIsFetching, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Page } from '@/design-system';
import { notify } from '@/lib/notify/notify';
import { demoWidgets } from '../api/demo';
import { dashboardQuery } from '../api/queries';
import { DashboardGrid } from './grid/DashboardGrid';

/**
 * Dashboard view: header, then the widgets on the grid (read-only). The widgets are demo tiles
 * until dashboards carry their own (phase 2); they exercise loading, refetch, per-widget errors
 * and, on "Grid performance", a canvas with 20 charts.
 */
export function DashboardView() {
  const { id } = useParams({ from: '/dashboards/$id' });
  const { data: dashboard } = useSuspenseQuery(dashboardQuery(id));
  const widgets = useMemo(() => demoWidgets(id), [id]);
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
        <DashboardGrid dashboardId={id} widgets={widgets} />
      </Page.Body>
    </Page.Root>
  );
}
