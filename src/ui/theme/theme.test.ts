import { describe, expect, it } from 'vitest';
import { shadow, shape } from '../tokens/semantic';
import { ActionIconTheme } from './components/ActionIconTheme';
import { AlertTheme } from './components/AlertTheme';
import { ButtonTheme } from './components/ButtonTheme';
import { CardTheme } from './components/CardTheme';
import { DrawerTheme } from './components/DrawerTheme';
import { InputTheme } from './components/InputTheme';
import { MenuTheme } from './components/MenuTheme';
import { ModalTheme } from './components/ModalTheme';
import { NotificationTheme } from './components/NotificationTheme';
import { PaperTheme } from './components/PaperTheme';
import { PopoverTheme } from './components/PopoverTheme';
import { SelectTheme } from './components/SelectTheme';
import { SkeletonTheme } from './components/SkeletonTheme';
import { SpotlightTheme } from './components/SpotlightTheme';
import { TooltipTheme } from './components/TooltipTheme';
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
    expect(PopoverTheme.defaultProps?.radius).toBe(shape.container);
  });

  it('gives every overlay the overlay shadow token', () => {
    for (const overlay of [MenuTheme, PopoverTheme, ModalTheme, DrawerTheme, SpotlightTheme]) {
      expect(overlay.defaultProps?.shadow).toBe(shadow.overlay);
    }
  });

  it('leaves Drawer square, since it docks to the viewport edge', () => {
    expect(DrawerTheme.defaultProps?.radius).toBeUndefined();
  });

  it('uses shape.control as the fallback radius for every other component', () => {
    expect(theme.defaultRadius).toBe(shape.control);
  });
});
