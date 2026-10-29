import { Box, Drawer, Splitter } from '@mantine/core';
import {
  useElementSize,
  useFocusReturn,
  usePrevious,
  type SplitterPaneSize,
  type UseSplitterReturnValue,
} from '@mantine/hooks';
import {
  Children,
  isValidElement,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { dimensions } from '../../tokens/dimensions';
import { Surface } from '../Surface/Surface';
import type { SurfaceLevel } from '../Surface/surfaceLevel';
import { getPaneLayout, type PaneLayout, type PaneState } from './splitViewLayout';
import {
  PaneContext,
  SplitViewContext,
  useSplitViewPane,
  type PaneContextValue,
  type SplitViewContextValue,
} from './useSplitView';
import classes from './SplitView.module.css';

/**
 * Resizable panes on Mantine `Splitter`, for anything side by side: the editor's side pane next to
 * the grid, chart | table inside a widget, a three-column page.
 * - Each pane is open, compact (a fixed rail, same content as icons), collapsed (Mantine's collapse
 *   to 0, the handle stays) or closed (unmounted). Uncontrolled, or controlled per pane with
 *   `state` + `onStateChange`.
 * - A pane with `fallback="drawer"` moves into a Drawer when the SplitView itself is narrower than
 *   `drawerBelow`: its own width, not the viewport's.
 * - Sizes commit on release, never per drag frame; `onLayoutChange` lets the caller persist them.
 * - Compact and close need px sizes on that pane, so its rail and its zero share its unit.
 */

interface PaneProps {
  id: string;
  /** Names the pane's region (and its Drawer) for screen readers. */
  label?: string;
  defaultSize: SplitterPaneSize;
  min?: SplitterPaneSize;
  max?: SplitterPaneSize;
  /** Mantine's: dragging past `min`, or Enter on the handle, collapses it to 0. */
  collapsible?: boolean;
  canCompact?: boolean;
  canClose?: boolean;
  fallback?: 'drawer';
  /** Paints the pane as that Surface level (canvas for the main area, panel for side panes); none by default. */
  level?: SurfaceLevel;
  defaultState?: PaneState;
  state?: PaneState;
  onStateChange?: (state: PaneState) => void;
  children?: ReactNode;
}

/** Read by `SplitView.Root`, which renders the Mantine pane; it renders nothing on its own. */
export function SplitViewPane(_props: PaneProps): ReactNode {
  return null;
}

interface RootProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  /** `line`: a 1px border, as between page regions. `grip`: Mantine's thumb, for splits inside a widget. */
  variant?: 'line' | 'grip';
  drawerBelow?: number;
  /** Sizes by pane id after a drag or keyboard step, in each pane's own unit. */
  onLayoutChange?: (sizes: Record<string, SplitterPaneSize>) => void;
}

interface Item {
  props: PaneProps;
  state: PaneState;
  layout: PaneLayout;
  pane: PaneContextValue;
}

