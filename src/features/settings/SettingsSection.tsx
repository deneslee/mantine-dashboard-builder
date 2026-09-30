import { Paper, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import classes from './SettingsSection.module.css';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A bordered group of related settings with a title. Rows inside are separated by rules. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Paper variant="panel" component="section" className={classes.section}>
      <div className={classes.header}>
        <Title order={2} size="h4">
          {title}
        </Title>
        {description ? <Text className={classes.help}>{description}</Text> : null}
      </div>
      {children}
    </Paper>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  /** Id of the control the label names, for plain inputs. Groups name themselves via `aria-labelledby`. */
  labelId?: string;
  children: ReactNode;
}

/** One setting: label and help text on the left, its control on the right. */
export function SettingsRow({ label, description, labelId, children }: SettingsRowProps) {
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
