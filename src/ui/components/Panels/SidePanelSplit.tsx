// Spike only: the dashboard's side panel on react-resizable-panels, with a freeze around open and close.
import { useFocusReturn } from '@mantine/hooks';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { PaneContext, type PaneContextValue } from '../SplitView/useSplitView';
import classes from './SidePanelSplit.module.css';

const SIDE = 360;
/** As SplitView: about a second of frames for a lazy panel chunk to bring its focus target. */
const FOCUS_TRIES = 60;

interface Props {
  main: ReactNode;
  side: ReactNode;
  isOpen: boolean;
  label?: string;
  onClose: () => void;
}

export function SidePanelSplit({ main, side, isOpen, label, onClose }: Props) {
  const groupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sideElRef = useRef<HTMLDivElement>(null);
  const sideRef = usePanelRef();
  // The side content stays mounted while the panel closes, and unmounts once it has.
  const [isSettledOpen, setSettledOpen] = useState(isOpen);
  const isShown = isOpen || isSettledOpen;
  const lastWidth = useRef(SIDE);
  const isFirst = useRef(true);
  // Open when the page loaded (from the URL): don't take focus then.
  const hasFocused = useRef(isOpen);

  // Focus as SplitView does it: opening moves focus to the panel's [data-pane-focus] element, a frame
  // later (so a menu that opened the panel has returned focus to its button first); closing returns it.
  useFocusReturn({ opened: isOpen, shouldReturnFocus: true });
  useEffect(() => {
    if (!isOpen) {
      hasFocused.current = false;
      return;
    }
    if (hasFocused.current) return;
    hasFocused.current = true;
    let frame = 0;
    let tries = 0;
    const focusTarget = () => {
      const target = sideElRef.current?.querySelector<HTMLElement>('[data-pane-focus]');
      if (target) target.focus({ preventScroll: true });
      else if (++tries < FOCUS_TRIES) frame = requestAnimationFrame(focusTarget);
    };
    frame = requestAnimationFrame(focusTarget);
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useLayoutEffect(() => {
    const api = sideRef.current;
    const group = groupRef.current;
    const content = contentRef.current;
    const sideEl = sideElRef.current;
    if (!api || !group || !content || !sideEl) return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (isOpen === !api.isCollapsed()) return;
    // 1 freeze, before anything changes: the content keeps its whole-pixel width.
    content.style.width = `${Math.round(content.getBoundingClientRect().width)}px`;
    group.dataset.animating = '';
    // 2 change: the library moves the panels; CSS animates flex-grow.
    if (isOpen) {
      api.resize(lastWidth.current);
    } else {
      lastWidth.current = Math.round(api.getSize().inPixels) || SIDE;
      api.collapse();
    }
    // 3 release once, when the side panel's transition ends (or at once without motion).
    let isReleased = false;
    const release = () => {
      isReleased = true;
      delete group.dataset.animating;
      content.style.width = '';
      setSettledOpen(isOpen);
    };
    const ms = Math.max(
      ...getComputedStyle(sideEl)
        .transitionDuration.split(',')
        .map((s) => parseFloat(s) * 1000 || 0),
    );
    if (ms < 1) {
      release();
      return;
    }
    const timer = window.setTimeout(finish, ms + 100);
    function finish() {
      window.clearTimeout(timer);
      sideEl?.removeEventListener('transitionend', onEnd);
      release();
    }
    function onEnd(event: TransitionEvent) {
      if (event.target === sideEl && event.propertyName === 'flex-grow') finish();
    }
    sideEl.addEventListener('transitionend', onEnd);
    return () => {
      window.clearTimeout(timer);
      sideEl.removeEventListener('transitionend', onEnd);
      // Toggled again mid-slide: keep the content and the freeze for the next slide, which releases them.
      if (!isReleased) setSettledOpen(true);
    };
  }, [isOpen, sideRef]);

  const pane: PaneContextValue = {
    id: 'side',
    label,
    state: isOpen ? 'open' : 'closed',
    isCompact: false,
    isDrawer: false,
    canCompact: false,
    canClose: true,
    side: 'end',
    open: () => {},
    compact: () => {},
    collapse: () => {},
    close: onClose,
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Group
      elementRef={groupRef}
      orientation="horizontal"
      resizePreviewMode="separator"
      className={classes.group}
    >
      <Panel id="main" minSize="360px" className={classes.panel}>
        <div ref={contentRef} className={classes.mainContent}>
          {main}
        </div>
      </Panel>
      <Separator className={classes.separator} />
      <Panel
        id="side"
        panelRef={sideRef}
        elementRef={sideElRef}
        collapsible
        collapsedSize="0px"
        defaultSize={isOpen ? `${SIDE}px` : '0px'}
        minSize="280px"
        maxSize="640px"
        groupResizeBehavior="preserve-pixel-size"
        className={classes.panel}
      >
        {isShown ? (
          <PaneContext value={pane}>
            <div role="region" aria-label={label} className={classes.sideContent} onKeyDown={handleKeyDown}>
              {side}
            </div>
          </PaneContext>
        ) : null}
      </Panel>
    </Group>
  );
}
