import { useNavigate, useSearch } from '@tanstack/react-router';
import type { TimeRange } from '@/core/time/timeRange';
import { focusWidgetMenu } from '../grid/focusWidgetMenu';
import { useDashboard, useWidget } from '../state/useDashboard';
import { PlacementDialog } from './PlacementDialog';
import { QueryEditor } from './QueryEditor';

/**
 * The edit-mode tools that aren't in the side pane, loaded as their own chunk: the query editor
 * (`?widget=<id>&editor=queries`), which takes the grid's place, and the move and resize dialogs.
 * The palette and the widget form live in the side pane ([EditPane](./EditPane.tsx)).
 */
export function EditTools({ range, timeZone }: { range: TimeRange; timeZone: string }) {
  const search = useSearch({ from: '/dashboards/$id' });
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const tool = useDashboard((s) => s.tool);
  const widgetId = search.widget ?? '';
  const widget = useWidget(widgetId);
  if (widget && search.editor === 'queries')
    return (
      <QueryEditor
        key={widgetId}
        id={widgetId}
        widget={widget}
        range={range}
        timeZone={timeZone}
        onClose={() => {
          void navigate({
            search: (prev) => ({ ...prev, widget: undefined, editor: undefined }),
            resetScroll: false,
          });
          focusWidgetMenu(widgetId);
        }}
      />
    );
  return tool && tool.kind !== 'palette' ? (
    <PlacementDialog key={tool.id + tool.kind} id={tool.id} kind={tool.kind} />
  ) : null;
}
