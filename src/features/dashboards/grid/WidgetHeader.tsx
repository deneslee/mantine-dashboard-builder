import { ActionIcon, Group, Menu, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconDots, IconInfoCircle } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { fontWeight, iconSize, iconStroke } from '@/ui/tokens/semantic';
import { notify } from '@/lib/notify/notify';
import { widgetDataQuery } from '../data/dashboardQueries';
import { useDashboardActions, useDashboard } from '../state/useDashboard';
import type { TimeRange } from '@/core/time/timeRange';
import type { Widget } from '@/core/dashboard/dashboardSchema';
import { usePlugins } from '@/plugins/usePlugins';
import { focusWidgetMenu } from './focusWidgetMenu';
import classes from './WidgetTile.module.css';

export function WidgetHeader({
  id,
  widget,
  titleId,
  range,
  isEditing,
  isFetching,
  hasFailed,
}: {
  id: string;
  widget: Widget;
  titleId: string;
  range: TimeRange;
  isEditing: boolean;
  isFetching: boolean;
  hasFailed: boolean;
}) {
  const dashboardId = useDashboard((state) => state.doc.id);
  const actions = useDashboardActions();
  const plugins = usePlugins();
  const client = useQueryClient();
  const handleCopyLink = async () => {
    const url = new URL(window.location.href);
    for (const key of ['mode', 'widget', 'editor']) url.searchParams.delete(key);
    url.hash = 'widget-' + id;
    try {
      await navigator.clipboard.writeText(url.href);
      notify.success({ title: 'Widget link copied' });
    } catch {
      notify.error({ title: 'Could not copy link', message: 'Copy the dashboard URL from the address bar.' });
    }
  };
  const handleRemove = () => {
    actions.remove(id);
    requestAnimationFrame(() =>
      (
        document.querySelector<HTMLButtonElement>('[data-widget-menu]') ??
        document.getElementById('add-widget')
      )?.focus(),
    );
    notify.success({
      title: 'Widget removed',
      action: { label: 'Undo', onClick: actions.undo },
      autoClose: 8000,
    });
  };
  return (
    <Group
      className={classes.header}
      justify="space-between"
      wrap="nowrap"
      data-widget-drag
      data-editing={isEditing}
    >
      <Text id={titleId} size="sm" fw={fontWeight.medium} truncate title={widget.title}>
        {widget.title}
      </Text>
      <Group gap="2xs" wrap="nowrap" className={classes.controls}>
        {widget.description ? (
          <Tooltip label={widget.description} interactive events={{ hover: true, focus: true, touch: true }}>
            <ActionIcon variant="subtle" aria-label={'About ' + widget.title}>
              <IconInfoCircle size={iconSize.sm} stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        {hasFailed ? (
          <Tooltip
            label="Widget data could not be refreshed"
            interactive
            events={{ hover: true, focus: true, touch: true }}
          >
            <ActionIcon variant="subtle" color="warning" aria-label="Widget data could not be refreshed">
              <IconAlertTriangle size={iconSize.sm} stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        <Menu withinPortal returnFocus>
          <Menu.Target>
            <Tooltip label={'Actions for ' + widget.title}>
              <ActionIcon
                id={'widget-menu-' + id}
                data-widget-menu
                className={classes.menu}
                variant="subtle"
                aria-label={'Actions for ' + widget.title}
              >
                <IconDots size={iconSize.sm} stroke={iconStroke} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {widget.queries.length ? (
              <Menu.Item
                onClick={() =>
                  void client.invalidateQueries({
                    queryKey: widgetDataQuery(widget.queries, range, plugins.datasources, widget.title)
                      .queryKey,
                    exact: true,
                  })
                }
              >
                Refresh
              </Menu.Item>
            ) : null}
            <Menu.Item onClick={() => void handleCopyLink()}>Copy link</Menu.Item>
            {isEditing ? (
              <>
                <Menu.Divider />
                <Menu.Item
                  renderRoot={(props) => (
                    <Link
                      to="/dashboards/$id"
                      params={{ id: dashboardId }}
                      search={(prev) => ({ ...prev, mode: 'edit', widget: id, editor: undefined })}
                      resetScroll={false}
                      {...props}
                    />
                  )}
                >
                  Edit
                </Menu.Item>
                <Menu.Item onClick={() => actions.openTool({ kind: 'move', id: id })}>Move to…</Menu.Item>
                <Menu.Item onClick={() => actions.openTool({ kind: 'resize', id: id })}>Resize…</Menu.Item>
                <Menu.Item
                  onClick={() => {
                    actions.duplicate(id);
                    focusWidgetMenu(id);
                  }}
                >
                  Duplicate
                </Menu.Item>
                <Menu.Item color="danger" onClick={handleRemove}>
                  Remove
                </Menu.Item>
              </>
            ) : null}
          </Menu.Dropdown>
        </Menu>
      </Group>
      <span
        className={classes.status}
        data-fetching={isFetching || undefined}
        data-failed={hasFailed || undefined}
        aria-hidden
      />
    </Group>
  );
}
