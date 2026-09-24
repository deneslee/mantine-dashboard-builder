import { rem, type MantineColorsTuple } from '@mantine/core';

/**
 * Tier 1: Primitives (constants).
 * This is the ONLY file with raw values in the design system.
 * Application UI never consumes these directly; semantic and theme layers alias them.
 */

// 1. Explicit 10-shade palette tuples (0 to 9)
export const palette: Record<
  'dark' | 'gray' | 'indigo' | 'red' | 'green' | 'yellow' | 'blue',
  MantineColorsTuple
> = {
  dark: [
    '#C9C9C9',
    '#b8b8b8',
    '#828282',
    '#696969',
    '#424242',
    '#3b3b3b',
    '#2e2e2e',
    '#242424',
    '#1f1f1f',
    '#141414',
  ],
  gray: [
    '#f8f9fa',
    '#f1f3f5',
    '#e9ecef',
    '#dee2e6',
    '#ced4da',
    '#adb5bd',
    '#868e96',
    '#495057',
    '#343a40',
    '#212529',
  ],
  indigo: [
    '#edf2ff',
    '#dbe4ff',
    '#bac8ff',
    '#91a7ff',
    '#748ffc',
    '#5c7cfa',
    '#4c6ef5',
    '#4263eb',
    '#3b5bdb',
    '#364fc7',
  ],
  red: [
    '#fff5f5',
    '#ffe3e3',
    '#ffc9c9',
    '#ffa8a8',
    '#ff8787',
    '#ff6b6b',
    '#fa5252',
    '#f03e3e',
    '#e03131',
    '#c92a2a',
  ],
  green: [
    '#ebfbee',
    '#d3f9d8',
    '#b2f2bb',
    '#8ce99a',
    '#69db7c',
    '#51cf66',
    '#40c057',
    '#37b24d',
    '#2f9e44',
    '#2b8a3e',
  ],
  yellow: [
    '#fff9db',
    '#fff3bf',
    '#ffec99',
    '#ffe066',
    '#ffd43b',
    '#fcc419',
    '#fab005',
    '#f59f00',
    '#f08c00',
    '#e67700',
  ],
  blue: [
    '#e7f5ff',
    '#d0ebff',
    '#a5d8ff',
    '#74c0fc',
    '#4dabf7',
    '#339af0',
    '#228be6',
    '#1c7ed6',
    '#1971c2',
    '#1864ab',
  ],
};

export const white = '#ffffff';
export const black = '#000000';

// 2. Alpha steps for dark/light overlays and borders
export const alpha = {
  white: {
    4: 'rgba(255, 255, 255, 0.04)',
    8: 'rgba(255, 255, 255, 0.08)',
    12: 'rgba(255, 255, 255, 0.12)',
    14: 'rgba(255, 255, 255, 0.14)',
    16: 'rgba(255, 255, 255, 0.16)',
    24: 'rgba(255, 255, 255, 0.24)',
    32: 'rgba(255, 255, 255, 0.32)',
    48: 'rgba(255, 255, 255, 0.48)',
    64: 'rgba(255, 255, 255, 0.64)',
    80: 'rgba(255, 255, 255, 0.80)',
    92: 'rgba(255, 255, 255, 0.92)',
  },
  black: {
    4: 'rgba(0, 0, 0, 0.04)',
    5: 'rgba(0, 0, 0, 0.05)',
    8: 'rgba(0, 0, 0, 0.08)',
    10: 'rgba(0, 0, 0, 0.10)',
    16: 'rgba(0, 0, 0, 0.16)',
    24: 'rgba(0, 0, 0, 0.24)',
    32: 'rgba(0, 0, 0, 0.32)',
    48: 'rgba(0, 0, 0, 0.48)',
    64: 'rgba(0, 0, 0, 0.64)',
    80: 'rgba(0, 0, 0, 0.80)',
  },
} as const;

// 3. Spacing scale: current scale (6, 10, 16, 24, 36) plus 2xs (4) and 3xs (2)
export const spacingPx = {
  '3xs': 2,
  '2xs': 4,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
} as const;

export const spacing = {
  '3xs': rem(spacingPx['3xs']),
  '2xs': rem(spacingPx['2xs']),
  xs: rem(spacingPx.xs),
  sm: rem(spacingPx.sm),
  md: rem(spacingPx.md),
  lg: rem(spacingPx.lg),
  xl: rem(spacingPx.xl),
} as const;

// 4. Radius scale
export const radiusPx = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 32,
} as const;

