import { createTheme, mergeThemeOverrides, type CSSVariablesResolver } from '@mantine/core';
import { components } from './components';
import { tokens } from '../tokens/tokens';
import { primitives } from '../tokens/primitives';
import { semantic, toCssVars, virtualColors } from '../tokens/semantic';

export const theme = createTheme({
  primaryColor: 'indigo',
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'sm',
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
  other: tokens,
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

/** Emits app tokens as CSS variables so CSS modules can read them. */
export const cssVariablesResolver: CSSVariablesResolver = () => {
  return toCssVars(semantic, '--app');
};
