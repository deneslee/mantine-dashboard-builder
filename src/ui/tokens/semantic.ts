import { rem, virtualColor } from '@mantine/core';
import { primitives } from './primitives';

/**
 * Tier 2: Semantic Design Tokens.
 *
 * Semantic tokens represent global visual roles and meanings that alias primitives.
 * Theme-dependent roles define both `light` and `dark` values.
 * Emitted as `--app-*` CSS variables via `toCssVars()`.
 */

export interface SchemeValue<T = string> {
  light: T;
  dark: T;
}

export function isSchemeValue(val: unknown): val is SchemeValue<string> {
  return (
    typeof val === 'object' &&
    val !== null &&
    'light' in val &&
    'dark' in val &&
    typeof (val as SchemeValue).light === 'string' &&
    typeof (val as SchemeValue).dark === 'string'
  );
}

/**
 * Status and role colors as Mantine virtualColor aliases.
 * Enables props such as `color="danger"` or `color="brand"`.
 */
export const virtualColors = {
  brand: virtualColor({ name: 'brand', light: 'indigo', dark: 'indigo' }),
  neutral: virtualColor({ name: 'neutral', light: 'gray', dark: 'gray' }),
  danger: virtualColor({ name: 'danger', light: 'red', dark: 'red' }),
  warning: virtualColor({ name: 'warning', light: 'yellow', dark: 'yellow' }),
  success: virtualColor({ name: 'success', light: 'green', dark: 'green' }),
  info: virtualColor({ name: 'info', light: 'blue', dark: 'blue' }),
} as const;

const { neutral } = primitives;
const shadowRamp = primitives.elevationShadows;

/**
 * 1. Elevation: surfaces from back to front,
 * - `canvas` the page; `panel` regions on it (panes, sections, the context bar); `raised` cards
 *   and widgets; `sunken` wells inside a card; `overlay` menus, popovers, drawers, modals.
 * - Light separates with white panels on a grey canvas plus shadow; dark gets lighter toward the
 *   viewer, so shadows alone don't have to carry it.
 * - Shadows only from `raised` up
 */
export const elevation = {
  surface: {
    canvas: { light: neutral[96], dark: neutral[10] },
    panel: { light: primitives.white, dark: neutral[14] },
    sunken: { light: neutral[98], dark: neutral[12] },
    raised: { light: primitives.white, dark: neutral[18] },
    raisedHovered: { light: neutral[98], dark: neutral[20] },
    raisedPressed: { light: neutral[94], dark: neutral[16] },
    overlay: { light: primitives.white, dark: neutral[20] },
    overlayHovered: { light: neutral[96], dark: neutral[24] },
  },
  shadow: {
    /** Cards and widgets on a panel or the canvas (Fluent shadow 4). */
    raised: { light: shadowRamp.light[4], dark: shadowRamp.dark[4] },
    /** Things that float over content: a dragged tile, a sticky or floating bar (shadow 8). */
    floating: { light: shadowRamp.light[8], dark: shadowRamp.dark[8] },
    /** Menus, popovers, the Spotlight (shadow 16). */
    overlay: { light: shadowRamp.light[16], dark: shadowRamp.dark[16] },
    /** Modals and drawers, above a scrim (shadow 64). */
    modal: { light: shadowRamp.light[64], dark: shadowRamp.dark[64] },
  },
} as const;

/** Acrylic: frosted glass for surfaces floating over moving content (Fluent 2 materials). */
export const material = {
  acrylic: {
    opacity: primitives.acrylic.opacity,
    blur: primitives.acrylic.blur,
    saturate: primitives.acrylic.saturate,
  },
} as const;

