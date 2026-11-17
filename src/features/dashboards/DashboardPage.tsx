import { Alert, Button, Group, Stack, Text, VisuallyHidden } from '@mantine/core';
import { useHotkeys, useMediaQuery, useWindowEvent } from '@mantine/hooks';
import { Link, useNavigate, useParams, useRouter, useSearch } from '@tanstack/react-router';
import { IconArrowLeft } from '@tabler/icons-react';
import { Activity, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useActivePlace } from '@/lib/records/activeRecordProvider';
import { usePlugins } from '@/plugins/usePlugins';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { SplitViewPane, SplitViewRoot } from '@/ui/components/SplitView/SplitViewRoot';
import { dimensions } from '@/ui/tokens/dimensions';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { useDensity } from '@/lib/useDensity';
import type { DashboardSearch } from './dashboardSearch';
import { useAutoRefresh } from './data/useAutoRefresh';
import { useRefreshAll } from './data/useRefreshAll';
import { LeaveDialog } from './editor/LeaveDialog';
import { DashboardGrid } from './grid/DashboardGrid';
import { focusWidgetMenu } from './grid/focusWidgetMenu';
import { ShortcutsDialog } from './grid/ShortcutsDialog';
import { WidgetTile } from './grid/WidgetTile';
import { downloadDashboard } from './header/dashboardFile';
import { EditToolbar } from './header/EditToolbar';
import { RefreshButton } from './header/RefreshButton';
import { RefreshPicker } from './header/RefreshPicker';
import { TimeRangePicker } from './header/TimeRangePicker';
import { useDashboard, useDashboardActions, useDashboardTime, useReadDashboard } from './state/useDashboard';
import classes from './DashboardPage.module.css';

const InspectPane = lazy(() =>
  import('./inspect/InspectPane').then((module) => ({ default: module.InspectPane })),
);

const EditPane = lazy(() => import('./editor/EditPane').then((module) => ({ default: module.EditPane })));

const EditTools = lazy(() => import('./editor/EditTools').then((module) => ({ default: module.EditTools })));

/** What the side pane shows; the palette, the widget form and Inspect never show together. */
type Pane = 'inspect' | 'palette' | 'widget';

const PANE_LABELS: Record<Pane, string> = {
  inspect: 'Inspect',
  palette: 'Add widget',
  widget: 'Edit widget',
};

/** The edit store's screen-reader messages ("Moved Revenue to …"), in a leaf so they re-render nothing else. */
function Announcer() {
  const announcement = useDashboard((s) => s.announcement);
  return (
    <VisuallyHidden role="status" aria-live="polite">
      {announcement}
    </VisuallyHidden>
  );
}

/**
 * Shown when the place in use is no longer the one this dashboard was opened from (storage was switched
 * here or in another tab). The editor stays where it is and Save goes to its own place; the button
 * reloads the route, which opens the dashboard from the place in use.
 */
