/**
 * App-level design tokens. Everything not covered by Mantine's own theme lives here.
 * Emitted as CSS variables by `cssVariablesResolver` in theme/theme.ts, so CSS modules
 * read `var(--app-*)` and TS reads `theme.other`.
 */

import { brand, grid, motion as primitiveMotion, shell, zIndex } from './primitives';

export { brand, grid, shell, zIndex };

/**
 * Chrome colors are the same in light and dark schemes; only the content area follows
 * the color scheme. Values are Mantine palette references so they stay in one system.
 */
export const chrome = {
  navbarBg: 'rgba(12, 12, 14, 0.92)',
  navbarBorder: 'rgba(255, 255, 255, 0.08)',
  navbarText: 'var(--mantine-color-gray-2)',
  navbarMuted: 'var(--mantine-color-gray-5)',
  sidebarBg: 'var(--mantine-color-dark-7)',
  sidebarBorder: 'var(--mantine-color-dark-5)',
  sidebarText: 'var(--mantine-color-gray-4)',
  sidebarMuted: 'var(--mantine-color-gray-6)',
  sidebarHover: 'var(--mantine-color-dark-6)',
  sidebarActiveBg: 'color-mix(in srgb, var(--mantine-color-indigo-5) 24%, transparent)',
  sidebarActiveText: 'var(--mantine-color-white)',
  sidebarActiveBar: 'var(--mantine-color-indigo-4)',
} as const;

/** Content-area surfaces; resolved per color scheme in the resolver. */
export const surface = {
  light: {
    base: 'var(--mantine-color-gray-0)',
    raised: 'var(--mantine-color-white)',
    border: 'var(--mantine-color-gray-3)',
    textMuted: 'var(--mantine-color-gray-6)',
  },
  dark: {
    base: 'var(--mantine-color-dark-8)',
    raised: 'var(--mantine-color-dark-7)',
    border: 'var(--mantine-color-dark-4)',
    textMuted: 'var(--mantine-color-dark-2)',
  },
} as const;

export const motion = {
  fast: primitiveMotion.duration.fast,
  base: primitiveMotion.duration.base,
  slow: primitiveMotion.duration.slow,
  ease: primitiveMotion.easing.ease,
} as const;

export const tokens = { shell, zIndex, chrome, surface, motion, grid, brand } as const;
export type Tokens = typeof tokens;