// 2. Color: Text and Border roles
export const color = {
  text: {
    primary: {
      light: primitives.palette.gray[9],
      dark: primitives.palette.dark[0],
    },
    subtle: {
      light: primitives.palette.gray[6],
      dark: primitives.palette.dark[2],
    },
    subtlest: {
      light: primitives.palette.gray[5],
      dark: primitives.palette.dark[3],
    },
    inverse: {
      light: primitives.white,
      dark: primitives.palette.gray[9],
    },
    disabled: {
      light: primitives.palette.gray[4],
      dark: primitives.palette.dark[4],
    },
  },
  // Translucent stroke the same token reads on every surface it sits on.
  border: {
    default: {
      light: primitives.alpha.black[16],
      dark: primitives.alpha.white[14],
    },
    subtle: {
      light: primitives.alpha.black[8],
      dark: primitives.alpha.white[8],
    },
    strong: {
      light: primitives.alpha.black[32],
      dark: primitives.alpha.white[24],
    },
    focused: {
      light: primitives.palette.indigo[6],
      dark: primitives.palette.indigo[4],
    },
  },
} as const;

/**
 * 3. The surface something sits on. These are the page-level defaults; every `Surface` overrides
 * `surface` and `border` for its own subtree, so a Table header or a Tabs border inside a widget
 * matches the widget.
 */
export const layer = {
  surface: elevation.surface.canvas,
  surfaceHovered: elevation.surface.raisedHovered,
  surfacePressed: elevation.surface.raisedPressed,
  border: color.border.default,
  field: {
    light: primitives.white,
    dark: primitives.palette.dark[8],
  },
} as const;

// 4. Shape: Mantine radius keys for `radius=` props; `radius` is the same scale as CSS values
export const shape = {
  control: 'sm',
  container: 'md',
  pill: 'xl',
} as const;

export const radius = {
  control: primitives.radius[shape.control],
  container: primitives.radius[shape.container],
  pill: primitives.radius[shape.pill],
} as const;

/**
 * Values for Mantine `fw=` props. Mantine passes `fw` through as-is (`fw="medium"` would be invalid
 * CSS), so these point at the theme's font-weight variables.
 */
export const fontWeight = {
  regular: 'var(--mantine-font-weight-regular)',
  medium: 'var(--mantine-font-weight-medium)',
  bold: 'var(--mantine-font-weight-bold)',
} as const;

/** Values for Mantine `shadow=` props. Mantine passes `var(…)` through unchanged. */
export const shadow = {
  raised: 'var(--app-elevation-shadow-raised)',
  floating: 'var(--app-elevation-shadow-floating)',
  overlay: 'var(--app-elevation-shadow-overlay)',
  modal: 'var(--app-elevation-shadow-modal)',
} as const;

// 5. Motion: semantic durations and easings
export const motion = {
  duration: {
    fast: primitives.motion.duration.fast,
    base: primitives.motion.duration.base,
    slow: primitives.motion.duration.slow,
  },
  easing: {
    standard: primitives.motion.easing.ease,
  },
} as const;

// 6. Z-index layering order
export const z = {
  sidebar: String(primitives.zIndex.sidebar),
  context: String(primitives.zIndex.contextBar),
  navbar: String(primitives.zIndex.navbar),
  drawer: String(primitives.zIndex.drawer),
  modal: String(primitives.zIndex.modal),
  notification: String(primitives.zIndex.notification),
} as const;

// 7. Chart semantic tokens
export const chart = {
  height: {
    sm: '180px',
    md: '200px',
    default: '200px',
  },
  grid: color.border.subtle,
  text: color.text.subtle,
} as const;

// 8. Icon tokens (TS constants for direct SVG prop consumption)
export const iconSize = primitives.iconSize;
export const iconStroke = primitives.iconStroke;

// 9. Shell dimensions
export const shell = {
  navbarHeight: rem(primitives.shell.navbarHeight),
  sidebarExpanded: rem(primitives.shell.sidebar.expanded),
  sidebarCompact: rem(primitives.shell.sidebar.compact),
  sidebarIcon: rem(primitives.shell.sidebar.iconSize),
  contextDefault: rem(primitives.shell.contextBar.default),
} as const;

