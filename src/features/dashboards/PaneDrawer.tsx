import { Drawer } from '@mantine/core';
import type { ReactNode } from 'react';
import classes from './PaneDrawer.module.css';

/**
 * Runs when the drawer's content mounts: Mantine 9 hardcodes `aria-modal` on Drawer.Content, even
 * without a focus trap; and focus moves in (`[data-autofocus]`, else the close button) a frame
 * later, once a menu that opened the drawer has returned focus to its button.
 */
function prepareContent(node: HTMLElement | null) {
  if (!node) return;
  node.setAttribute('aria-modal', 'false');
  requestAnimationFrame(() => {
    if (!node.contains(document.activeElement))
      (
        node.querySelector<HTMLElement>('[data-autofocus]') ?? node.querySelector<HTMLElement>('button')
      )?.focus({ preventScroll: true });
  });
}

/**
 * A non-modal drawer at the right of the main pane, below the navbar: the dashboard stays usable
 * and a docked context bar stays visible. Esc closes it.
 */
export function PaneDrawer({
  opened,
  onClose,
  title,
  size,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Width in px, from the shell tokens. */
  size: number;
  children: ReactNode;
}) {
  return (
    <div className={classes.tools}>
      <Drawer.Root
        opened={opened}
        onClose={onClose}
        position="right"
        size={size}
        withinPortal={false}
        trapFocus={false}
        lockScroll={false}
        classNames={{ inner: classes.drawerInner, content: classes.drawerContent }}
      >
        <Drawer.Content data-dashboard-tool ref={prepareContent}>
          <Drawer.Header>
            <Drawer.Title>{title}</Drawer.Title>
            <Drawer.CloseButton aria-label="Close drawer" />
          </Drawer.Header>
          <Drawer.Body>{children}</Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </div>
  );
}
