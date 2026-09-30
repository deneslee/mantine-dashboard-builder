/**
 * Layout numbers that TS code outside the design system needs (Splitter sizes, the shell store,
 * the grid breakpoints). Colors, surfaces and motion are CSS variables from `semantic.ts`.
 */

import { grid, shell, zIndex } from './primitives';

export const tokens = { shell, zIndex, grid } as const;
