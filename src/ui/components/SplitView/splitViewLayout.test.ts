import { getPaneLayout, type PaneLayoutInput } from './splitViewLayout';

const pane = (input: Partial<PaneLayoutInput>): PaneLayoutInput => ({
  state: 'open',
  isDrawer: false,
  openSize: '320px',
  min: '240px',
  max: '480px',
  rail: 56,
  ...input,
});

describe('getPaneLayout', () => {
  it('keeps an open pane at its open size and limits', () => {
    expect(getPaneLayout(pane({}))).toEqual({
      size: '320px',
      min: '240px',
      max: '480px',
      isFixed: false,
      content: 'split',
    });
  });

  it('pins a compact pane to the rail, so it cannot be dragged', () => {
    expect(getPaneLayout(pane({ state: 'compact' }))).toEqual({
      size: '56px',
      min: '56px',
      max: '56px',
      isFixed: true,
      content: 'split',
    });
  });

  it('leaves a collapsed pane at its open size for Mantine to collapse and expand back', () => {
    expect(getPaneLayout(pane({ state: 'collapsed' }))).toMatchObject({ size: '320px', isFixed: false });
  });

  it('zeroes a closed pane in its own unit and unmounts its content', () => {
    expect(getPaneLayout(pane({ state: 'closed' }))).toMatchObject({ size: '0px', content: 'none' });
    expect(getPaneLayout(pane({ state: 'closed', openSize: 30, min: 10, max: 60 }))).toMatchObject({
      size: 0,
      min: 0,
      max: 0,
    });
  });

  it('moves an open or compact pane into the Drawer when narrow, but not a closed one', () => {
    expect(getPaneLayout(pane({ isDrawer: true }))).toMatchObject({ size: '0px', content: 'drawer' });
    expect(getPaneLayout(pane({ isDrawer: true, state: 'compact' }))).toMatchObject({ content: 'drawer' });
    expect(getPaneLayout(pane({ isDrawer: true, state: 'closed' }))).toMatchObject({ content: 'none' });
  });
});
