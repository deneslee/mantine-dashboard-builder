import { useEffect, useRef, type RefObject } from 'react';

type ElementRef = RefObject<HTMLElement | null>;

export interface MainLockParts {
  /** Gets `data-moving` while main is pinned. */
  root: ElementRef;
  /** The element that gets pinned: `<main>`. */
  main: ElementRef;
  mainPane: ElementRef;
  sidebarPane: ElementRef;
  contextPane: ElementRef;
}

/** Fallback past the transition's length, for when its end is never reported (a background tab). */
const RELEASE_FALLBACK_MS = 100;

const widthOf = (el: HTMLElement) => el.getBoundingClientRect().width;

/** Width the main pane gives its content: the pane minus a classic (non-overlay) scrollbar. */
const contentWidth = (pane: HTMLElement) => widthOf(pane) - (pane.offsetWidth - pane.clientWidth);

/** Longest transition on an element in ms; 0 when transitions are off or reduced motion zeroes them. */
const transitionMs = (el: HTMLElement) =>
  Math.max(
    0,
    ...getComputedStyle(el)
      .transitionDuration.split(',')
      .map((s) => parseFloat(s) * 1000 || 0),
  );

/**
 * Pins `<main>` to a fixed width while the side panes move, then lets it follow the pane again.
 * Whatever measures itself inside main (grid width, chart containers) then resizes once per shell
 * change instead of on every animation frame. The pane still animates; the pinned content stays
 * anchored to its edge and is clipped by it (`[data-moving]` in Shell.module.css).
 */
export function useMainLock({ root, main, mainPane, sidebarPane, contextPane }: MainLockParts) {
  const timer = useRef(0);
  /** Bumped on every pin and release, so a stale transition end cannot release a newer pin. */
  const generation = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pin = (width: number) => {
    if (!root.current || !main.current) return;
    window.clearTimeout(timer.current);
    generation.current += 1;
    main.current.style.setProperty('--shell-main-width', `${Math.max(0, width)}px`);
    root.current.setAttribute('data-moving', '');
  };

  const release = () => {
    window.clearTimeout(timer.current);
    generation.current += 1;
    main.current?.style.removeProperty('--shell-main-width');
    root.current?.removeAttribute('data-moving');
  };

  /** Drag start: keep the current width until `release` (drag end). */
  const hold = () => {
    if (mainPane.current) pin(contentWidth(mainPane.current));
  };

  /**
   * The side panes are about to animate to these widths (px). Keep main at its current width while
   * they move and release it when they arrive, so the content lays out once, after the animation.
   * Laying out at the start instead would put the chart re-render (about 150–250ms for a dozen
   * charts in a production build) inside the animation and freeze it.
   */
  const holdFor = (sidebar: number, context: number) => {
    const sidebarEl = sidebarPane.current;
    const contextEl = contextPane.current;
    if (!mainPane.current || !sidebarEl || !contextEl) return;

    const moves =
      Math.abs(widthOf(sidebarEl) - sidebar) >= 0.5 || Math.abs(widthOf(contextEl) - context) >= 0.5;
    if (!moves) return;

    const ms = transitionMs(mainPane.current);
    if (ms < 1) return release();

    hold();
    const pinned = generation.current;
    const releaseIfCurrent = () => {
      if (generation.current === pinned) release();
    };
    timer.current = window.setTimeout(releaseIfCurrent, ms + RELEASE_FALLBACK_MS);

    // The Splitter applies the new sizes synchronously right after this call, so by the next
    // microtask the panes' transitions exist and report when they finish.
    queueMicrotask(() => {
      const running = [sidebarEl, contextEl].flatMap((el) => el.getAnimations?.() ?? []);
      if (running.length === 0) return;
      Promise.all(running.map((a) => a.finished)).then(releaseIfCurrent, () => {});
    });
  };

  return { hold, holdFor, release };
}
