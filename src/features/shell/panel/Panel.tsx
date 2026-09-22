import { ActionIcon, Box, Group, ScrollArea, Tooltip, type BoxProps } from '@mantine/core';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconPinned,
  IconPinnedOff,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import classes from './Panel.module.css';

/**
 * Layout parts shared by the sidebar and the context bar.
 * Whether a panel is a docked column or an overlay drawer is decided by the Shell, not here.
 */

interface PartProps extends BoxProps {
  children?: ReactNode;
}

export function PanelRoot({ children, className, ...rest }: PartProps) {
  return (
    <Box className={[classes.root, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Box>
  );
}

export function PanelHeader({ children, className, ...rest }: PartProps) {
  return (
    <Group
      className={[classes.header, className].filter(Boolean).join(' ')}
      justify="space-between"
      gap="xs"
      wrap="nowrap"
      {...rest}
    >
      {children}
    </Group>
  );
}

export function PanelBody({ children, className, ...rest }: PartProps) {
  return (
    <ScrollArea className={[classes.body, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </ScrollArea>
  );
}

export function PanelFooter({ children, className, ...rest }: PartProps) {
  return (
    <Group
      className={[classes.footer, className].filter(Boolean).join(' ')}
      justify="space-between"
      gap="xs"
      wrap="nowrap"
      {...rest}
    >
      {children}
    </Group>
  );
}

interface DockToggleProps {
  docked: boolean;
  onChange: (docked: boolean) => void;
  variant?: 'chrome' | 'subtle';
}

export function PanelDockToggle({ docked, onChange, variant = 'subtle' }: DockToggleProps) {
  const label = docked ? 'Undock panel' : 'Dock panel';
  const Icon = docked ? IconPinnedOff : IconPinned;
  return (
    <Tooltip label={label}>
      <ActionIcon
        variant={variant}
        aria-label={label}
        aria-pressed={docked}
        onClick={() => onChange(!docked)}
      >
        <Icon size={18} stroke={1.75} />
      </ActionIcon>
    </Tooltip>
  );
}

interface CollapseToggleProps {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
  variant?: 'chrome' | 'subtle';
}

export function PanelCollapseToggle({ side, label, onClick, variant = 'subtle' }: CollapseToggleProps) {
  const Icon = side === 'left' ? IconLayoutSidebarLeftCollapse : IconLayoutSidebarRightCollapse;
  return (
    <Tooltip label={label}>
      <ActionIcon variant={variant} aria-label={label} onClick={onClick}>
        <Icon size={18} stroke={1.75} />
      </ActionIcon>
    </Tooltip>
  );
}

export const Panel = {
  Root: PanelRoot,
  Header: PanelHeader,
  Body: PanelBody,
  Footer: PanelFooter,
  DockToggle: PanelDockToggle,
  CollapseToggle: PanelCollapseToggle,
};
