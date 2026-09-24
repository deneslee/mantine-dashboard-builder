import { describe, expect, it } from 'vitest';
import { shape } from '../tokens/semantic';
import { components } from './components';
import { ActionIconTheme } from './components/ActionIcon';
import { AlertTheme } from './components/Alert';
import { ButtonTheme } from './components/Button';
import { CardTheme } from './components/Card';
import { DrawerTheme } from './components/Drawer';
import { InputTheme } from './components/Input';
import { MenuTheme } from './components/Menu';
import { ModalTheme } from './components/Modal';
import { NotificationTheme } from './components/Notification';
import { PaperTheme } from './components/Paper';
import { PopoverTheme } from './components/Popover';
import { SelectTheme } from './components/Select';
import { SkeletonTheme } from './components/Skeleton';
import { TooltipTheme } from './components/Tooltip';
import { theme } from './theme';

describe('Component tier defaults', () => {
  it('assigns shape.control radius to interactive controls', () => {
    expect(ButtonTheme.defaultProps?.radius).toBe(shape.control);
    expect(ActionIconTheme.defaultProps?.radius).toBe(shape.control);
    expect(InputTheme.defaultProps?.radius).toBe(shape.control);
    expect(SelectTheme.defaultProps?.radius).toBe(shape.control);
    expect(SkeletonTheme.defaultProps?.radius).toBe(shape.control);
    expect(TooltipTheme.defaultProps?.radius).toBe(shape.control);
  });

  it('assigns shape.container radius to containers and overlays', () => {
    expect(PaperTheme.defaultProps?.radius).toBe(shape.container);
    expect(CardTheme.defaultProps?.radius).toBe(shape.container);
    expect(AlertTheme.defaultProps?.radius).toBe(shape.container);
    expect(NotificationTheme.defaultProps?.radius).toBe(shape.container);
    expect(ModalTheme.defaultProps?.radius).toBe(shape.container);
    expect(MenuTheme.defaultProps?.radius).toBe(shape.container);
    expect(DrawerTheme.defaultProps?.radius).toBe(shape.container);
    expect(PopoverTheme.defaultProps?.radius).toBe(shape.container);
  });

  it('registers all split components on the Mantine theme', () => {
    expect(theme.components?.Button).toBe(components.Button);
    expect(theme.components?.ActionIcon).toBe(components.ActionIcon);
    expect(theme.components?.Input).toBe(components.Input);
    expect(theme.components?.Select).toBe(components.Select);
    expect(theme.components?.Paper).toBe(components.Paper);
    expect(theme.components?.Card).toBe(components.Card);
    expect(theme.components?.Alert).toBe(components.Alert);
    expect(theme.components?.Notification).toBe(components.Notification);
    expect(theme.components?.Modal).toBe(components.Modal);
    expect(theme.components?.Menu).toBe(components.Menu);
    expect(theme.components?.Drawer).toBe(components.Drawer);
    expect(theme.components?.Popover).toBe(components.Popover);
    expect(theme.components?.NavLink).toBe(components.NavLink);
    expect(theme.components?.ScrollArea).toBe(components.ScrollArea);
    expect(theme.components?.Skeleton).toBe(components.Skeleton);
    expect(theme.components?.Tabs).toBe(components.Tabs);
    expect(theme.components?.Tooltip).toBe(components.Tooltip);
  });
});
