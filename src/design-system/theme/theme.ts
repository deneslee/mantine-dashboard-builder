import { createTheme, mergeThemeOverrides, type CSSVariablesResolver, rem } from '@mantine/core';
import { components } from './components';
import { tokens } from '../tokens/tokens';
import { primitives } from '../tokens/primitives';

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
  colors: primitives.palette,
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
export const cssVariablesResolver: CSSVariablesResolver = (t) => {
  const { shell, zIndex, chrome, surface, motion, brand } = t.other;
  return {
    variables: {
      '--app-brand-sentry': brand.sentry,
      '--app-navbar-height': rem(shell.navbarHeight),
      '--app-sidebar-expanded': rem(shell.sidebar.expanded),
      '--app-sidebar-compact': rem(shell.sidebar.compact),
      '--app-sidebar-icon': rem(shell.sidebar.iconSize),
      '--app-context-default': rem(shell.contextBar.default),

      '--app-z-sidebar': String(zIndex.sidebar),
      '--app-z-context': String(zIndex.contextBar),
      '--app-z-navbar': String(zIndex.navbar),
      '--app-z-drawer': String(zIndex.drawer),

      '--app-navbar-bg': chrome.navbarBg,
      '--app-navbar-border': chrome.navbarBorder,
      '--app-navbar-text': chrome.navbarText,
      '--app-navbar-muted': chrome.navbarMuted,
      '--app-sidebar-bg': chrome.sidebarBg,
      '--app-sidebar-border': chrome.sidebarBorder,
      '--app-sidebar-text': chrome.sidebarText,
      '--app-sidebar-muted': chrome.sidebarMuted,
      '--app-sidebar-hover': chrome.sidebarHover,
      '--app-sidebar-active-bg': chrome.sidebarActiveBg,
      '--app-sidebar-active-text': chrome.sidebarActiveText,
      '--app-sidebar-active-bar': chrome.sidebarActiveBar,

      '--app-motion-fast': motion.fast,
      '--app-motion-base': motion.base,
      '--app-motion-slow': motion.slow,
      '--app-motion-ease': motion.ease,
    },
    light: {
      '--app-surface': surface.light.base,
      '--app-surface-raised': surface.light.raised,
      '--app-border': surface.light.border,
      '--app-text-muted': surface.light.textMuted,
    },
    dark: {
      '--app-surface': surface.dark.base,
      '--app-surface-raised': surface.dark.raised,
      '--app-border': surface.dark.border,
      '--app-text-muted': surface.dark.textMuted,
    },
  };
};
