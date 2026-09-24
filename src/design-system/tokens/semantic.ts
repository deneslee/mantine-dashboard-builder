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

// 1. Elevation & Surfaces: Atlassian vocabulary + exact surface model
export const elevation = {
  surface: {
    canvas: {
      light: primitives.palette.gray[0],
      dark: primitives.palette.dark[8],
    },
    sunken: {
      light: primitives.palette.gray[1],
      dark: primitives.palette.dark[9],
    },
    raised: {
      light: primitives.white,
      dark: primitives.palette.dark[7],
    },
    raisedHovered: {
      light: primitives.palette.gray[0],
      dark: primitives.palette.dark[6],
    },
    raisedPressed: {
      light: primitives.palette.gray[1],
      dark: primitives.palette.dark[5],
    },
    overlay: {
      light: primitives.white,
      dark: primitives.palette.dark[7],
    },
    overlayHovered: {
      light: primitives.palette.gray[0],
      dark: primitives.palette.dark[6],
    },
  },
  shadow: {
    raised: {
      light: primitives.shadows.raised,
      dark: 'none',
    },
    overlay: {
      light: primitives.shadows.overlay,
      dark: primitives.shadows.overlay,
    },
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
  border: {
    default: {
      light: primitives.palette.gray[3],
      dark: primitives.palette.dark[4],
    },
    subtle: {
      light: primitives.palette.gray[2],
      dark: primitives.palette.dark[5],
    },
    strong: {
      light: primitives.palette.gray[4],
      dark: primitives.palette.dark[3],
    },
    focused: {
      light: primitives.palette.indigo[6],
      dark: primitives.palette.indigo[4],
    },
  },
} as const;

// 3. Contextual layer defaults (Carbon-aligned baseline before layers.css nesting)
export const layer = {
  surface: {
    light: primitives.white,
    dark: primitives.palette.dark[7],
  },
  surfaceHovered: {
    light: primitives.palette.gray[0],
    dark: primitives.palette.dark[6],
  },
  surfacePressed: {
    light: primitives.palette.gray[1],
    dark: primitives.palette.dark[5],
  },
  border: {
    light: primitives.palette.gray[3],
    dark: primitives.palette.dark[4],
  },
  field: {
    light: primitives.white,
    dark: primitives.palette.dark[8],
  },
} as const;

// 4. Shape: semantic radius tokens
export const radius = {
  control: primitives.radius.sm,
  container: primitives.radius.md,
  pill: primitives.radius.xl,
} as const;

export const shape = {
  control: 'sm',
  container: 'md',
  pill: 'xl',
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
  grid: {
    light: primitives.palette.gray[2],
    dark: primitives.palette.dark[5],
  },
  text: {
    light: primitives.palette.gray[6],
    dark: primitives.palette.dark[2],
  },
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

// 10. Chrome: always-dark chrome tokens (retained until chrome-zone spike completes)
export const chrome = {
  navbarBg: primitives.alpha.black[92],
  navbarBorder: primitives.alpha.white[8],
  navbarText: primitives.palette.gray[2],
  navbarMuted: primitives.palette.gray[5],
  sidebarBg: primitives.palette.dark[7],
  sidebarBorder: primitives.palette.dark[5],
  sidebarText: primitives.palette.gray[4],
  sidebarMuted: primitives.palette.gray[6],
  sidebarHover: primitives.palette.dark[6],
  sidebarActiveBg: `color-mix(in srgb, ${primitives.palette.indigo[5]} 24%, transparent)`,
  sidebarActiveText: primitives.white,
  sidebarActiveBar: primitives.palette.indigo[4],
} as const;

// 11. Legacy compatibility aliases for existing CSS modules until Tasks 13 & 14
export const legacy = {
  surface: {
    light: primitives.palette.gray[0],
    dark: primitives.palette.dark[8],
  },
  surfaceRaised: {
    light: primitives.white,
    dark: primitives.palette.dark[7],
  },
  border: {
    light: primitives.palette.gray[3],
    dark: primitives.palette.dark[4],
  },
  textMuted: {
    light: primitives.palette.gray[6],
    dark: primitives.palette.dark[2],
  },
  motionFast: primitives.motion.duration.fast,
  motionBase: primitives.motion.duration.base,
  motionSlow: primitives.motion.duration.slow,
  motionEase: primitives.motion.easing.ease,
  brandSentry: primitives.brand.sentry,
} as const;

/** Complete semantic token tree. */
export const semantic = {
  elevation,
  color,
  layer,
  radius,
  motion,
  z,
  chart,
  shell,
  chrome,
  legacy,
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
 * - `legacy` container keys are flattened to avoid `--app-legacy-*`.
 */
export function toCssVars(obj: Record<string, unknown>, prefix = '--app'): CssVarsResult {
  const result: CssVarsResult = {
    variables: {},
    light: {},
    dark: {},
  };

  const skipTopLevel = new Set(['legacy', 'shell', 'chrome']);

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
        // Strip top-level namespace for legacy, shell, and chrome so variables match expectations
        const nextPath = path.length === 0 && skipTopLevel.has(key) ? path : [...path, key];
        walk(value, nextPath);
      }
    }
  }

  walk(obj, []);
  return result;
}
