import { Box } from '@mantine/core';
import { useSearch } from '@tanstack/react-router';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { SplitViewHeader } from '@/ui/components/SplitView/SplitViewHeader';
import { useDashboard, useWidget } from '../state/useDashboard';
import { AddWidgetForm } from './AddWidgetForm';
import { WidgetForm } from './WidgetForm';

/**
 * The side pane's content in edit mode, its own chunk: the palette (`tool: palette`) or the form for
 * the widget in `?widget=<id>`. The page opens and closes the pane; this only fills it.
 */
export function EditPane() {
  const search = useSearch({ from: '/dashboards/$id' });
  const isPalette = useDashboard((s) => s.tool?.kind === 'palette');
  const widgetId = search.widget ?? '';
  const widget = useWidget(widgetId);
  if (isPalette)
    return (
      <>
        <SplitViewHeader title="Add widget" icon={IconPlus} />
        <Box p="md">
          <AddWidgetForm />
        </Box>
      </>
    );
  return widget ? (
    <>
      <SplitViewHeader title="Edit widget" icon={IconPencil} />
      <Box p="md">
        <WidgetForm key={widgetId} id={widgetId} widget={widget} />
      </Box>
    </>
  ) : null;
}
