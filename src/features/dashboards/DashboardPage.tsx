import { Alert, Button, Group, Text, VisuallyHidden } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { dimensions } from '@/ui/tokens/dimensions';
import type { DashboardSearch } from './dashboardSearch';
import { useAutoRefresh } from './data/useAutoRefresh';
import { LeaveDialog } from './editor/LeaveDialog';
import { DashboardGrid } from './grid/DashboardGrid';
import { downloadDashboard } from './header/dashboardFile';
import { EditToolbar } from './header/EditToolbar';
import { RefreshButton } from './header/RefreshButton';
import { RefreshPicker } from './header/RefreshPicker';
import { TimeRangePicker } from './header/TimeRangePicker';
import { useDashboard, useDashboardActions, useReadDashboard } from './state/useDashboard';

const EditDrawer = lazy(() =>
  import('./editor/EditDrawer').then((module) => ({ default: module.EditDrawer })),
);

/** The edit store's screen-reader messages ("Moved Revenue to …"), in a leaf so they re-render nothing else. */
function Announcer() {
  const announcement = useDashboard((s) => s.announcement);
  return (
    <VisuallyHidden role="status" aria-live="polite">
      {announcement}
    </VisuallyHidden>
  );
}

/** `/dashboards/$id`: the header, the time controls, the grid, and in edit mode the editing tools. */
export function DashboardPage() {
  const { id } = useParams({ from: '/dashboards/$id' });
  const search = useSearch({ from: '/dashboards/$id' });
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const actions = useDashboardActions();
  const read = useReadDashboard();
  const title = useDashboard((s) => s.doc.title);
  const description = useDashboard((s) => s.doc.description);
  const defaultRange = useDashboard((s) => s.timeRange);
  const defaultRefresh = useDashboard((s) => s.refresh);
  const draftError = useDashboard((s) => s.draftError);
  const isEmpty = useDashboard((s) => s.doc.layouts.lg.length === 0);
  const isQueryEditorOpen = useDashboard(
    (s) => search.editor === 'queries' && !!s.doc.widgets[search.widget ?? ''],
  );
  const isWide = useMediaQuery(`(min-width: ${dimensions.grid.breakpoints.md}px)`, true);
  const isEditing = search.mode === 'edit';
  const range = isEditing
    ? defaultRange
    : { from: search.from ?? defaultRange.from, to: search.to ?? defaultRange.to };
  const refresh = isEditing ? defaultRefresh : (search.refresh ?? defaultRefresh);
  useAutoRefresh(refresh);
  // The URL holds only what differs from the dashboard's own defaults.
  const setSearch = (next: DashboardSearch) =>
    void navigate({
      search: (prev) => ({
        ...prev,
        ...next,
        from: (next.from ?? prev.from) === defaultRange.from ? undefined : (next.from ?? prev.from),
        to: (next.to ?? prev.to) === defaultRange.to ? undefined : (next.to ?? prev.to),
        refresh:
          (next.refresh ?? prev.refresh) === defaultRefresh ? undefined : (next.refresh ?? prev.refresh),
      }),
      resetScroll: false,
    });
  return (
    <Page.Root>
      <Announcer />
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>{title}</Page.Title>
        <Page.Description>{description}</Page.Description>
        <Page.Actions>
          <Button variant="default" onClick={() => downloadDashboard(read())}>
            Export JSON
          </Button>
          {!isEditing && isWide && (
            <Button
              renderRoot={(props) => (
                <Link
                  to="/dashboards/$id"
                  params={{ id }}
                  search={(prev) => ({ ...prev, mode: 'edit' })}
                  {...props}
                />
              )}
            >
              Edit dashboard
            </Button>
          )}
          <RefreshButton />
        </Page.Actions>
        <Page.ControlBar aria-label="Dashboard controls">
          <TimeRangePicker value={range} onChange={isEditing ? actions.setRange : setSearch} />
          <RefreshPicker
            value={refresh}
            onChange={isEditing ? actions.setRefresh : (next) => setSearch({ refresh: next })}
          />
          {isEditing && <EditToolbar isWide={isWide} />}
        </Page.ControlBar>
      </Page.Header>
      <Page.Body>
        {draftError && (
          <Alert color="danger" title="Draft storage">
            {draftError}
          </Alert>
        )}
        {isEditing && !isWide && (
          <Alert color="info" title="Use a wider screen to edit">
            Your draft is kept. Widen the window to edit the layout.
          </Alert>
        )}
        {isEditing && isWide && (
          <Suspense fallback={<Text c="dimmed">Opening editor…</Text>}>
            <EditDrawer range={range} />
          </Suspense>
        )}
        {isEmpty ? (
          <Group>
            <Text>No widgets yet.</Text>
            {!isEditing && isWide && (
              <Button
                renderRoot={(props) => (
                  <Link to="/dashboards/$id" params={{ id }} search={{ mode: 'edit' }} {...props} />
                )}
              >
                Add widget
              </Button>
            )}
            <Button variant="default" renderRoot={(props) => <Link to="/templates" {...props} />}>
              Start from a template
            </Button>
          </Group>
        ) : (
          !(isEditing && isWide && isQueryEditorOpen) && <DashboardGrid range={range} isEditing={isEditing} />
        )}
      </Page.Body>
      <LeaveDialog />
    </Page.Root>
  );
}
