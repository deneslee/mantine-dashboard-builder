import { describe, expect, it } from 'vitest';
import { theme } from '../theme/theme';
import { primitives, palette, spacing, spacingPx, radius, fontSizes, fontWeights, shadows } from './primitives';

describe('primitives token tier', () => {
  it('defines explicit 10-shade palette tuples for required colors', () => {
    const requiredColors = ['dark', 'gray', 'indigo', 'red', 'green', 'yellow', 'blue'] as const;
    for (const color of requiredColors) {
      expect(palette[color]).toBeDefined();
      expect(palette[color]).toHaveLength(10);
      palette[color].forEach((shade) => {
        expect(typeof shade).toBe('string');
        expect(shade.startsWith('#')).toBe(true);
      });
    }
  });

  it('provides spacing scale with 3xs and 2xs', () => {
    expect(spacingPx['3xs']).toBe(2);
    expect(spacingPx['2xs']).toBe(4);
    expect(spacingPx.xs).toBe(6);
    expect(spacingPx.sm).toBe(10);
    expect(spacingPx.md).toBe(16);
    expect(spacingPx.lg).toBe(24);
    expect(spacingPx.xl).toBe(36);

    expect(spacing['3xs']).toContain('0.125rem');
    expect(spacing['2xs']).toContain('0.25rem');
    expect(spacing.xs).toContain('0.375rem');
    expect(spacing.md).toContain('1rem');
  });

  it('defines radius, font sizes, font weights, and shadows', () => {
    expect(radius.sm).toBeDefined();
    expect(fontSizes.md).toBeDefined();
    expect(fontWeights.regular).toBe('400');
    expect(fontWeights.medium).toBe('600');
    expect(fontWeights.bold).toBe('700');
    expect(shadows.xs).toBeDefined();
    expect(shadows.raised).toBeDefined();
    expect(shadows.overlay).toBeDefined();
  });

  it('provides shell dimensions, z-index, motion, and icon tokens', () => {
    expect(primitives.shell.navbarHeight).toBe(56);
    expect(primitives.zIndex.navbar).toBe(200);
    expect(primitives.motion.duration.base).toBe('180ms');
    expect(primitives.iconSize.sm).toBe(16);
    expect(primitives.iconStroke).toBe(1.75);
    expect(primitives.brand.sentry).toBe('#7553FF');
  });

  it('is read by Mantine createTheme', () => {
    expect(theme.colors?.indigo).toEqual(palette.indigo);
    expect(theme.colors?.dark).toEqual(palette.dark);
    expect(theme.spacing?.md).toBe(spacing.md);
    expect(theme.spacing?.['3xs']).toBe(spacing['3xs']);
    expect(theme.spacing?.['2xs']).toBe(spacing['2xs']);
    expect(theme.fontSizes?.md).toBe(fontSizes.md);
  });
});
