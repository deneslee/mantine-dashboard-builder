import { Drawer } from '@mantine/core';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { dimensions } from '@/ui/tokens/dimensions';
import type { TimeRange } from '@/core/time/timeRange';
import { focusWidgetMenu } from '../grid/focusWidgetMenu';
import { useDashboard, useDashboardActions, useWidget } from '../state/useDashboard';
import { AddWidgetForm } from './AddWidgetForm';
import { PlacementDialog } from './PlacementDialog';
import { QueryEditor } from './QueryEditor';
import { WidgetForm } from './WidgetForm';
import classes from './EditDrawer.module.css';

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
      <div className={classes.tools}>
        <Drawer.Root
          opened={tool?.kind === 'palette' || !!widget}
          onClose={() => {
            actions.openTool(null);
            handleCloseWidget();
          }}
          position="right"
          size={dimensions.shell.contextBar.default}
          withinPortal={false}
          trapFocus={false}
          lockScroll={false}
          onEnterTransitionEnd={() => {
            // Move focus in, unless the user already clicked into the drawer while it slid open.
            const content = document.querySelector<HTMLElement>('[data-dashboard-tool]');
            if (!content?.contains(document.activeElement))
              content?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
          }}
          classNames={{ inner: classes.drawerInner, content: classes.drawerContent }}
        >
          <Drawer.Content
            data-dashboard-tool
            ref={(node) => {
              // Mantine 9 hardcodes aria-modal on Drawer.Content, including when trapFocus is off.
              node?.setAttribute('aria-modal', 'false');
            }}
          >
            <Drawer.Header>
              <Drawer.Title>{tool?.kind === 'palette' ? 'Add widget' : 'Edit widget'}</Drawer.Title>
              <Drawer.CloseButton aria-label="Close drawer" />
            </Drawer.Header>
            <Drawer.Body>
              {tool?.kind === 'palette' ? (
                <AddWidgetForm />
              ) : widget ? (
                <WidgetForm key={widgetId} id={widgetId} widget={widget} />
              ) : null}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Root>
      </div>
      {tool && tool.kind !== 'palette' && (
        <PlacementDialog key={tool.id + tool.kind} id={tool.id} kind={tool.kind} />
      )}
    </>
  );
}