export function SplitViewRoot({
  children,
  orientation = 'horizontal',
  variant = 'line',
  drawerBelow = dimensions.pane.drawerBelow,
  onLayoutChange,
}: RootProps) {
  const splitter = useRef<UseSplitterReturnValue>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const { ref: sizeRef, width, height } = useElementSize();
  const [internal, setInternal] = useState<Record<string, PaneState>>({});
  /** Each pane's size when last open, so compact, close and the Drawer switch can restore it. */
  const [openSizes, setOpenSizes] = useState<Record<string, SplitterPaneSize>>({});
  /** Sizes are being pushed to Splitter, so there is nothing to commit back. */
  const syncing = useRef(false);
  const dragging = useRef(false);

  const extent = orientation === 'horizontal' ? width : height;
  // Unmeasured (0) counts as wide, so panes don't flash into a Drawer on the first frame.
  const isNarrow = extent > 0 && extent < drawerBelow;

  const paneProps = Children.toArray(children)
    .filter(
      (child): child is ReactElement<PaneProps> => isValidElement(child) && child.type === SplitViewPane,
    )
    .map((child) => child.props);
  const stateOf = (props: PaneProps): PaneState =>
    props.state ?? internal[props.id] ?? props.defaultState ?? 'open';

  const setState = (id: string, next: PaneState) => {
    const props = paneProps.find((p) => p.id === id);
    if (!props || stateOf(props) === next) return;
    if (props.state === undefined) setInternal((all) => ({ ...all, [id]: next }));
    props.onStateChange?.(next);
  };

  const items: Item[] = paneProps.map((props, i) => {
    const state = stateOf(props);
    const layout = getPaneLayout({
      state,
      isDrawer: props.fallback === 'drawer' && isNarrow,
      openSize: openSizes[props.id] ?? props.defaultSize,
      min: props.min,
      max: props.max,
      rail: dimensions.pane.rail,
    });
    const isDrawer = layout.content === 'drawer';
    const pane: PaneContextValue = {
      id: props.id,
      label: props.label,
      state,
      // A Drawer always shows the full content.
      isCompact: state === 'compact' && !isDrawer,
      isDrawer,
      canCompact: Boolean(props.canCompact) && !isDrawer,
      canClose: Boolean(props.canClose),
      side: i === 0 ? 'start' : 'end',
      open: () => setState(props.id, 'open'),
      compact: () => setState(props.id, 'compact'),
      collapse: () => setState(props.id, 'collapsed'),
      close: () => setState(props.id, 'closed'),
    };
    return { props, state, layout, pane };
  });

  // State → Splitter: open, compact, close and the Drawer switch set sizes; collapse goes through
  // Mantine's own collapse so the handle can drag it back. A layout effect, so the panes move in the
  // frame that shows their new content.
  // Runs only when `layoutKey` changes, reading the latest items: drags must not be undone.
  const syncSplitter = useEffectEvent(() => {
    const api = splitter.current;
    if (!api) return;
    syncing.current = true;
    api.setSizes(items.map((it) => it.layout.size));
    items.forEach((it, i) => {
      if (it.state === 'collapsed' && !api.collapsed[i]) api.collapse(i);
      if (it.state !== 'collapsed' && api.collapsed[i]) api.expand(i);
    });
    syncing.current = false;
  });
  const layoutKey = items.map((it) => `${it.state}:${it.layout.size}:${it.layout.content}`).join('|');
  useLayoutEffect(() => syncSplitter(), [layoutKey]);

  /** Splitter → open sizes and the caller, for sizes the user set. */
  const commit = (sizes: SplitterPaneSize[]) => {
    const byId: Record<string, SplitterPaneSize> = {};
    const open: Record<string, SplitterPaneSize> = {};
    items.forEach((it, i) => {
      const size = sizes[i] ?? it.layout.size;
      byId[it.props.id] = size;
      if (it.state === 'open' && it.layout.content === 'split') open[it.props.id] = size;
    });
    setOpenSizes((all) => ({ ...all, ...open }));
    onLayoutChange?.(byId);
  };

  const context: SplitViewContextValue = {
    getState: (id) => items.find((it) => it.props.id === id)?.state,
    setState,
  };

  return (
    <SplitViewContext value={context}>
      <Box ref={sizeRef} className={classes.root}>
        <Box ref={frameRef} className={classes.frame}>
          <Splitter
            splitterRef={splitter}
            orientation={orientation}
            withHandle={variant === 'grip'}
            lineSize={1}
            step="8px"
            shiftStep="40px"
            classNames={{ root: classes.splitter, pane: classes.pane, handle: classes.handle }}
            onSizeChange={(sizes) => {
              // Keyboard steps only reach this; drags commit on release.
              if (!syncing.current && !dragging.current) commit(sizes);
            }}
            onResizeStart={() => {
              dragging.current = true;
              if (frameRef.current) frameRef.current.dataset.resizing = '';
            }}
            onResizeEnd={(_handle, sizes) => {
              dragging.current = false;
              if (frameRef.current) delete frameRef.current.dataset.resizing;
              commit(sizes);
            }}
            onCollapseChange={(index, isCollapsed) => {
              const it = items[index];
              if (!it || syncing.current) return;
              if (isCollapsed) setState(it.props.id, 'collapsed');
              else if (it.state === 'collapsed') setState(it.props.id, 'open');
            }}
          >
            {items.map(({ props, layout, pane }) => (
              <Splitter.Pane
                key={props.id}
                defaultSize={layout.size}
                min={layout.min}
                max={layout.max}
                collapsible={props.collapsible}
                role={props.label ? 'region' : undefined}
                aria-label={props.label}
                mod={{ fixed: layout.isFixed, closed: layout.content !== 'split', compact: pane.isCompact }}
                onKeyDown={pane.canClose ? closeOnEscape(pane.close) : undefined}
              >
                <PaneContext value={pane}>
                  <PaneBody isShown={layout.content === 'split'} level={props.level}>
                    {props.children}
                  </PaneBody>
                </PaneContext>
              </Splitter.Pane>
            ))}
          </Splitter>
        </Box>

        {items.map(({ props, layout, pane }, i) =>
          layout.content === 'drawer' ? (
            <PaneContext key={props.id} value={pane}>
              <Drawer.Root
                opened
                onClose={pane.close}
                position={drawerPosition(orientation, i === 0)}
                size={dimensions.shell.contextBar.default}
                padding={0}
                zIndex={dimensions.zIndex.drawer}
                classNames={{ content: classes.drawerContent, body: classes.drawerBody }}
              >
                <Drawer.Overlay />
                <Drawer.Content aria-label={props.label}>
                  <Drawer.Body>{props.children}</Drawer.Body>
                </Drawer.Content>
              </Drawer.Root>
            </PaneContext>
          ) : null,
        )}
      </Box>
    </SplitViewContext>
  );
}

