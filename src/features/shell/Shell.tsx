import { Box, Drawer, Splitter, useMantineTheme } from '@mantine/core';
import {
  useHotkeys,
  useMediaQuery,
  type SplitterPaneSize,
  type UseSplitterReturnValue,
} from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import { useEffect, useRef, type ReactNode } from 'react';
import { useContextBar, useShellActions, useSidebar } from './hooks/useShell';
import { NARROW_QUERY } from './store';
import { ContextBar } from './context-bar/ContextBar';
import { TopNavbar } from './navbar/TopNavbar';
import { Sidebar } from './sidebar/Sidebar';
import classes from './Shell.module.css';

const px = (n: number): SplitterPaneSize => `${n}px`;

/**
 * App chrome on Mantine `Splitter`: three panes, sidebar | main | context bar.
 * - Docked panels are fixed-px panes (resizable, keyboard, double-click reset come from Mantine).
 * - Closed or undocked panels are 0px panes; undocked ones render in a Drawer instead.
 * - The navbar lives inside the main pane, so a docked context bar pushes it left.
 * Sizes are uncontrolled while dragging (no store writes per frame) and committed on release.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { other } = useMantineTheme();
  const { shell, zIndex } = other;
  const sidebar = useSidebar();
  const contextBar = useContextBar();
  const actions = useShellActions();
  const splitter = useRef<UseSplitterReturnValue>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  // Store → splitter: burger, dock toggle, close button, persisted widths.
  useEffect(() => {
    splitter.current?.setSizes([sidebarSize, 100, contextSize]);
  }, [sidebarSize, contextSize]);

  const sidebarResizable = sidebar.isColumn && !sidebar.isCompact;

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
        resetOnDoubleClick
        step="8px"
        shiftStep="40px"
        classNames={{ root: classes.splitter, pane: classes.pane, handle: classes.handle }}
        onResizeStart={() => {
          if (rootRef.current) rootRef.current.dataset.resizing = '';
        }}
        onResizeEnd={(handle, sizes) => {
          if (rootRef.current) delete rootRef.current.dataset.resizing;
          if (handle === 0) actions.setSidebarWidth(parseFloat(String(sizes[0])));
          if (handle === 1) actions.setContextBarWidth(parseFloat(String(sizes[2])));
        }}
      >
        <Splitter.Pane
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

        <Splitter.Pane defaultSize={100} min={px(360)} className={classes.mainPane}>
          <Box component="header" className={classes.header}>
            <TopNavbar />
          </Box>
          <Box component="main" id="main" tabIndex={-1} className={classes.main}>
            {children}
          </Box>
        </Splitter.Pane>

        <Splitter.Pane
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
