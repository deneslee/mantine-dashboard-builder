import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMainLock } from './useMainLock';

/** An element with a fixed layout width (jsdom has no layout). */
function box(width: number, transition = '0.18s') {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ width }) as DOMRect;
  el.style.transitionDuration = transition;
  return el;
}

function setup({ main = 700, sidebar = 260, context = 0, transition = '0.18s' } = {}) {
  const parts = {
    root: { current: document.createElement('div') },
    main: { current: document.createElement('main') },
    mainPane: { current: box(main, transition) },
    sidebarPane: { current: box(sidebar) },
    contextPane: { current: box(context) },
  };
  const { result } = renderHook(() => useMainLock(parts));
  const pinned = () => parts.main.current.style.getPropertyValue('--shell-main-width') || null;
  const moving = () => parts.root.current.hasAttribute('data-moving');
  return { lock: result.current, pinned, moving };
}

describe('useMainLock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pins main to the width it will have once the panes arrive, then releases', () => {
    const { lock, pinned, moving } = setup({ main: 700, sidebar: 260 });
    lock.holdFor(56, 0); // sidebar collapses to the rail: main gains 204px
    expect(pinned()).toBe('904px');
    expect(moving()).toBe(true);

    vi.advanceTimersByTime(180 + 100);
    expect(pinned()).toBeNull();
    expect(moving()).toBe(false);
  });

  it('accounts for both panes', () => {
    const { lock, pinned } = setup({ main: 700, sidebar: 260, context: 0 });
    lock.holdFor(260, 360); // context bar opens
    expect(pinned()).toBe('340px');
  });

  it('does nothing when main keeps its width', () => {
    const { lock, pinned, moving } = setup();
    lock.holdFor(260, 0);
    expect(pinned()).toBeNull();
    expect(moving()).toBe(false);
  });

  it('does not pin when transitions are off (reduced motion)', () => {
    const { lock, pinned } = setup({ transition: '0s' });
    lock.holdFor(56, 0);
    expect(pinned()).toBeNull();
  });

  it('holds the current width for a drag until released', () => {
    const { lock, pinned, moving } = setup({ main: 700 });
    lock.hold();
    expect(pinned()).toBe('700px');
    vi.advanceTimersByTime(10_000);
    expect(pinned()).toBe('700px');

    lock.release();
    expect(pinned()).toBeNull();
    expect(moving()).toBe(false);
  });
});
