import { lazy, Suspense, useState } from 'react';
import { Group, Select, Skeleton, Tabs, Text, Title } from '@mantine/core';
import { BuildSchema } from '../BuildSchema';
import { LARGE_SCHEMA, SMALL_SCHEMA } from '../fixtures/sampleSchemas';
import { applySchemaEdit, type SchemaEdit } from '../model/schemaEdits';
import classes from './NodeStudio.module.css';

const ExploreSchema = lazy(async () => {
  const module = await import('../ExploreSchema');
  return { default: module.ExploreSchema };
});

const SAMPLES = [
  { value: 'compact', label: 'Compact schema' },
  { value: 'expanded', label: 'Expanded schema' },
];

export function NodeStudioPage() {
  const [view, setView] = useState('build');
  const [sample, setSample] = useState<'compact' | 'expanded'>('compact');
  const [sessions, setSessions] = useState({
    compact: { schema: SMALL_SCHEMA, message: '' },
    expanded: { schema: LARGE_SCHEMA, message: '' },
  });
  const { schema, message } = sessions[sample];

  function handleEdit(edit: SchemaEdit) {
    setSessions((current) => ({
      ...current,
      [sample]: applySchemaEdit(current[sample].schema, edit),
    }));
  }

  return (
    <section className={classes.studio} aria-label="Node Studio">
      <Group className={classes.heading} justify="space-between">
        <Title order={1}>Node Studio</Title>
        <Select
          aria-label="Schema sample"
          data={SAMPLES}
          value={sample}
          allowDeselect={false}
          onChange={(value) => {
            if (value === 'compact' || value === 'expanded') setSample(value);
          }}
        />
      </Group>
      {/* React Flow keeps the authored viewport and positions in its mounted store. */}
      <Tabs keepMountedMode="display-none" value={view} onChange={(value) => value && setView(value)}>
        <Tabs.List aria-label="Schema view">
          <Tabs.Tab value="build">Build</Tabs.Tab>
          <Tabs.Tab value="explore">Explore</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="build" pt="sm">
          <Text size="sm" c="dimmed" mb="sm">
            Select a field to inspect it. Drag between field handles to connect them.
          </Text>
          <BuildSchema key={sample} schema={schema} message={message} onEdit={handleEdit} />
        </Tabs.Panel>
        <Tabs.Panel value="explore" pt="sm">
          {view === 'explore' && (
            <Suspense fallback={<Skeleton className={classes.canvas} aria-label="Loading schema graph" />}>
              <ExploreSchema key={sample} schema={schema} />
            </Suspense>
          )}
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
