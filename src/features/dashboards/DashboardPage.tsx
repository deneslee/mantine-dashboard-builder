import {
  ActionIcon,
  Alert,
  Button,
  FileButton,
  Group,
  Modal,
  Text,
  Tooltip,
  VisuallyHidden,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconRefresh } from '@tabler/icons-react';
import { useIsFetching, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { tokens } from '@/ui/tokens/tokens';
import { notify } from '@/lib/notify/notify';
import { dashboardDoc } from '@/core/dashboard/dashboardSchema';
import { toDashboard, toDocument } from './data/mapper';
import { dashboardKeys } from './data/dashboardQueries';
import { useDashboardActions, useDashboardState, useDocumentReader, useHistory } from './state/useDashboard';
import { useAutoRefresh } from './data/useAutoRefresh';
import type { DashboardSearch } from '@/core/time/timeRange';
import { useDashboardRegistry } from '@/plugins/usePlugins';
import { RefreshPicker } from './header/RefreshPicker';
import { TimeRangePicker } from './header/TimeRangePicker';
import { DashboardGrid } from './grid/DashboardGrid';

const EditTools = lazy(() => import('./editor/EditDrawer').then((module) => ({ default: module.EditTools })));

export function DashboardView() {
  const { id } = useParams({ from: '/dashboards/$id' });
  const search = useSearch({ from: '/dashboards/$id' });
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const queryClient = useQueryClient();
  const registry = useDashboardRegistry();
  const actions = useDashboardActions();
  const read = useDocumentReader();
  const title = useDashboardState((s) => s.doc.title);
  const description = useDashboardState((s) => s.doc.description);
  const defaultRange = useDashboardState((s) => s.timeRange);
  const defaultRefresh = useDashboardState((s) => s.refresh);
  const dirty = useDashboardState((s) => s.dirty);
  const draftError = useDashboardState((s) => s.draftError);
  const mode = useDashboardState((s) => s.mode);
  const announcement = useDashboardState((s) => s.announcement);
  const empty = useDashboardState((s) => s.doc.layouts.lg.length === 0);
  const queryEditor = useDashboardState(
    (s) => search.editor === 'queries' && !!s.doc.widgets[search.widget ?? ''],
  );
  const { canUndo, canRedo } = useHistory();
  const wide = useMediaQuery(`(min-width: ${tokens.grid.breakpoints.md}px)`, true);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (mode === 'edit' && search.mode !== 'edit') {
        void navigate({ search: (prev) => ({ ...prev, mode: 'edit' }), replace: true });
        return;
      }
    }
    actions.setMode(search.mode ?? 'view');
  }, [search.mode, actions, mode, navigate]);
  const editing = mode === 'edit';
  const range = editing
    ? defaultRange
    : { from: search.from ?? defaultRange.from, to: search.to ?? defaultRange.to };
  const refresh = editing ? defaultRefresh : (search.refresh ?? defaultRefresh);
  useAutoRefresh(refresh);
  const fetching = useIsFetching({ queryKey: dashboardKeys.data }) > 0;
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
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      dirty && (current.pathname !== next.pathname || (next.search as DashboardSearch).mode !== 'edit'),
    enableBeforeUnload: dirty,
    withResolver: true,
  });
  const save = useMutation({
    mutationFn: actions.save,
    meta: { successMessage: 'Dashboard saved' },
    onSuccess: () => {
      queryClient.setQueryData(dashboardKeys.detail(id), read());
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all, exact: true });
    },
  });
  const exportJson = () => {
    const content = JSON.stringify(dashboardDoc.parse(toDocument(read())), null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const importJson = async (file: File | null) => {
    if (!file) return;
    try {
      const doc = toDashboard(dashboardDoc.parse(JSON.parse(await file.text())));
      for (const widget of Object.values(doc.widgets)) {
        const definition = registry.widgets[widget.type];
        if (!definition) throw new Error(`Unknown widget type "${widget.type}".`);
        definition.optionsSchema.parse(widget.options);
        for (const query of widget.queries) {
          const datasource = registry.datasources[query.datasource];
          if (!datasource) throw new Error(`Unknown datasource "${query.datasource}".`);
          datasource.querySchema?.parse(query.spec);
        }
      }
      actions.importDocument(doc);
    } catch (error) {
      notify.error({
        title: 'Dashboard was not imported',
        message: error instanceof Error ? error.message : 'Invalid JSON.',
      });
    }
  };
  return (
    <Page.Root>
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>{title}</Page.Title>
        <Page.Description>{description}</Page.Description>
        <Page.Actions>
          <Button variant="default" onClick={exportJson}>
            Export JSON
          </Button>
          {!editing && wide && (
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
          <Tooltip label="Refresh all widgets">
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Refresh all widgets"
              loading={fetching}
              onClick={() => void queryClient.invalidateQueries({ queryKey: dashboardKeys.data })}
            >
              <IconRefresh size={iconSize.md} stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        </Page.Actions>
        <Page.ControlBar aria-label="Dashboard controls">
          <TimeRangePicker value={range} onChange={editing ? actions.setRange : setSearch} />
          <RefreshPicker
            value={refresh}
            onChange={editing ? actions.setRefresh : (next) => setSearch({ refresh: next })}
          />
          {editing && (
            <>
              <Text size="sm" c="dimmed">
                {dirty ? 'Unsaved changes' : 'Saved locally'}
              </Text>
              <Button onClick={() => save.mutate()} loading={save.isPending}>
                Save
              </Button>
              <Button variant="default" onClick={actions.discard}>
                Discard
              </Button>
              <Button variant="default" onClick={actions.undo} disabled={!canUndo}>
                Undo
              </Button>
              <Button variant="default" onClick={actions.redo} disabled={!canRedo}>
                Redo
              </Button>
              {wide && (
                <Button
                  id="add-widget"
                  variant="default"
                  onClick={() => actions.openTool({ kind: 'palette' })}
                >
                  Add widget
                </Button>
              )}
              <FileButton accept="application/json,.json" onChange={(file) => void importJson(file)}>
                {(props) => (
                  <Button variant="default" {...props}>
                    Import JSON
                  </Button>
                )}
              </FileButton>
              <Button
                variant="subtle"
                renderRoot={(props) => (
                  <Link
                    to="/dashboards/$id"
                    params={{ id }}
                    search={(prev) => ({ ...prev, mode: 'view', widget: undefined, editor: undefined })}
                    {...props}
                  />
                )}
              >
                Done
              </Button>
            </>
          )}
        </Page.ControlBar>
      </Page.Header>
      <Page.Body>
        {draftError && (
          <Alert color="danger" title="Draft storage">
            {draftError}
          </Alert>
        )}
        {editing && !wide && (
          <Alert color="info" title="Use a wider screen to edit">
            Your draft is kept. Widen the window to edit the layout.
          </Alert>
        )}
        {editing && wide && (
          <Suspense fallback={<Text c="dimmed">Opening editor…</Text>}>
            <EditTools range={range} />
          </Suspense>
        )}
        {empty ? (
          <Group>
            <Text>No widgets yet.</Text>
            {!editing && wide && (
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
          !(editing && wide && queryEditor) && <DashboardGrid range={range} />
        )}
      </Page.Body>
      <Modal
        opened={blocker.status === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave with unsaved changes?"
        centered
      >
        <Text>Your draft is stored on this browser. Save or export it to keep a separate copy.</Text>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => blocker.reset?.()}>
            Keep editing
          </Button>
          <Button color="warning" onClick={() => blocker.proceed?.()}>
            Leave dashboard
          </Button>
        </Group>
      </Modal>
    </Page.Root>
  );
}
