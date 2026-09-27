import { createTheme, mergeThemeOverrides, type CSSVariablesResolver } from '@mantine/core';
import { components } from './components';
import { primitives } from '../tokens/primitives';
import { semantic, shape, toCssVars, virtualColors } from '../tokens/semantic';

export const theme = createTheme({
  primaryColor: 'indigo',
  primaryShade: { light: 6, dark: 5 },
  // Controls without their own theme file (SegmentedControl, Checkbox, Badge, ...) use this.
  defaultRadius: shape.control,
  fontFamily:
    '"DM Sans Variable", "Source Sans 3 Variable", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  fontFamilyMonospace:
    '"Source Code Pro Variable", "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  headings: {
    fontFamily: 'inherit',
    fontWeight: primitives.fontWeights.medium,
    sizes: primitives.headings,
  },
  colors: {
    ...primitives.palette,
    ...virtualColors,
  },
  fontSizes: primitives.fontSizes,
  fontWeights: primitives.fontWeights,
  spacing: primitives.spacing,
  radius: primitives.radius,
  shadows: primitives.shadows,
  cursorType: 'pointer',
  focusRing: 'auto',
  // Mantine transitions (Drawer, Menu, Collapse, Tooltip) go instant under the OS reduced-motion setting.
  respectReducedMotion: true,
  components,
});

const instant = { defaultProps: { transitionProps: { duration: 0 } } };

/**
 * The theme for the user's "reduce motion" setting. Mantine only zeroes its JS-timed transitions for
 * the OS setting (`respectReducedMotion`), so this sets them to 0ms directly; overlays then also
 * unmount at once instead of lingering invisibly. CSS transitions are handled by `[data-motion]`
 * in global.css.
 */
export const reducedMotionTheme = mergeThemeOverrides(
  theme,
  createTheme({
    components: {
      Drawer: instant,
      Modal: instant,
      Popover: instant,
      Menu: instant,
      Combobox: instant,
      Tooltip: instant,
      HoverCard: instant,
      Spotlight: instant,
      Collapse: { defaultProps: { transitionDuration: 0 } },
    },
  }),
);

/**
 * Mantine's own variables, pointed at our tokens. Mantine deep-merges this resolver over its
 * defaults, so Paper, Menu, Popover, Modal, Drawer and Spotlight follow the tokens without their
 * own classNames. They sit in the scheme blocks because that's where Mantine defines them.
 */
const mantineVars = {
  '--mantine-color-body': 'var(--app-elevation-surface-overlay)',
  '--mantine-color-dimmed': 'var(--app-color-text-subtle)',
};

/** Emits app tokens as CSS variables so CSS modules can read them. */
export const cssVariablesResolver: CSSVariablesResolver = () => {
  const vars = toCssVars(semantic, '--app');
  return {
    variables: vars.variables,
    light: { ...vars.light, ...mantineVars },
    dark: { ...vars.dark, ...mantineVars },
  };
};
