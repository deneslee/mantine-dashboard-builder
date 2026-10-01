/**
 * Layout numbers that TS code outside the design system needs (Splitter sizes, the shell store,
 * the grid breakpoints). Colors, surfaces and motion are CSS variables from `semantic.ts`.
 */

import { GRID_COLUMNS } from '@/core/dashboard/layout';
import { grid, shell, zIndex } from './primitives';

/** `grid.cols` is the document's `GRID_COLUMNS`: layouts are validated against it. */
export const dimensions = { shell, zIndex, grid: { ...grid, cols: GRID_COLUMNS } } as const;
