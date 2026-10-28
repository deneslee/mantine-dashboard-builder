import { Paper, type PaperProps } from '@mantine/core';
import { use, type ComponentPropsWithRef, type ReactNode } from 'react';
import { nextLevel, SurfaceLevelContext, type SurfaceLevel } from './surfaceLevel';
import classes from './Surface.module.css';

interface SurfaceProps
  extends
    Omit<PaperProps, 'shadow' | 'variant' | 'withBorder' | 'mod'>,
    Omit<ComponentPropsWithRef<'div'>, keyof PaperProps | 'style'> {
  /** Omit to sit one step in front of the surface around it (canvas → panel → raised → sunken). */
  level?: SurfaceLevel;
  /** `acrylic`: frosted glass, for surfaces floating over moving content; solid where unsupported. */
  material?: 'solid' | 'acrylic';
  withBorder?: boolean;
  component?: 'div' | 'section' | 'article' | 'aside' | 'header';
  children?: ReactNode;
}

/**
 * A layer of the UI: background, border and shadow from its level, so stacked things stay apart
 * in both schemes. It also sets `--app-layer-surface` and `--app-layer-border` for its subtree, so
 * parts that must match the surface behind them (a sticky table header, a Tabs border) do.
 */
export function Surface({
  level,
  material = 'solid',
  withBorder = true,
  className,
  children,
  ...rest
}: SurfaceProps) {
  const parent = use(SurfaceLevelContext);
  const resolved = level ?? nextLevel(parent);
  return (
    <SurfaceLevelContext value={resolved}>
      <Paper
        {...rest}
        className={className ? `${classes.root} ${className}` : classes.root}
        mod={{ level: resolved, material, borderless: !withBorder }}
      >
        {children}
      </Paper>
    </SurfaceLevelContext>
  );
}