const drawerPosition = (orientation: 'horizontal' | 'vertical', isFirst: boolean) =>
  orientation === 'horizontal' ? (isFirst ? 'left' : 'right') : isFirst ? 'top' : 'bottom';

/** Escape closes the pane, unless something inside (a Select, a Menu) already handled it. */
const closeOnEscape = (close: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !event.defaultPrevented) {
    event.preventDefault();
    close();
  }
};

/** About a second of frames: long enough for a lazy pane chunk, short enough not to steal focus later. */
const FOCUS_TRIES = 60;

/**
 * Stays mounted while the pane is closed, so focus can go back to whatever opened it. Opening moves
 * focus to the pane's `[data-pane-focus]` element; compact and expand do too when focus was inside
 * the pane or lost, since the button that was pressed is gone. The move waits a frame, so a menu
 * that opened the pane has returned focus to its button first, and keeps looking for a few frames
 * while lazy content loads.
 */
function PaneBody({
  isShown,
  level,
  children,
}: {
  isShown: boolean;
  level?: SurfaceLevel;
  children: ReactNode;
}) {
  const { state } = useSplitViewPane();
  const ref = useRef<HTMLDivElement>(null);
  const previous = usePrevious(state);
  useFocusReturn({ opened: state !== 'closed', shouldReturnFocus: true });

  useEffect(() => {
    if (previous === undefined || previous === state || state === 'closed') return;
    const active = document.activeElement;
    const isLost = !active || active === document.body;
    // Opening always takes focus; compact and expand only keep it if it was in the pane already.
    if (!(previous === 'closed' || isLost || ref.current?.parentElement?.contains(active))) return;
    let frame = 0;
    let tries = 0;
    const focusTarget = () => {
      const target = ref.current?.querySelector<HTMLElement>('[data-pane-focus]');
      if (target) target.focus({ preventScroll: true });
      else if (++tries < FOCUS_TRIES) frame = requestAnimationFrame(focusTarget);
    };
    frame = requestAnimationFrame(focusTarget);
    return () => cancelAnimationFrame(frame);
  }, [previous, state]);

  const content = isShown ? children : null;
  // Panes meet at the split handle, so a pane Surface has no border or radius of its own.
  return level ? (
    <Surface ref={ref} level={level} withBorder={false} radius={0} className={classes.body}>
      {content}
    </Surface>
  ) : (
    <div ref={ref} className={classes.body}>
      {content}
    </div>
  );
}
