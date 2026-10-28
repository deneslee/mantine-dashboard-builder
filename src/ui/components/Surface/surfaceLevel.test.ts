import { nextLevel, type SurfaceLevel } from './surfaceLevel';

describe('nextLevel', () => {
  it('steps one layer in front: canvas, panel, raised', () => {
    expect(nextLevel('canvas')).toBe('panel');
    expect(nextLevel('panel')).toBe('raised');
  });

  it('alternates raised and sunken inside cards instead of stacking shadows', () => {
    expect(nextLevel('raised')).toBe('sunken');
    expect(nextLevel('sunken')).toBe('raised');
    expect(nextLevel('overlay')).toBe('sunken');
  });

  it('never returns canvas or overlay: those are always chosen on purpose', () => {
    const all: SurfaceLevel[] = ['canvas', 'panel', 'raised', 'sunken', 'overlay'];
    for (const level of all) expect(['canvas', 'overlay']).not.toContain(nextLevel(level));
  });
});
