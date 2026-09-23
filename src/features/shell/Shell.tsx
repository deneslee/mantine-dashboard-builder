import { Box, Drawer, Splitter, useMantineTheme } from '@mantine/core';
import {
  useHotkeys,
  useMediaQuery,
  type SplitterPaneSize,
  type UseSplitterReturnValue,
} from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import { useEffect, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useMainLock } from './hooks/useMainLock';
import { useContextBar, useShellActions, useSidebar } from './hooks/useShell';
import { NARROW_QUERY } from './store';
import { ContextBar } from './context-bar/ContextBar';
import { TopNavbar } from './navbar/TopNavbar';
import { Sidebar } from './sidebar/Sidebar';
import classes from './Shell.module.css';

const px = (n: number): SplitterPaneSize => `${n}px`;
const toPx = (size: SplitterPaneSize | undefined) => parseFloat(String(size ?? 0));

/**
 * App chrome on Mantine `Splitter`: three panes, sidebar | main | context bar.
 * - Docked panels are fixed-px panes, resizable by drag and keyboard (Mantine); double-click on a
 *   handle resets the panel to its default width.
 * - Closed or undocked panels are 0px panes; undocked ones render in a Drawer instead.
 * - The navbar lives inside the main pane, so a docked context bar pushes it left.
 * - Sizes are uncontrolled while dragging (no store writes per frame) and committed on release.
 * - While panes animate or are dragged, `<main>` is pinned so its content lays out once per
 *   change, not per frame (see useMainLock).
 */
