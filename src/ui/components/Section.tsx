import { Text, Title } from '@mantine/core';
import { Surface } from './Surface/Surface';
import type { ReactNode } from 'react';
import classes from './Section.module.css';

interface SectionProps {
  title: string;
  description?: string;
  /** Controls for the whole section, at the end of its header. */
  actions?: ReactNode;
  children: ReactNode;
}

/** A bordered group of related content with a title. Rows inside are separated by rules. */
export function Section({ title, description, actions, children }: SectionProps) {
  return (
    <Surface level="panel" component="section" className={classes.section}>
      <div className={classes.header}>
        <div>
          <Title order={2} size="h4">
            {title}
          </Title>
          {description ? <Text className={classes.help}>{description}</Text> : null}
        </div>
        {actions ? <div className={classes.actions}>{actions}</div> : null}
      </div>
      {children}
    </Surface>
  );
}

interface SectionRowProps {
  label: string;
  description?: string;
  /** Id of the control the label names, for plain inputs. Groups name themselves via `aria-labelledby`. */
  labelId?: string;
  children: ReactNode;
}

/** One row: label and help text on the left, its control on the right; stacked when the page is narrow. */
export function SectionRow({ label, description, labelId, children }: SectionRowProps) {
  return (
    <div className={classes.row}>
      <div>
        <span id={labelId} className={classes.label}>
          {label}
        </span>
        {description ? <Text className={classes.help}>{description}</Text> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Content that fills the section's width, below the header or between rows. */
export function SectionBody({ children }: { children: ReactNode }) {
  return <div className={classes.body}>{children}</div>;
}