export const radius = {
  xs: rem(radiusPx.xs),
  sm: rem(radiusPx.sm),
  md: rem(radiusPx.md),
  lg: rem(radiusPx.lg),
  xl: rem(radiusPx.xl),
} as const;

// 5. Font sizes scale
export const fontSizesPx = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
} as const;

export const fontSizes = {
  xs: rem(fontSizesPx.xs),
  sm: rem(fontSizesPx.sm),
  md: rem(fontSizesPx.md),
  lg: rem(fontSizesPx.lg),
  xl: rem(fontSizesPx.xl),
} as const;

// 6. Font weights scale
export const fontWeights = {
  regular: '400',
  medium: '600',
  bold: '700',
} as const;

// 7. Line heights scale
export const lineHeights = {
  xs: '1.4',
  sm: '1.45',
  md: '1.55',
  lg: '1.6',
  xl: '1.65',
} as const;

// 8. Headings sizes & weights
export const headings = {
  h1: { fontSize: rem(24), lineHeight: '1.25' },
  h2: { fontSize: rem(22), lineHeight: '1.3' },
  h3: { fontSize: rem(18), lineHeight: '1.35' },
  h4: { fontSize: rem(16), lineHeight: '1.4' },
} as const;

// 9. Shadows
export const shadows = {
  xs: '0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, 0.05), 0 calc(0.0625rem * var(--mantine-scale)) calc(0.125rem * var(--mantine-scale)) rgba(0, 0, 0, 0.1)',
  sm: '0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0 calc(0.625rem * var(--mantine-scale)) calc(0.9375rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale)), rgba(0, 0, 0, 0.04) 0 calc(0.4375rem * var(--mantine-scale)) calc(0.4375rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale))',
  md: '0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0 calc(1.25rem * var(--mantine-scale)) calc(1.5625rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale)), rgba(0, 0, 0, 0.04) 0 calc(0.625rem * var(--mantine-scale)) calc(0.625rem * var(--mantine-scale)) calc(-0.3125rem * var(--mantine-scale))',
  lg: '0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0 calc(1.75rem * var(--mantine-scale)) calc(1.4375rem * var(--mantine-scale)) calc(-0.4375rem * var(--mantine-scale)), rgba(0, 0, 0, 0.04) 0 calc(0.75rem * var(--mantine-scale)) calc(0.75rem * var(--mantine-scale)) calc(-0.4375rem * var(--mantine-scale))',
  xl: '0 calc(0.0625rem * var(--mantine-scale)) calc(0.1875rem * var(--mantine-scale)) rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0 calc(2.25rem * var(--mantine-scale)) calc(1.75rem * var(--mantine-scale)) calc(-0.4375rem * var(--mantine-scale)), rgba(0, 0, 0, 0.04) 0 calc(1.0625rem * var(--mantine-scale)) calc(1.0625rem * var(--mantine-scale)) calc(-0.4375rem * var(--mantine-scale))',
  raised: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  overlay: '0 4px 12px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
} as const;

// 10. Motion durations and easings
export const motion = {
  duration: {
    fast: '120ms',
    base: '180ms',
    slow: '260ms',
  },
  easing: {
    ease: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

// 11. Z-index numbers
export const zIndex = {
  sidebar: 190,
  contextBar: 190,
  navbar: 200,
  drawer: 300,
  modal: 400,
  notification: 500,
} as const;

// 12. Icon sizes and stroke
export const iconSize = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 22,
} as const;

export const iconStroke = 1.75;

// 13. Shell dimensions
export const shell = {
  navbarHeight: 56,
  sidebar: { expanded: 260, compact: 56, min: 200, max: 400, iconSize: 18 },
  contextBar: { default: 360, min: 280, max: 640 },
} as const;

// 14. Grid settings (dashboard canvas)
export const grid = {
  breakpoints: { lg: 1100, md: 640, sm: 0 },
  cols: { lg: 12, md: 8, sm: 4 },
  rowHeight: 40,
  gap: 16,
} as const;

// 15. Third-party brand logos (not roles)
export const brand = {
  sentry: '#7553FF',
} as const;

// Grouped export
export const primitives = {
  palette,
  white,
  black,
  alpha,
  spacingPx,
  spacing,
  radiusPx,
  radius,
  fontSizesPx,
  fontSizes,
  fontWeights,
  lineHeights,
  headings,
  shadows,
  motion,
  zIndex,
  iconSize,
  iconStroke,
  shell,
  grid,
  brand,
} as const;

export type Primitives = typeof primitives;
