import { ActionIcon, Group, Menu, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconClock, IconDots, IconInfoCircle } from '@tabler/icons-react';
import { Link, useSearch } from '@tanstack/react-router';
import { fontWeight, iconSize, iconStroke } from '@/ui/tokens/semantic';
import { notify } from '@/lib/notify/notify';
import { useDashboardActions, useDashboard } from '../state/useDashboard';
import type { Widget } from '@/core/dashboard/dashboardSchema';
import { focusWidgetMenu } from './focusWidgetMenu';
import classes from './WidgetTile.module.css';

export function WidgetHeader({
  id,
  widget,
  titleId,
  isEditing,
  isFetching,
  hasFailed,
  onRefresh,
  timeLabel,
  onEditTime,
}: {
  id: string;
  widget: Widget;
  titleId: string;
  isEditing: boolean;
  isFetching: boolean;
  /** Some query failed: a warning icon, while the data that did load stays on screen. */
  hasFailed: boolean;
  /** Refetches the widget's queries. */
  onRefresh: () => void;
  /** The widget's own time, when it differs from the dashboard's: a clock icon. */
  timeLabel?: string;
  /** Opens the widget's time dialog; without it the menu has no Time range… item. */
  onEditTime?: () => void;
}) {
  const dashboardId = useDashboard((state) => state.doc.id);
  const isViewed = useSearch({ strict: false, select: (search) => search.view === id });
  const actions = useDashboardActions();
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
        {timeLabel ? (
          <Tooltip label={timeLabel}>
            <ActionIcon variant="subtle" aria-label={`Time: ${timeLabel}`} onClick={onEditTime}>
              <IconClock size={iconSize.sm} stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        {hasFailed ? (
          <Tooltip
            label="Some of this widget's data could not be loaded"
            interactive
            events={{ hover: true, focus: true, touch: true }}
          >
            <ActionIcon
              variant="subtle"
              color="warning"
              aria-label="Some of this widget's data could not be loaded"
            >
              <IconAlertTriangle size={iconSize.sm} stroke={iconStroke} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        {/* No animation: View full screen hides the grid in an Activity while this menu closes, and a
            transition hidden midway never ends, so the menu would come back open. */}
        <Menu withinPortal returnFocus transitionProps={{ duration: 0 }}>
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
            {!isEditing && !isViewed ? (
              <Menu.Item
                renderRoot={(props) => (
                  <Link
                    to="/dashboards/$id"
                    params={{ id: dashboardId }}
                    search={(prev) => ({ ...prev, view: id })}
                    resetScroll={false}
                    {...props}
                  />
                )}
              >
                View full screen
              </Menu.Item>
            ) : null}
            {!isEditing && widget.queries.length ? (
              <Menu.Item
                renderRoot={(props) => (
                  <Link
                    to="/dashboards/$id"
                    params={{ id: dashboardId }}
                    search={(prev) => ({ ...prev, inspect: id, inspectTab: undefined })}
                    resetScroll={false}
                    {...props}
                  />
                )}
              >
                Inspect
              </Menu.Item>
            ) : null}
            {onEditTime ? <Menu.Item onClick={onEditTime}>Time range…</Menu.Item> : null}
            {widget.queries.length ? <Menu.Item onClick={onRefresh}>Refresh</Menu.Item> : null}
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
