import { Button, Group, JsonInput, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { z } from 'zod';
import { toAppError } from '@/core/errors/AppError';
import type { Widget } from '@/core/dashboard/dashboardSchema';
import type { TimeRange } from '@/core/time/timeRange';
import type { Query } from '@/plugins/DatasourcePlugin';
import { usePlugins, type Plugins } from '@/plugins/usePlugins';
import { WidgetTile } from '../grid/WidgetTile';
import { useDashboardActions } from '../state/useDashboard';
import classes from './QueryEditor.module.css';

const queriesSchema = z.array(z.object({ datasource: z.string(), spec: z.unknown() }));

/** Parses the editor's JSON and checks each spec against its datasource. Throws with a readable message. */
function parseQueries(value: string, plugins: Plugins): Query[] {
  const queries = queriesSchema.parse(JSON.parse(value));
  for (const query of queries) {
    const datasource = plugins.datasources[query.datasource];
    if (!datasource) throw new Error(`Unknown datasource "${query.datasource}".`);
    if (datasource.querySchema) query.spec = datasource.querySchema.parse(query.spec);
  }
  return queries;
}

/** A widget's queries as JSON, with a live preview tile. Replaces the grid while it is open. */
export function QueryEditor({
  id,
  widget,
  range,
  onClose,
}: {
  id: string;
  widget: Widget;
  range: TimeRange;
  onClose: () => void;
}) {
  const plugins = usePlugins();
  const actions = useDashboardActions();
  const [value, setValue] = useState(JSON.stringify(widget.queries, null, 2));
  const [preview, setPreview] = useState(widget.queries);
  const [error, setError] = useState<string>();
  const hasChanged = value !== JSON.stringify(widget.queries, null, 2);
  const handleApply = () => {
    try {
      const queries = parseQueries(value, plugins);
      actions.editWidget(id, { queries });
      setValue(JSON.stringify(queries, null, 2));
      setError(undefined);
    } catch (err) {
      setError(toAppError(err).message);
    }
  };
  return (
    <Stack>
      <Group justify="space-between">
        <Text fw="bold">{widget.title}: queries</Text>
        <Button
          variant="default"
          onClick={() => {
            if (!hasChanged || window.confirm('Discard unapplied query changes?')) onClose();
          }}
        >
          Back to dashboard
        </Button>
      </Group>
      <div className={classes.preview}>
        <WidgetTile id={id} range={range} previewQueries={preview} />
      </div>
      <JsonInput
        label="Queries"
        description={`Each query has datasource and spec. Available datasources: ${Object.keys(plugins.datasources).join(', ')}.`}
        autosize
        minRows={10}
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          try {
            setPreview(parseQueries(next, plugins));
            setError(undefined);
          } catch (err) {
            setError(toAppError(err).message);
          }
        }}
      />
      <Group>
        <Button disabled={!!error || !hasChanged} onClick={handleApply}>
          Apply queries
        </Button>
      </Group>
    </Stack>
  );
}
