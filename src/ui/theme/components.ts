import type { MantineThemeComponents } from '@mantine/core';
import { ActionIconTheme } from './components/ActionIconTheme';
import { AlertTheme } from './components/AlertTheme';
import { ButtonTheme } from './components/ButtonTheme';
import { CardTheme } from './components/CardTheme';
import { DrawerTheme } from './components/DrawerTheme';
import { InputTheme } from './components/InputTheme';
import { MenuTheme } from './components/MenuTheme';
import { ModalTheme } from './components/ModalTheme';
import { NavLinkTheme } from './components/NavLinkTheme';
import { NotificationTheme } from './components/NotificationTheme';
import { PaperTheme } from './components/PaperTheme';
import { PopoverTheme } from './components/PopoverTheme';
import { ScrollAreaTheme } from './components/ScrollAreaTheme';
import { SelectTheme } from './components/SelectTheme';
import { SkeletonTheme } from './components/SkeletonTheme';
import { SpotlightTheme } from './components/SpotlightTheme';
import { TabsTheme } from './components/TabsTheme';
import { TooltipGroupTheme, TooltipTheme } from './components/TooltipTheme';

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
  Spotlight: SpotlightTheme,
  Tabs: TabsTheme,
  Tooltip: TooltipTheme,
  TooltipGroup: TooltipGroupTheme,
};
