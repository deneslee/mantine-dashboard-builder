import {
  ActionIcon,
  Alert,
  Drawer,
  Menu,
  Modal,
  NavLink,
  Notification,
  Paper,
  Popover,
  ScrollArea,
  Select,
  Skeleton,
  Tabs,
  Tooltip,
  type MantineThemeComponents,
} from '@mantine/core';
import actionIcon from './styles/ActionIcon.module.css';
import navLink from './styles/NavLink.module.css';
import paper from './styles/Paper.module.css';
import tabs from './styles/Tabs.module.css';

/**
 * Component-level defaults and custom variants.
 * Variants added here: ActionIcon `chrome`, Paper `panel` | `widget`, NavLink `sidebar`.
 */
export const components: MantineThemeComponents = {
  ActionIcon: ActionIcon.extend({
    defaultProps: { variant: 'subtle', color: 'gray', size: 'lg' },
    classNames: actionIcon,
  }),
  Tooltip: Tooltip.extend({
    defaultProps: { openDelay: 400, withArrow: false, position: 'bottom', fz: 'xs' },
  }),
  Paper: Paper.extend({
    defaultProps: { radius: 'md' },
    classNames: paper,
  }),
  NavLink: NavLink.extend({
    defaultProps: { variant: 'sidebar', childrenOffset: 28, noWrap: true },
    classNames: navLink,
  }),
  Tabs: Tabs.extend({
    defaultProps: { variant: 'default' },
    classNames: tabs,
  }),
  ScrollArea: ScrollArea.extend({
    defaultProps: { type: 'hover', scrollbarSize: 8, offsetScrollbars: false },
  }),
  Drawer: Drawer.extend({
    defaultProps: { overlayProps: { backgroundOpacity: 0.35, blur: 2 }, transitionProps: { duration: 180 } },
  }),
  Modal: Modal.extend({
    defaultProps: { centered: true, overlayProps: { backgroundOpacity: 0.45, blur: 2 } },
  }),
  Menu: Menu.extend({
    defaultProps: { shadow: 'md', width: 200, position: 'bottom-end', withinPortal: true },
  }),
  Popover: Popover.extend({ defaultProps: { shadow: 'md', withinPortal: true } }),
  Select: Select.extend({ defaultProps: { checkIconPosition: 'right', allowDeselect: false } }),
  Alert: Alert.extend({ defaultProps: { variant: 'light', radius: 'md' } }),
  Notification: Notification.extend({ defaultProps: { radius: 'md', withBorder: true } }),
  Skeleton: Skeleton.extend({ defaultProps: { radius: 'sm', animate: true } }),
};
