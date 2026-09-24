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

/** A pane transition whose end the test controls. */
function transitionOn(el: HTMLElement) {
  let finish = () => {};
  const finished = new Promise<Animation>((resolve) => {
    finish = () => resolve({} as Animation);
  });
  el.getAnimations = () => [{ finished } as Animation];
  return { finish: () => finish() };
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
  return { lock: result.current, parts, pinned, moving };
}

describe('useMainLock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps main at its current width while the panes move', () => {
    const { lock, pinned, moving } = setup({ main: 700, sidebar: 260 });
    lock.holdFor(56, 0); // sidebar collapses to the rail
    expect(pinned()).toBe('700px');
    expect(moving()).toBe(true);
  });

  it('releases when the pane transition finishes', async () => {
    const { lock, parts, pinned, moving } = setup();
    const transition = transitionOn(parts.sidebarPane.current);
    lock.holdFor(56, 0);
    await vi.advanceTimersByTimeAsync(0); // the microtask that finds the transition
    expect(pinned()).toBe('700px');

    transition.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(pinned()).toBeNull();
    expect(moving()).toBe(false);
  });

  it('falls back to a timer when no transition end is reported', () => {
    const { lock, pinned } = setup();
    lock.holdFor(56, 0);
    vi.advanceTimersByTime(180 + 100);
    expect(pinned()).toBeNull();
  });

  it('ignores the end of an earlier transition once a newer pin exists', async () => {
    const { lock, parts, pinned } = setup();
    const first = transitionOn(parts.sidebarPane.current);
    lock.holdFor(56, 0);
    await vi.advanceTimersByTimeAsync(0);

    lock.hold(); // a drag starts before the first transition ends
    first.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(pinned()).toBe('700px');
  });

  it('does nothing when the panes keep their widths', () => {
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

  describe('browser window resize', () => {
    const initialWidth = window.innerWidth;
    const resizeWindow = (width: number) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      window.dispatchEvent(new Event('resize'));
    };
    afterEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: initialWidth }));

    it('pins while the width changes and releases 150ms after the last change', () => {
      const { pinned, moving } = setup({ main: 700 });
      resizeWindow(initialWidth - 10);
      expect(pinned()).toBe('700px');
      expect(moving()).toBe(true);

      vi.advanceTimersByTime(100);
      resizeWindow(initialWidth - 20); // still dragging: the release waits again
      vi.advanceTimersByTime(100);
      expect(pinned()).toBe('700px');

      vi.advanceTimersByTime(50);
      expect(pinned()).toBeNull();
      expect(moving()).toBe(false);
    });

    it('ignores a height-only resize (mobile address bar)', () => {
      const { pinned } = setup();
      resizeWindow(initialWidth);
      expect(pinned()).toBeNull();
    });

    it('leaves a panel pin taken during the resize to its own release', () => {
      const { lock, pinned } = setup({ main: 700 });
      resizeWindow(initialWidth - 10);
      lock.holdFor(56, 0); // sidebar toggled mid-drag: the newer pin

      vi.advanceTimersByTime(150); // the resize settles, but its pin is no longer the newest
      expect(pinned()).toBe('700px');

      vi.advanceTimersByTime(180 + 100 - 150); // the panel pin's own fallback release
      expect(pinned()).toBeNull();
    });

    it('takes the pin back when the width changes after a panel pin', () => {
      const { lock, pinned } = setup({ main: 700 });
      lock.holdFor(56, 0);
      resizeWindow(initialWidth - 10);

      vi.advanceTimersByTime(149);
      expect(pinned()).toBe('700px');
      vi.advanceTimersByTime(1); // 150ms after the last width change, before the panel's 280ms fallback
      expect(pinned()).toBeNull();
    });
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
