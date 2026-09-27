import { ActionIcon, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useIsFetching, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { RouteBreadcrumbs } from '@/components/navigation/RouteBreadcrumbs';
import { Page } from '@/design-system/components/Page/Page';
import { iconSize, iconStroke } from '@/design-system/tokens/semantic';
import { notify } from '@/lib/notify/notify';
import { dashboardKeys, dashboardQuery } from '../api/queries';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import type { DashboardSearch } from '../model/timeRange';
import { RefreshPicker } from './controls/RefreshPicker';
import { TimeRangePicker } from './controls/TimeRangePicker';
import { DashboardGrid } from './grid/DashboardGrid';

/**
 * Dashboard view: header with the time range and refresh controls, then the widgets on the grid
 * (read-only). The range and refresh live in the URL (`?from=now-24h&to=now&refresh=1m`), so a
 * view can be shared and back / forward step through range changes; the document gives the
 * defaults.
 */
export function DashboardView() {
  const { id } = useParams({ from: '/dashboards/$id' });
  const search = useSearch({ from: '/dashboards/$id' });
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const { data: dashboard } = useSuspenseQuery(dashboardQuery(id));
  const queryClient = useQueryClient();

  const range = { from: search.from ?? dashboard.timeRange.from, to: search.to ?? dashboard.timeRange.to };
  const refresh = search.refresh ?? dashboard.refresh;
  useAutoRefresh(refresh);
  const fetching = useIsFetching({ queryKey: dashboardKeys.data }) > 0;

  const setSearch = (next: DashboardSearch) => void navigate({ search: (prev) => ({ ...prev, ...next }) });

  const refreshNow = async () => {
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.data });
    notify.success({ title: 'Dashboard refreshed', dedupeKey: `refresh:${id}` });
  };

  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>{dashboard.title}</Page.Title>
        <Page.Description>{dashboard.description}</Page.Description>
        <Page.Actions>
          <Tooltip label="Refresh all widgets">
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Refresh all widgets"
              loading={fetching}
              onClick={() => void refreshNow()}
            >
              <IconRefresh size={iconSize.md} stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        </Page.Actions>
        <Page.ControlBar aria-label="Dashboard controls">
          <TimeRangePicker value={range} onChange={setSearch} />
          <RefreshPicker value={refresh} onChange={(next) => setSearch({ refresh: next })} />
        </Page.ControlBar>
      </Page.Header>
      <Page.Body>
        <DashboardGrid dashboard={dashboard} range={range} />
      </Page.Body>
    </Page.Root>
  );
}
