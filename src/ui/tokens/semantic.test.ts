import { describe, expect, it } from 'vite-plus/test';
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

  it('emits shell and chrome variables without their group name', () => {
    expect(cssVars.variables['--app-navbar-height']).toBeDefined();
    expect(cssVars.variables['--app-sidebar-expanded']).toBeDefined();
    expect(cssVars.variables['--app-sidebar-compact']).toBeDefined();
    expect(cssVars.light['--app-navbar-bg']).toBeDefined();
    expect(cssVars.dark['--app-sidebar-bg']).toBeDefined();
    expect(cssVars.variables['--app-navbar-input-bg']).toBeDefined();
  });

  it('keeps the chrome dark in both schemes, a different shade in each', () => {
    const light = cssVars.light['--app-sidebar-bg'];
    const dark = cssVars.dark['--app-sidebar-bg'];
    expect(light).not.toBe(dark);
    // Both dark greys: the red channel well under the midpoint.
    for (const bg of [light, dark]) expect(parseInt(bg!.slice(1, 3), 16)).toBeLessThan(0x40);
    // What sits on the chrome is light-on-dark and the same in both schemes.
    expect(cssVars.variables['--app-sidebar-text']).toBeDefined();
    expect(cssVars.variables['--app-sidebar-active-text']).toBe('#ffffff');
    expect(cssVars.light['--app-navbar-bg']).toContain('color-mix');
  });

  it('separates every surface from the one behind it', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const s = elevation.surface;
      expect(s.panel[scheme]).not.toBe(s.canvas[scheme]);
      expect(s.sunken[scheme]).not.toBe(s.panel[scheme]);
    }
    // Dark gets lighter toward the viewer: canvas < panel < raised < overlay.
    const dark = ['canvas', 'panel', 'raised', 'overlay'] as const;
    const lightness = dark.map((k) => parseInt(elevation.surface[k].dark.slice(1, 3), 16));
    expect([...lightness].sort((a, b) => a - b)).toEqual(lightness);
  });

  it('has a shadow for every level from raised up, in both schemes', () => {
    for (const level of ['raised', 'floating', 'overlay', 'modal'] as const) {
      expect(cssVars.light[`--app-elevation-shadow-${level}`]).toBe(elevation.shadow[level].light);
      expect(cssVars.dark[`--app-elevation-shadow-${level}`]).not.toBe('none');
    }
    expect(cssVars.variables['--app-material-acrylic-blur']).toBeDefined();
  });

  it('has no legacy variable names left', () => {
    const all = { ...cssVars.variables, ...cssVars.light };
    for (const name of [
      '--app-surface',
      '--app-border',
      '--app-text-muted',
      '--app-motion-fast',
      '--app-brand-sentry',
    ]) {
      expect(all[name]).toBeUndefined();
    }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved = cssVariablesResolver(theme as any);
    expect(resolved.variables).toEqual(cssVars.variables);
    expect(resolved.light).toMatchObject(cssVars.light);
    expect(resolved.dark).toMatchObject(cssVars.dark);
  });

  it("points Mantine's body and dimmed colors at our tokens in both schemes", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved = cssVariablesResolver(theme as any);
    for (const scheme of [resolved.light, resolved.dark]) {
      expect(scheme['--mantine-color-body']).toBe('var(--app-elevation-surface-overlay)');
      expect(scheme['--mantine-color-dimmed']).toBe('var(--app-color-text-subtle)');
    }
    expect(cssVars.light['--app-elevation-surface-overlay']).toBeDefined();
    expect(cssVars.light['--app-color-text-subtle']).toBeDefined();
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