/**
 * 10. Chrome: the navbar and sidebar stay dark in both schemes, Carbon's "inline theming" of a dark
 * shell around the page. Only the background differs: in light it is a softer dark grey, so it
 * frames a white page without a hard black edge; in dark it sits one step behind the canvas.
 * Everything drawn on it (text, hover, borders, the active item) is light-on-dark, the same in both.
 * The navbar is acrylic: content scrolls under it.
 */
const chromeBg = { light: neutral[14], dark: neutral[8] };
const acrylicOf = (bg: string) => `color-mix(in srgb, ${bg} 92%, transparent)`;
const tint = (shade: string, percent: number) => `color-mix(in srgb, ${shade} ${percent}%, transparent)`;
const chromeText = primitives.palette.gray[3];
const chromeMuted = primitives.palette.gray[5];

export const chrome = {
  navbarBg: { light: acrylicOf(chromeBg.light), dark: acrylicOf(chromeBg.dark) },
  navbarBorder: primitives.alpha.white[8],
  navbarText: chromeText,
  navbarTextStrong: primitives.white,
  navbarMuted: chromeMuted,
  navbarHover: primitives.alpha.white[8],
  navbarActive: primitives.alpha.white[12],
  navbarInputBg: primitives.alpha.white[8],
  navbarInputBgHover: primitives.alpha.white[12],
  navbarInputBorder: primitives.alpha.white[10],
  sidebarBg: chromeBg,
  sidebarBorder: primitives.alpha.white[8],
  sidebarText: chromeText,
  sidebarTextStrong: primitives.white,
  sidebarMuted: chromeMuted,
  sidebarHover: primitives.alpha.white[8],
  sidebarActiveBg: tint(primitives.palette.indigo[5], 24),
  sidebarActiveText: primitives.white,
  sidebarActiveBar: primitives.palette.indigo[4],
} as const;

/** Complete semantic token tree. */
export const semantic = {
  elevation,
  material,
  color,
  layer,
  radius,
  motion,
  z,
  chart,
  shell,
  chrome,
} as const;

export type SemanticTokens = typeof semantic;

/**
 * Result structure matching Mantine's CSSVariablesResolver.
 */
export interface CssVarsResult {
  variables: Record<string, string>;
  light: Record<string, string>;
  dark: Record<string, string>;
}

/**
 * Converts a camelCase identifier to kebab-case.
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Walks the semantic object and generates CSS variable mappings.
 *
 * - Theme-dependent nodes (`{ light, dark }`) produce variables in `light` and `dark`.
 * - Fixed values (strings or numbers) produce variables in `variables`.
 * - Keys are transformed to kebab-case and joined with `-`.
 * - `shell` and `chrome` keys are flattened (`--app-navbar-height`, not `--app-shell-navbar-height`).
 */
export function toCssVars(obj: Record<string, unknown>, prefix = '--app'): CssVarsResult {
  const result: CssVarsResult = {
    variables: {},
    light: {},
    dark: {},
  };

  const skipTopLevel = new Set(['shell', 'chrome']);

  function walk(current: unknown, path: string[]) {
    if (isSchemeValue(current)) {
      const varName = `${prefix}-${path.map(toKebabCase).join('-')}`;
      result.light[varName] = current.light;
      result.dark[varName] = current.dark;
      return;
    }

    if (typeof current === 'string' || typeof current === 'number') {
      const varName = `${prefix}-${path.map(toKebabCase).join('-')}`;
      result.variables[varName] = String(current);
      return;
    }

    if (typeof current === 'object' && current !== null) {
      for (const [key, value] of Object.entries(current)) {
        // Strip the top-level namespace for shell and chrome
        const nextPath = path.length === 0 && skipTopLevel.has(key) ? path : [...path, key];
        walk(value, nextPath);
      }
    }
  }

  walk(obj, []);
  return result;
}
