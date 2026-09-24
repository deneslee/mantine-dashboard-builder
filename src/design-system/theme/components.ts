import type { MantineThemeComponents } from '@mantine/core';
import { ActionIconTheme } from './components/ActionIcon';
import { AlertTheme } from './components/Alert';
import { ButtonTheme } from './components/Button';
import { CardTheme } from './components/Card';
import { DrawerTheme } from './components/Drawer';
import { InputTheme } from './components/Input';
import { MenuTheme } from './components/Menu';
import { ModalTheme } from './components/Modal';
import { NavLinkTheme } from './components/NavLink';
import { NotificationTheme } from './components/Notification';
import { PaperTheme } from './components/Paper';
import { PopoverTheme } from './components/Popover';
import { ScrollAreaTheme } from './components/ScrollArea';
import { SelectTheme } from './components/Select';
import { SkeletonTheme } from './components/Skeleton';
import { TabsTheme } from './components/Tabs';
import { TooltipTheme } from './components/Tooltip';

/**
 * Component-level defaults and custom variants.
 * Sourced from modular theme/components/<Name>.ts files.
 */
export const components: MantineThemeComponents = {
  ActionIcon: ActionIconTheme,
  Alert: AlertTheme,
  Button: ButtonTheme,
  Card: CardTheme,
  Drawer: DrawerTheme,
  Input: InputTheme,
  Menu: MenuTheme,
  Modal: ModalTheme,
  NavLink: NavLinkTheme,
  Notification: NotificationTheme,
  Paper: PaperTheme,
  Popover: PopoverTheme,
  ScrollArea: ScrollAreaTheme,
  Select: SelectTheme,
  Skeleton: SkeletonTheme,
  Tabs: TabsTheme,
  Tooltip: TooltipTheme,
};
