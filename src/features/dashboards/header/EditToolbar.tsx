import { Button, FileButton, Text } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWindowEvent } from '@mantine/hooks';
import { Link, useParams } from '@tanstack/react-router';
import type { TimeRange } from '@/core/time/timeRange';
import { toAppError } from '@/core/errors/AppError';
import { notify } from '@/lib/notify/notify';
import { usePlugins } from '@/plugins/usePlugins';
import { dashboardKeys } from '../data/dashboardQueries';
import { selectIsSavePending } from '../state/createDashboardStore';
import { useDashboard, useDashboardActions, useReadSaved, useUndoState } from '../state/useDashboard';
import { parseDashboardFile } from './dashboardFile';

/**
 * Edit mode's controls: status (where the dashboard is saved, and whether a write is pending), Save, Discard, Undo, Redo, Use current time as default, Add widget, Import JSON and Done. It
 * owns the dirty and undo state, so an edit re-renders this bar, not the page.
 */
export function EditToolbar({
  isWide,
  range,
  refresh,
}: {
  isWide: boolean;
  range: TimeRange;
  refresh: string;
}) {
  const { id } = useParams({ from: '/dashboards/$id' });
  const queryClient = useQueryClient();
  const plugins = usePlugins();
  const actions = useDashboardActions();
  const readSaved = useReadSaved();
  const isDirty = useDashboard((s) => s.isDirty);
  const source = useDashboard((s) => s.source);
  const saveState = useDashboard((s) => s.saveState);
  const isPending = useDashboard(selectIsSavePending);
  const placeName = plugins.recordProviders[source.placeId]?.name ?? source.placeId;
  const isDefaultTime = useDashboard(
    (s) =>
      s.doc.timeRange.from === range.from && s.doc.timeRange.to === range.to && s.doc.refresh === refresh,
  );
  const { canUndo, canRedo } = useUndoState();
  const save = useMutation({
    mutationFn: actions.save,
    onSuccess: () => {
      // The place it was saved to, which the store holds: not the place in use now.
      const saved = readSaved();
      notify.success({ title: `Saved to ${placeName}` });
      queryClient.setQueryData(dashboardKeys.detail(saved.source.placeId, id), saved);
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.list(saved.source.placeId), exact: true });
    },
  });
  // Leaving while a write is unresolved would lose track of whether it landed.
  useWindowEvent('beforeunload', (event) => {
    if (isPending) event.preventDefault();
  });
  const status =
    saveState === 'waiting'
      ? `Waiting for ${placeName} to confirm…`
      : saveState === 'saving'
        ? 'Saving…'
        : isDirty
          ? 'Unsaved changes'
          : `Saved in ${placeName}`;
  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      const { dashboard, missingDatasources } = parseDashboardFile(await file.text(), plugins);
      actions.importDocument(dashboard);
      if (missingDatasources.length > 0)
        notify.warning({
          title: 'Imported without some datasources',
          message: `Its widgets need ${missingDatasources.join(', ')}. Add connections with these ids under Data sources.`,
        });
    } catch (error) {
      notify.error({ title: 'Dashboard was not imported', message: toAppError(error).message });
    }
  };
  return (
    <>
      <Text size="sm" c="dimmed">
        {status}
      </Text>
      <Button onClick={() => save.mutate()} loading={save.isPending} disabled={isPending}>
        Save
      </Button>
      <Button variant="default" onClick={actions.discard} disabled={isPending}>
        Discard
      </Button>
      <Button variant="default" onClick={actions.undo} disabled={!canUndo}>
        Undo
      </Button>
      <Button variant="default" onClick={actions.redo} disabled={!canRedo}>
        Redo
      </Button>
      <Button
        variant="default"
        onClick={() => actions.setDefaultTime(range, refresh)}
        disabled={isDefaultTime}
      >
        Use current time as default
      </Button>
      {isWide && (
        <Button id="add-widget" variant="default" onClick={() => actions.openTool({ kind: 'palette' })}>
          Add widget
        </Button>
      )}
      <FileButton accept="application/json,.json" onChange={(file) => void handleImport(file)}>
        {(props) => (
          <Button variant="default" disabled={isPending} {...props}>
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
  );
}