function OpenedFromBanner() {
  const sourcePlaceId = useDashboard((s) => s.source.placeId);
  const active = useActivePlace();
  const { recordProviders } = usePlugins();
  const router = useRouter();
  if (sourcePlaceId === active.id) return null;
  const sourceName = recordProviders[sourcePlaceId]?.name ?? sourcePlaceId;
  return (
    <Alert color="info" title={`Opened from ${sourceName}`}>
      <Group gap="sm">
        <Text size="sm">Save goes there.</Text>
        <Button size="xs" variant="default" onClick={() => void router.invalidate()}>
          {`Open ${active.name}'s version`}
        </Button>
      </Group>
    </Alert>
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
  const defaultRange = useDashboard((s) => s.doc.timeRange);
  const defaultRefresh = useDashboard((s) => s.doc.refresh);
  const draftError = useDashboard((s) => s.draftError);
  const isEmpty = useDashboard((s) => s.doc.layouts.lg.length === 0);
  const isQueryEditorOpen = useDashboard(
    (s) => search.editor === 'queries' && !!s.doc.widgets[search.widget ?? ''],
  );
  const isPaletteOpen = useDashboard((s) => s.tool?.kind === 'palette');
  const hasEditedWidget = useDashboard((s) => !!s.doc.widgets[search.widget ?? '']);
  const isWide = useMediaQuery(`(min-width: ${dimensions.grid.breakpoints.md}px)`, true);
  const isEditing = search.mode === 'edit';
  const [density] = useDensity();
  // One widget full screen, outside edit mode only: editing has the query editor for that.
  const viewId = useDashboard((s) =>
    !isEditing && search.view && s.doc.widgets[search.view] ? search.view : undefined,
  );
  const inspectId = useDashboard((s) =>
    !isEditing && search.inspect && s.doc.widgets[search.inspect]?.queries.length
      ? search.inspect
      : undefined,
  );
  const isEditorAvailable = isEditing && isWide && !isQueryEditorOpen;
  const pane: Pane | null = inspectId
    ? 'inspect'
    : isEditorAvailable && isPaletteOpen
      ? 'palette'
      : isEditorAvailable && hasEditedWidget
        ? 'widget'
        : null;
  // Close and Escape clear whatever opened the pane; focus goes back to the widget's menu.
  const handleClosePane = () => {
    if (pane === 'palette') actions.openTool(null);
    else
      void navigate({
        search: (prev) => ({ ...prev, inspect: undefined, inspectTab: undefined, widget: undefined }),
        resetScroll: false,
      });
    focusWidgetMenu(pane === 'inspect' ? inspectId : pane === 'widget' ? search.widget : undefined);
  };
  const { range, refresh, timeZone } = useDashboardTime(search);
  const refreshAll = useRefreshAll();
  useAutoRefresh(refresh, refreshAll);
  // A new dashboard range or time zone gets a new `now`. A layout effect, so it lands before the
  // tiles' queries start (their subscriptions are passive effects) and they resolve against it.
  useLayoutEffect(() => actions.takeNow(), [range.from, range.to, timeZone, actions]);
  // Entering full screen focuses the big widget's menu, leaving it the tile's (the first in the DOM).
  const viewed = useRef(viewId);
  useEffect(() => {
    if (viewed.current !== viewId) focusWidgetMenu(viewId ?? viewed.current);
    viewed.current = viewId;
  }, [viewId]);
  // `?` lists the shortcuts; the widget letters are each header's (WidgetHeader).
  const [isShortcutsOpen, setShortcutsOpen] = useState(false);
  useHotkeys([
    ['?', () => setShortcutsOpen(true)],
    ['shift+?', () => setShortcutsOpen(true)],
  ]);
  // Esc leaves full screen, unless it is closing a menu, a dialog, a dropdown or Inspect.
  useWindowEvent('keydown', (event) => {
    if (
      viewId &&
      !inspectId &&
      event.key === 'Escape' &&
      !(event.target as Element).closest('[data-portal], [aria-expanded="true"]')
    )
      void navigate({ search: (prev) => ({ ...prev, view: undefined }), resetScroll: false });
  });
  // The URL holds only what differs from the dashboard's own defaults. While editing, a time change
  // replaces the history entry, so Back does not step through it.
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
      replace: isEditing,
    });
  return (
    <Page.Root mod={{ density }} className={classes.page}>
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
          <TimeRangePicker value={range} onChange={setSearch} timeZone={timeZone} />
          <RefreshPicker value={refresh} onChange={(next) => setSearch({ refresh: next })} />
          {isEditing && <EditToolbar isWide={isWide} range={range} refresh={refresh} />}
        </Page.ControlBar>
      </Page.Header>
      <Page.Body className={classes.body}>
        <SplitViewRoot>
          <SplitViewPane id="dashboard" label="Dashboard" defaultSize={100} min="360px">
            <Stack gap="md" className={classes.canvas}>
              <OpenedFromBanner />
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
                  <EditTools range={range} timeZone={timeZone} />
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
                !(isEditing && isWide && isQueryEditorOpen) && (
                  <>
                    {viewId ? (
                      <Stack className={classes.full} data-full-screen>
                        <Group>
                          <Button
                            variant="default"
                            leftSection={<IconArrowLeft size={iconSize.sm} stroke={iconStroke} />}
                            renderRoot={(props) => (
                              <Link
                                to="/dashboards/$id"
                                params={{ id }}
                                search={(prev) => ({ ...prev, view: undefined })}
                                resetScroll={false}
                                {...props}
                              />
                            )}
                          >
                            Back to dashboard
                          </Button>
                        </Group>
                        <div className={classes.tile}>
                          <WidgetTile id={viewId} range={range} timeZone={timeZone} />
                        </div>
                      </Stack>
                    ) : null}
                    {/* Hidden, not unmounted: the tiles keep their state, and make no requests meanwhile. */}
                    <Activity mode={viewId ? 'hidden' : 'visible'}>
                      <DashboardGrid
                        range={range}
                        timeZone={timeZone}
                        isEditing={isEditing}
                        isDataActive={!viewId}
                      />
                    </Activity>
                  </>
                )
              )}
            </Stack>
          </SplitViewPane>
          <SplitViewPane
            id="tools"
            label={pane ? PANE_LABELS[pane] : undefined}
            level="panel"
            defaultSize={`${dimensions.shell.contextBar.default}px`}
            min={`${dimensions.shell.contextBar.min}px`}
            max={`${dimensions.shell.contextBar.max}px`}
            canClose
            fallback="drawer"
            state={pane ? 'open' : 'closed'}
            onStateChange={(next) => next === 'closed' && handleClosePane()}
          >
            <Suspense fallback={null}>
              {pane === 'inspect' && inspectId ? (
                <InspectPane
                  key={inspectId}
                  id={inspectId}
                  tab={search.inspectTab ?? 'data'}
                  range={range}
                  timeZone={timeZone}
                />
              ) : pane ? (
                <EditPane />
              ) : null}
            </Suspense>
          </SplitViewPane>
        </SplitViewRoot>
      </Page.Body>
      <LeaveDialog />
      {isShortcutsOpen ? <ShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
    </Page.Root>
  );
}
