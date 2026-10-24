import { ActionIcon, Code, CopyButton, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { Section, SectionBody } from '@/ui/components/Section';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import classes from './QueryExample.module.css';

/** A widget query for this connection, to paste into a widget's queries (Edit queries). */
export function QueryExample({ id, example }: { id: string; example: unknown }) {
  const text = JSON.stringify([{ datasource: id || 'my-connection', spec: example }], null, 2);
  return (
    <Section
      title="Use it in a widget"
      description="Paste this into a widget's queries (Edit queries), then change the spec. $__from and $__to are the dashboard's time range."
      actions={
        <CopyButton value={text}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy the query'}>
              <ActionIcon variant="subtle" aria-label="Copy the query" onClick={copy}>
                {copied ? (
                  <IconCheck size={iconSize.sm} stroke={iconStroke} />
                ) : (
                  <IconCopy size={iconSize.sm} stroke={iconStroke} />
                )}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      }
    >
      <SectionBody>
        <Code block className={classes.code}>
          {text}
        </Code>
      </SectionBody>
    </Section>
  );
}
