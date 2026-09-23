import { createTheme, type CSSVariablesResolver, rem } from '@mantine/core';
import { components } from './components';
import { tokens } from '../tokens/tokens';

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
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(24), lineHeight: '1.25' },
      h2: { fontSize: rem(22), lineHeight: '1.3' },
      h3: { fontSize: rem(18), lineHeight: '1.35' },
      h4: { fontSize: rem(16), lineHeight: '1.4' },
    },
  },
  fontSizes: { xs: rem(11), sm: rem(13), md: rem(14), lg: rem(16), xl: rem(18) },
  spacing: { xs: rem(6), sm: rem(10), md: rem(16), lg: rem(24), xl: rem(36) },
  cursorType: 'pointer',
  focusRing: 'auto',
  other: tokens,
  components,
});

/** Emits app tokens as CSS variables so CSS modules can read them. */
export const cssVariablesResolver: CSSVariablesResolver = (t) => {
  const { shell, zIndex, chrome, surface, motion } = t.other;
  return {
    variables: {
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
