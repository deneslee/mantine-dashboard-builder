import { ActionIcon, Box, Group, ScrollArea, Tooltip, type BoxProps } from '@mantine/core';
import { IconPinned, IconPinnedOff } from '@tabler/icons-react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { iconSize, iconStroke } from '@/design-system/tokens/semantic';
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
    <Box className={clsx(classes.root, className)} {...rest}>
      {children}
    </Box>
  );
}

export function PanelHeader({ children, className, ...rest }: PartProps) {
  return (
    <Group
      className={clsx(classes.header, className)}
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
    <ScrollArea className={clsx(classes.body, className)} {...rest}>
      {children}
    </ScrollArea>
  );
}

export function PanelFooter({ children, className, ...rest }: PartProps) {
  return (
    <Group
      className={clsx(classes.footer, className)}
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
        <Icon size={iconSize.md} stroke={iconStroke} />
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
};
