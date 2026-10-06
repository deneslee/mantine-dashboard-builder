import { useNavigate, useSearch } from '@tanstack/react-router';
import { dimensions } from '@/ui/tokens/dimensions';
import type { TimeRange } from '@/core/time/timeRange';
import { focusWidgetMenu } from '../grid/focusWidgetMenu';
import { PaneDrawer } from '../PaneDrawer';
import { useDashboard, useDashboardActions, useWidget } from '../state/useDashboard';
import { AddWidgetForm } from './AddWidgetForm';
import { PlacementDialog } from './PlacementDialog';
import { QueryEditor } from './QueryEditor';
import { WidgetForm } from './WidgetForm';

/**
 * The edit-mode tools, loaded as their own chunk: a non-modal drawer beside the grid for adding a
 * widget (`tool: palette`) or editing one (`?widget=<id>`), the move and resize dialogs, and the
 * query editor (`&editor=queries`), which takes the grid's place.
 */
export function EditDrawer({ range, timeZone }: { range: TimeRange; timeZone: string }) {
  const search = useSearch({ from: '/dashboards/$id' });
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const tool = useDashboard((s) => s.tool);
  const actions = useDashboardActions();
  const widgetId = search.widget ?? '';
  const widget = useWidget(widgetId);
  const handleCloseWidget = () => {
    void navigate({
      search: (prev) => ({ ...prev, widget: undefined, editor: undefined }),
      resetScroll: false,
    });
    focusWidgetMenu(search.widget);
  };
  if (widget && search.editor === 'queries')
    return (
      <QueryEditor
        key={widgetId}
        id={widgetId}
        widget={widget}
        range={range}
        timeZone={timeZone}
        onClose={handleCloseWidget}
      />
    );
  return (
    <>
      <PaneDrawer
        opened={tool?.kind === 'palette' || !!widget}
        onClose={() => {
          actions.openTool(null);
          handleCloseWidget();
        }}
        title={tool?.kind === 'palette' ? 'Add widget' : 'Edit widget'}
        size={dimensions.shell.contextBar.default}
      >
        {tool?.kind === 'palette' ? (
          <AddWidgetForm />
        ) : widget ? (
          <WidgetForm key={widgetId} id={widgetId} widget={widget} />
        ) : null}
      </PaneDrawer>
      {tool && tool.kind !== 'palette' && (
        <PlacementDialog key={tool.id + tool.kind} id={tool.id} kind={tool.kind} />
      )}
    </>
  );
}
