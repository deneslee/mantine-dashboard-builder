import { createContext } from 'react';

/** Back to front: the page, a region on it, a card, a well inside a card, a menu or modal. */
export type SurfaceLevel = 'canvas' | 'panel' | 'raised' | 'sunken' | 'overlay';

/** The level of the nearest `Surface`; the page itself is the canvas. */
export const SurfaceLevelContext = createContext<SurfaceLevel>('canvas');

const NEXT: Record<SurfaceLevel, SurfaceLevel> = {
  canvas: 'panel',
  panel: 'raised',
  // Inside a card, step into a well rather than stacking another shadow
  raised: 'sunken',
  sunken: 'raised',
  overlay: 'sunken',
};

/** The level a `Surface` without one takes: one step in front of the surface it sits on. */
export const nextLevel = (parent: SurfaceLevel): SurfaceLevel => NEXT[parent];
