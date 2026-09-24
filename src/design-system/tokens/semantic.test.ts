import { describe, expect, it } from 'vitest';
import { theme, cssVariablesResolver } from '../theme/theme';
import { primitives } from './primitives';
import {
  semantic,
  shape,
  isSchemeValue,
  toCssVars,
  elevation,
  color,
  layer,
  radius,
  motion,
  z,
  chart,
  iconSize,
  iconStroke,
} from './semantic';

describe('semantic tokens and toCssVars generator', () => {
  const cssVars = toCssVars(semantic, '--app');

  it('generates variables where every single key starts with --app-', () => {
    const allKeys = [
      ...Object.keys(cssVars.variables),
      ...Object.keys(cssVars.light),
      ...Object.keys(cssVars.dark),
    ];

    expect(allKeys.length).toBeGreaterThan(0);
    for (const key of allKeys) {
      expect(key.startsWith('--app-')).toBe(true);
    }
  });

  it('produces exactly one variable per semantic leaf (no key dropped or merged)', () => {
    let leaves = 0;
    const walk = (node: unknown) => {
      if (isSchemeValue(node) || typeof node === 'string' || typeof node === 'number') {
        leaves += 1;
        return;
      }
      Object.values(node as Record<string, unknown>).forEach(walk);
    };
    walk(semantic);

    // A scheme leaf appears once in `light` and once in `dark`; count it once.
    const emitted = Object.keys(cssVars.variables).length + Object.keys(cssVars.light).length;
    expect(emitted).toBe(leaves);
    expect(Object.keys(cssVars.light).some((key) => key in cssVars.variables)).toBe(false);
  });

  it('derives radius values from the shape keys', () => {
    expect(radius.control).toBe(primitives.radius[shape.control]);
    expect(radius.container).toBe(primitives.radius[shape.container]);
    expect(radius.pill).toBe(primitives.radius[shape.pill]);
  });

  it('produces the exact surface elevation tokens in light and dark', () => {
    expect(cssVars.light['--app-elevation-surface-canvas']).toBe(elevation.surface.canvas.light);
    expect(cssVars.dark['--app-elevation-surface-canvas']).toBe(elevation.surface.canvas.dark);

    expect(cssVars.light['--app-elevation-surface-sunken']).toBe(elevation.surface.sunken.light);
    expect(cssVars.dark['--app-elevation-surface-sunken']).toBe(elevation.surface.sunken.dark);

    expect(cssVars.light['--app-elevation-surface-raised']).toBe(elevation.surface.raised.light);
    expect(cssVars.dark['--app-elevation-surface-raised']).toBe(elevation.surface.raised.dark);

    expect(cssVars.light['--app-elevation-surface-overlay']).toBe(elevation.surface.overlay.light);
    expect(cssVars.dark['--app-elevation-surface-overlay']).toBe(elevation.surface.overlay.dark);

    expect(cssVars.light['--app-elevation-shadow-raised']).toBe(elevation.shadow.raised.light);
    expect(cssVars.light['--app-elevation-shadow-overlay']).toBe(elevation.shadow.overlay.light);
  });

  it('produces the text and border semantic roles in light and dark', () => {
    expect(cssVars.light['--app-color-text-primary']).toBe(color.text.primary.light);
    expect(cssVars.dark['--app-color-text-primary']).toBe(color.text.primary.dark);

    expect(cssVars.light['--app-color-text-subtle']).toBe(color.text.subtle.light);
    expect(cssVars.dark['--app-color-text-subtle']).toBe(color.text.subtle.dark);

    expect(cssVars.light['--app-color-text-inverse']).toBe(color.text.inverse.light);
    expect(cssVars.dark['--app-color-text-inverse']).toBe(color.text.inverse.dark);

    expect(cssVars.light['--app-color-text-disabled']).toBe(color.text.disabled.light);
    expect(cssVars.dark['--app-color-text-disabled']).toBe(color.text.disabled.dark);

    expect(cssVars.light['--app-color-border-default']).toBe(color.border.default.light);
    expect(cssVars.dark['--app-color-border-default']).toBe(color.border.default.dark);

    expect(cssVars.light['--app-color-border-subtle']).toBe(color.border.subtle.light);
    expect(cssVars.dark['--app-color-border-subtle']).toBe(color.border.subtle.dark);

    expect(cssVars.light['--app-color-border-strong']).toBe(color.border.strong.light);
    expect(cssVars.dark['--app-color-border-strong']).toBe(color.border.strong.dark);

    expect(cssVars.light['--app-color-border-focused']).toBe(color.border.focused.light);
    expect(cssVars.dark['--app-color-border-focused']).toBe(color.border.focused.dark);
  });

  it('produces contextual layer tokens', () => {
    expect(cssVars.light['--app-layer-surface']).toBe(layer.surface.light);
    expect(cssVars.dark['--app-layer-surface']).toBe(layer.surface.dark);

    expect(cssVars.light['--app-layer-surface-hovered']).toBe(layer.surfaceHovered.light);
    expect(cssVars.dark['--app-layer-surface-hovered']).toBe(layer.surfaceHovered.dark);

    expect(cssVars.light['--app-layer-surface-pressed']).toBe(layer.surfacePressed.light);
    expect(cssVars.dark['--app-layer-surface-pressed']).toBe(layer.surfacePressed.dark);

    expect(cssVars.light['--app-layer-border']).toBe(layer.border.light);
    expect(cssVars.dark['--app-layer-border']).toBe(layer.border.dark);

    expect(cssVars.light['--app-layer-field']).toBe(layer.field.light);
    expect(cssVars.dark['--app-layer-field']).toBe(layer.field.dark);
  });

  it('produces shape radius variables', () => {
    expect(cssVars.variables['--app-radius-control']).toBe(radius.control);
    expect(cssVars.variables['--app-radius-container']).toBe(radius.container);
    expect(cssVars.variables['--app-radius-pill']).toBe(radius.pill);
  });

  it('produces motion duration and easing variables', () => {
    expect(cssVars.variables['--app-motion-duration-fast']).toBe(motion.duration.fast);
    expect(cssVars.variables['--app-motion-duration-base']).toBe(motion.duration.base);
    expect(cssVars.variables['--app-motion-duration-slow']).toBe(motion.duration.slow);
    expect(cssVars.variables['--app-motion-easing-standard']).toBe(motion.easing.standard);
  });

  it('produces z-index variables', () => {
    expect(cssVars.variables['--app-z-sidebar']).toBe(z.sidebar);
    expect(cssVars.variables['--app-z-context']).toBe(z.context);
    expect(cssVars.variables['--app-z-navbar']).toBe(z.navbar);
    expect(cssVars.variables['--app-z-drawer']).toBe(z.drawer);
  });

  it('produces chart variables', () => {
    expect(cssVars.variables['--app-chart-height-sm']).toBe(chart.height.sm);
    expect(cssVars.variables['--app-chart-height-md']).toBe(chart.height.md);
    expect(cssVars.variables['--app-chart-height-default']).toBe(chart.height.default);
    expect(cssVars.light['--app-chart-grid']).toBe(chart.grid.light);
    expect(cssVars.dark['--app-chart-grid']).toBe(chart.grid.dark);
    expect(cssVars.light['--app-chart-text']).toBe(chart.text.light);
    expect(cssVars.dark['--app-chart-text']).toBe(chart.text.dark);
  });

  it('maintains backwards-compatible CSS variables for existing CSS modules', () => {
    expect(cssVars.variables['--app-brand-sentry']).toBeDefined();
    expect(cssVars.variables['--app-navbar-height']).toBeDefined();
    expect(cssVars.variables['--app-sidebar-expanded']).toBeDefined();
    expect(cssVars.variables['--app-sidebar-compact']).toBeDefined();
    expect(cssVars.variables['--app-navbar-bg']).toBeDefined();
    expect(cssVars.variables['--app-sidebar-bg']).toBeDefined();
    expect(cssVars.variables['--app-motion-fast']).toBeDefined();
    expect(cssVars.variables['--app-motion-ease']).toBeDefined();

    expect(cssVars.light['--app-surface']).toBeDefined();
    expect(cssVars.light['--app-surface-raised']).toBeDefined();
    expect(cssVars.light['--app-border']).toBeDefined();
    expect(cssVars.light['--app-text-muted']).toBeDefined();

    expect(cssVars.dark['--app-surface']).toBeDefined();
    expect(cssVars.dark['--app-surface-raised']).toBeDefined();
    expect(cssVars.dark['--app-border']).toBeDefined();
    expect(cssVars.dark['--app-text-muted']).toBeDefined();
  });

  it('has identical keys for light and dark schemes (theme symmetry)', () => {
    const lightKeys = Object.keys(cssVars.light).sort();
    const darkKeys = Object.keys(cssVars.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('exposes iconSize and iconStroke as numeric constants for JSX props', () => {
    expect(iconSize.xs).toBe(14);
    expect(iconSize.sm).toBe(16);
    expect(iconSize.md).toBe(18);
    expect(iconSize.lg).toBe(22);
    expect(iconStroke).toBe(1.75);
  });

  it('is connected to theme.ts cssVariablesResolver', () => {
    // Calling cssVariablesResolver with theme
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved = cssVariablesResolver(theme as any);
    expect(resolved).toEqual(cssVars);
  });

  it('defines virtualColor aliases for semantic prop usage', () => {
    const aliasNames = ['brand', 'neutral', 'danger', 'warning', 'success', 'info'] as const;
    for (const name of aliasNames) {
      expect(theme.colors?.[name]).toBeDefined();
      expect(theme.colors?.[name]).toHaveLength(10);
      expect(theme.colors?.[name]?.[0]).toContain(`--mantine-color-${name}-0`);
    }
  });
});
