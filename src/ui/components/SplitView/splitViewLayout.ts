import type { SplitterPaneSize } from '@mantine/hooks';

/**
 * - `open`: at its last open size.
 * - `compact`: a fixed rail with the same content in icon form.
 * - `collapsed`: Mantine's collapse to 0, the handle stays to drag it back.
 * - `closed`: 0 with its content unmounted.
 */
export type PaneState = 'open' | 'compact' | 'collapsed' | 'closed';

export interface PaneLayoutInput {
  state: PaneState;
  /** The pane renders in a Drawer instead, because the container is narrow. */
  isDrawer: boolean;
  /** The size it had when last open; its `defaultSize` until the user resizes it. */
  openSize: SplitterPaneSize;
  min?: SplitterPaneSize;
  max?: SplitterPaneSize;
  rail: number;
}

export interface PaneLayout {
  size: SplitterPaneSize;
  min?: SplitterPaneSize;
  max?: SplitterPaneSize;
  /** Not resizable: its handle is inert. */
  isFixed: boolean;
  /** Where the content renders. */
  content: 'split' | 'drawer' | 'none';
}

const isPx = (size: SplitterPaneSize) => typeof size === 'string' && /(px|rem)$/.test(size);

/** Zero in the pane's own unit: Splitter reports sizes in the unit a pane was declared with. */
const zero = (size: SplitterPaneSize): SplitterPaneSize => (isPx(size) ? '0px' : 0);

export function getPaneLayout({ state, isDrawer, openSize, min, max, rail }: PaneLayoutInput): PaneLayout {
  if (isDrawer || state === 'closed') {
    const size = zero(openSize);
    return {
      size,
      min: size,
      max: size,
      isFixed: true,
      content: isDrawer && state !== 'closed' ? 'drawer' : 'none',
    };
  }
  if (state === 'compact') {
    const size: SplitterPaneSize = `${rail}px`;
    return { size, min: size, max: size, isFixed: true, content: 'split' };
  }
  // Collapsed keeps its open size and limits: Mantine collapses it and expands it back.
  return { size: openSize, min, max, isFixed: false, content: 'split' };
}
