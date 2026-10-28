import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import {
  IconArrowLeft,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { fontWeight, iconSize, iconStroke } from '../../tokens/semantic';
import { useSplitViewPane } from './useSplitView';
import classes from './SplitView.module.css';

interface HeaderProps {
  title: string;
  /** Shown before the title, and alone when the pane is compact. */
  icon?: Icon;
  /** Shows a Back button, e.g. from the widget editor back to the palette. */
  onBack?: () => void;
  /** Extra actions, before Compact and Close. */
  children?: ReactNode;
}

const glyph = (Glyph: Icon) => <Glyph size={iconSize.md} stroke={iconStroke} />;

/** Back · icon · title · actions · Compact · Close; just the icon, as an Expand button, when compact. */
export function SplitViewHeader({ title, icon: TitleIcon, onBack, children }: HeaderProps) {
  const pane = useSplitViewPane();
  const CompactIcon = pane.side === 'end' ? IconLayoutSidebarRightCollapse : IconLayoutSidebarLeftCollapse;

  if (pane.isCompact) {
    return (
      <div className={classes.headerCompact}>
        <Tooltip label={`Expand ${title}`} position={pane.side === 'end' ? 'left' : 'right'}>
          <ActionIcon aria-label={`Expand ${title}`} onClick={pane.open} data-pane-focus>
            {glyph(TitleIcon ?? CompactIcon)}
          </ActionIcon>
        </Tooltip>
      </div>
    );
  }

  return (
    <Group gap="xs" wrap="nowrap" className={classes.header}>
      {onBack && (
        <Tooltip label="Back">
          <ActionIcon aria-label="Back" onClick={onBack}>
            {glyph(IconArrowLeft)}
          </ActionIcon>
        </Tooltip>
      )}
      {TitleIcon && <span className={classes.titleIcon}>{glyph(TitleIcon)}</span>}
      <Text
        component="h2"
        size="sm"
        fw={fontWeight.medium}
        truncate
        tabIndex={-1}
        data-pane-focus
        className={classes.title}
      >
        {title}
      </Text>
      {children}
      {pane.canCompact && (
        <Tooltip label="Compact">
          <ActionIcon aria-label={`Compact ${title}`} onClick={pane.compact}>
            {glyph(CompactIcon)}
          </ActionIcon>
        </Tooltip>
      )}
      {pane.canClose && (
        <Tooltip label="Close">
          <ActionIcon aria-label={`Close ${title}`} onClick={pane.close}>
            {glyph(IconX)}
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
