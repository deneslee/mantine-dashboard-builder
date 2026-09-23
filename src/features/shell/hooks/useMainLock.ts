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

/** Extra time before releasing, for the frame in which the panes' transition actually starts. */
const RELEASE_SLACK_MS = 100;

const widthOf = (el: HTMLElement) => el.getBoundingClientRect().width;

/** Width the main pane gives its content: the pane minus a classic (non-overlay) scrollbar. */
const contentWidth = (pane: HTMLElement) => widthOf(pane) - (pane.offsetWidth - pane.clientWidth);

/** Longest transition on an element in ms; 0 when transitions are off or reduced motion zeroes them. */
const transitionMs = (el: HTMLElement) =>
  Math.max(0, ...getComputedStyle(el).transitionDuration.split(',').map((s) => parseFloat(s) * 1000 || 0));

/**
 * Pins `<main>` to a fixed width while the side panes move, then lets it follow the pane again.
 * Whatever measures itself inside main (grid width, chart containers) then resizes once per shell
 * change instead of on every animation frame. The pane still animates; the pinned content slides
 * with its edge and is clipped by it (`[data-moving]` in Shell.module.css).
 */
export function useMainLock({ root, main, mainPane, sidebarPane, contextPane }: MainLockParts) {
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pin = (width: number) => {
    if (!root.current || !main.current) return;
    window.clearTimeout(timer.current);
    main.current.style.setProperty('--shell-main-width', `${Math.max(0, width)}px`);
    root.current.setAttribute('data-moving', '');
  };

  const release = () => {
    window.clearTimeout(timer.current);
    main.current?.style.removeProperty('--shell-main-width');
    root.current?.removeAttribute('data-moving');
  };

  /** Drag start: keep the current width until `release` (drag end). */
  const hold = () => {
    if (mainPane.current) pin(contentWidth(mainPane.current));
  };

  /**
   * The side panes are about to animate to these widths (px). Pin main to the width it will end
   * up with, so it lays out once now, and release when the transition is over.
   */
  const holdFor = (sidebar: number, context: number) => {
    if (!mainPane.current || !sidebarPane.current || !contextPane.current) return;

    const current = contentWidth(mainPane.current);
    const next = current + widthOf(sidebarPane.current) - sidebar + widthOf(contextPane.current) - context;
    if (Math.abs(next - current) < 0.5) return;

    const ms = transitionMs(mainPane.current);
    if (ms < 1) return release();

    pin(next);
    timer.current = window.setTimeout(release, ms + RELEASE_SLACK_MS);
  };

  return { hold, holdFor, release };
}
