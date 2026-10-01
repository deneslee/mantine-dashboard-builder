import { Button, FileButton, Text } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { toAppError } from '@/core/errors/AppError';
import { notify } from '@/lib/notify/notify';
import { usePlugins } from '@/plugins/usePlugins';
import { dashboardKeys } from '../data/dashboardQueries';
import { useDashboard, useDashboardActions, useReadDashboard, useUndoState } from '../state/useDashboard';
import { parseDashboardFile } from './dashboardFile';

/**
 * Edit mode's controls: status, Save, Discard, Undo, Redo, Add widget, Import JSON and Done. It
 * owns the dirty and undo state, so an edit re-renders this bar, not the page.
 */
export function EditToolbar({ isWide }: { isWide: boolean }) {
  const { id } = useParams({ from: '/dashboards/$id' });
  const queryClient = useQueryClient();
  const plugins = usePlugins();
  const actions = useDashboardActions();
  const read = useReadDashboard();
  const isDirty = useDashboard((s) => s.isDirty);
  const { canUndo, canRedo } = useUndoState();
  const save = useMutation({
    mutationFn: actions.save,
    meta: { successMessage: 'Dashboard saved' },
    onSuccess: () => {
      queryClient.setQueryData(dashboardKeys.detail(id), read());
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all, exact: true });
    },
  });
  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      actions.importDocument(parseDashboardFile(await file.text(), plugins));
    } catch (error) {
      notify.error({ title: 'Dashboard was not imported', message: toAppError(error).message });
    }
  };
  return (
    <>
      <Text size="sm" c="dimmed">
        {isDirty ? 'Unsaved changes' : 'Saved locally'}
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
      {isWide && (
        <Button id="add-widget" variant="default" onClick={() => actions.openTool({ kind: 'palette' })}>
          Add widget
        </Button>
      )}
      <FileButton accept="application/json,.json" onChange={(file) => void handleImport(file)}>
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
  );
}