export function Shell({ children }: { children: ReactNode }) {
  const { other } = useMantineTheme();
  const { shell, zIndex } = other;
  const sidebar = useSidebar();
  const contextBar = useContextBar();
  const actions = useShellActions();
  const splitter = useRef<UseSplitterReturnValue>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const sidebarPaneRef = useRef<HTMLDivElement>(null);
  const mainPaneRef = useRef<HTMLDivElement>(null);
  const contextPaneRef = useRef<HTMLDivElement>(null);
  const lock = useMainLock({
    root: rootRef,
    main: mainRef,
    mainPane: mainPaneRef,
    sidebarPane: sidebarPaneRef,
    contextPane: contextPaneRef,
  });
  /** Sizes are being pushed from the store, so there is nothing to commit back. */
  const syncing = useRef(false);
  const dragging = useRef(false);

  // Keep the store's viewport flag in sync; below `md` both panels become drawers.
  const narrow = useMediaQuery(NARROW_QUERY, sidebar.narrow, { getInitialValueInEffect: false });
  useEffect(() => actions.setNarrow(narrow), [narrow, actions]);

  useHotkeys([
    ['mod+B', actions.toggleSidebar],
    ['mod+.', actions.toggleContextBar],
    ['mod+K', spotlight.open],
  ]);

  const sidebarSize = !sidebar.isColumn
    ? px(0)
    : sidebar.isCompact
      ? px(shell.sidebar.compact)
      : px(sidebar.width);
  const contextSize = contextBar.isColumn ? px(contextBar.width) : px(0);

  // Store → splitter: burger, dock toggle, close button, persisted widths. A layout effect, so the
  // panes start moving in the same frame that shows their new content.
  useLayoutEffect(() => {
    syncing.current = true;
    splitter.current?.setSizes([sidebarSize, 100, contextSize]);
    syncing.current = false;
  }, [sidebarSize, contextSize]);

  const sidebarResizable = sidebar.isColumn && !sidebar.isCompact;

  /** Splitter → store, for widths the user set: drag end and keyboard steps. */
  const commitWidths = (sizes: SplitterPaneSize[]) => {
    if (sidebarResizable) actions.setSidebarWidth(toPx(sizes[0]));
    if (contextBar.isColumn) actions.setContextBarWidth(toPx(sizes[2]));
  };

  // Mantine's own reset splits the two neighbouring panes by their default sizes, which does not
  // fit a px panel next to a flexible main pane. Reset to the token defaults instead.
  const resetWidth = (event: MouseEvent) => {
    const handle = event.target instanceof Element ? event.target.closest('[role="separator"]') : null;
    if (!handle) return;
    if (sidebarResizable && handle.previousElementSibling === sidebarPaneRef.current) {
      actions.setSidebarWidth(shell.sidebar.expanded);
    }
    if (contextBar.isColumn && handle.nextElementSibling === contextPaneRef.current) {
      actions.setContextBarWidth(shell.contextBar.default);
    }
  };

  return (
    <Box ref={rootRef} className={classes.root}>
      <a href="#main" className={classes.skip}>
        Skip to content
      </a>

      <Splitter
        splitterRef={splitter}
        h="100%"
        lineSize={1}
        withHandle={false}
        resetOnDoubleClick={false}
        onDoubleClick={resetWidth}
        step="8px"
        shiftStep="40px"
        classNames={{ root: classes.splitter, pane: classes.pane, handle: classes.handle }}
        onSizeChange={(sizes) => {
          // A drag holds main at its start width and releases on drop.
          if (dragging.current) return;
          lock.holdFor(toPx(sizes[0]), toPx(sizes[2]));
          // Keyboard steps only reach the store here.
          if (!syncing.current) commitWidths(sizes);
        }}
        onResizeStart={() => {
          dragging.current = true;
          if (rootRef.current) rootRef.current.dataset.resizing = '';
          lock.hold();
        }}
        onResizeEnd={(_handle, sizes) => {
          dragging.current = false;
          if (rootRef.current) delete rootRef.current.dataset.resizing;
          lock.release();
          commitWidths(sizes);
        }}
      >
        <Splitter.Pane
          ref={sidebarPaneRef}
          role="navigation"
          aria-label="Primary"
          className={classes.sidebarPane}
          defaultSize={sidebarSize}
          min={sidebarResizable ? px(shell.sidebar.min) : sidebarSize}
          max={sidebarResizable ? px(shell.sidebar.max) : sidebarSize}
          mod={{ fixed: !sidebarResizable }}
        >
          {sidebar.isColumn ? <Sidebar /> : null}
        </Splitter.Pane>

        <Splitter.Pane ref={mainPaneRef} defaultSize={100} min={px(360)} className={classes.mainPane}>
          <Box component="header" className={classes.header}>
            <TopNavbar />
          </Box>
          <Box component="main" ref={mainRef} id="main" tabIndex={-1} className={classes.main}>
            {children}
          </Box>
        </Splitter.Pane>

        <Splitter.Pane
          ref={contextPaneRef}
          role="complementary"
          aria-label="Context"
          className={classes.contextPane}
          defaultSize={contextSize}
          min={contextBar.isColumn ? px(shell.contextBar.min) : contextSize}
          max={contextBar.isColumn ? px(shell.contextBar.max) : contextSize}
          mod={{ fixed: !contextBar.isColumn }}
        >
          {contextBar.isColumn ? <ContextBar /> : null}
        </Splitter.Pane>
      </Splitter>

      <Drawer
        opened={sidebar.isOverlay}
        onClose={actions.closeSidebar}
        position="left"
        size={shell.sidebar.expanded}
        withCloseButton={false}
        padding={0}
        zIndex={zIndex.drawer}
        overlayProps={{ backgroundOpacity: 0.3, blur: 0 }}
        classNames={{ content: classes.drawerContent, body: classes.drawerBody }}
        aria-label="Primary navigation"
      >
        <Sidebar />
      </Drawer>

      <Drawer
        opened={contextBar.isOverlay}
        onClose={actions.closeContextBar}
        position="right"
        size={shell.contextBar.default}
        withCloseButton={false}
        padding={0}
        zIndex={zIndex.drawer}
        overlayProps={{ backgroundOpacity: 0.15, blur: 0 }}
        classNames={{ content: classes.drawerContent, body: classes.drawerBody }}
        aria-label="Context panel"
      >
        <ContextBar />
      </Drawer>
    </Box>
  );
}
