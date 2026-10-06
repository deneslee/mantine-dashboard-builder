import { Button, Code, DataList, Group, Select, Stack, Table, Tabs, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { frameToCsv, getFieldLabel, type DataFrame, type Field } from '@/core/data/DataFrame';
import type { Widget } from '@/core/dashboard/dashboardSchema';
import { toAppError } from '@/core/errors/AppError';
import { formatTime, resolveEffectiveTime, type TimeRange } from '@/core/time/timeRange';
import type { Query } from '@/plugins/DatasourcePlugin';
import { usePlugins } from '@/plugins/usePlugins';
import { dimensions } from '@/ui/tokens/dimensions';
import { downloadFile } from '@/utils/downloadFile';
import type { InspectTab } from '../dashboardSearch';
import { datasourceQuery } from '../data/dashboardQueries';
import { focusWidgetMenu } from '../grid/focusWidgetMenu';
import { formatRange, formatShift } from '../header/formatRange';
import { PaneDrawer } from '../PaneDrawer';
import { useDashboard, useReadNow, useWidget } from '../state/useDashboard';
import { useEffectiveTime } from '../state/useEffectiveTime';

const TABS: { value: InspectTab; label: string }[] = [
  { value: 'data', label: 'Data' },
  { value: 'query', label: 'Query' },
  { value: 'json', label: 'JSON' },
  { value: 'stats', label: 'Stats' },
];
/** Rows the Data tab shows, and the frames the JSON tab prints; the downloads have everything. */
const MAX_ROWS = 100;
const MAX_JSON_ROWS = 1000;

const countRows = (frames: DataFrame[]) => frames.reduce((sum, frame) => sum + frame.length, 0);

function formatValue(field: Field, value: unknown, timeZone: string): string {
  if (value === null || value === undefined) return '';
  if (field.type === 'time' && typeof value === 'number') return formatTime(value, timeZone, 'seconds');
  return typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean);
}

/**
 * One widget's queries, one at a time (`?inspect=<id>&inspectTab=…`): the data, what was asked, the
 * JSON and the request's stats. Beside the dashboard, non-modal; focus returns to the widget's menu.
 */
export function InspectDrawer({
  id,
  tab,
  range,
  timeZone,
}: {
  id: string;
  tab: InspectTab;
  range: TimeRange;
  timeZone: string;
}) {
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const widget = useWidget(id);
  const { datasources } = usePlugins();
  const [index, setIndex] = useState(0);
  const query = widget?.queries[index] ?? widget?.queries[0];
  const handleClose = () => {
    void navigate({
      search: (prev) => ({ ...prev, inspect: undefined, inspectTab: undefined }),
      resetScroll: false,
    });
    focusWidgetMenu(id);
  };
  return (
    <PaneDrawer
      opened
      onClose={handleClose}
      title={`Inspect ${widget?.title ?? ''}`}
      size={dimensions.shell.contextBar.max}
    >
      {widget && query ? (
        <Stack>
          {widget.queries.length > 1 ? (
            <Select
              label="Query"
              value={String(index)}
              onChange={(value) => setIndex(Number(value))}
              allowDeselect={false}
              data={widget.queries.map((each, i) => ({
                value: String(i),
                label: `${i + 1}. ${datasources[each.datasource]?.name ?? each.datasource}`,
              }))}
            />
          ) : null}
          <Tabs
            value={tab}
            keepMounted={false}
            onChange={(value) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  inspectTab: value === 'data' ? undefined : (value as InspectTab),
                }),
                replace: true,
                resetScroll: false,
              })
            }
          >
            <Tabs.List>
              {TABS.map((each) => (
                <Tabs.Tab
                  key={each.value}
                  value={each.value}
                  data-autofocus={each.value === tab || undefined}
                >
                  {each.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <QueryPanels
              key={index}
              id={id}
              widget={widget}
              query={query}
              fileName={`${id}-query-${index + 1}`}
              range={range}
              timeZone={timeZone}
            />
          </Tabs>
        </Stack>
      ) : null}
    </PaneDrawer>
  );
}

/** The four tabs for one query. It reads the query's cache entry, the one the tile shows. */
function QueryPanels({
  id,
  widget,
  query,
  fileName,
  range,
  timeZone,
}: {
  id: string;
  widget: Widget;
  query: Query;
  fileName: string;
  range: TimeRange;
  timeZone: string;
}) {
  const { datasources } = usePlugins();
  const getNow = useReadNow();
  const now = useDashboard((s) => s.now);
  const time = useEffectiveTime(id, range, timeZone, { isEditing: false });
  const datasource = datasources[query.datasource];
  const options = datasourceQuery(query, time, { datasources, getNow, source: widget.title });
  // What the widget shows: opening Inspect doesn't refetch.
  const result = useQuery({ ...options, refetchOnMount: false });
  const frames = result.data?.frames ?? [];
  const resolved = resolveEffectiveTime(time, now);
  const response = result.error
    ? toAppError(result.error).message
    : result.isPending
      ? 'Loading…'
      : `${frames.length} ${frames.length === 1 ? 'frame' : 'frames'}, ${countRows(frames)} rows`;
  return (
    <>
      <Tabs.Panel value="data" pt="md">
        <DataPanel frames={frames} fileName={fileName} timeZone={timeZone} empty={response} />
      </Tabs.Panel>
      <Tabs.Panel value="query" pt="md">
        <Stack>
          <DataList orientation="horizontal">
            <Fact label="Datasource">{`${datasource?.name ?? 'Unknown'} (${query.datasource})`}</Fact>
            {datasource?.isTimeAware ? (
              <>
                <Fact label="Time range">
                  {[formatRange(time.range, timeZone), ...time.shifts.map(formatShift)].join(', ')}
                </Fact>
                <Fact label="From">
                  {resolved ? formatTime(resolved.from.getTime(), timeZone, 'seconds') : ''}
                </Fact>
                <Fact label="To">
                  {resolved ? formatTime(resolved.to.getTime(), timeZone, 'seconds') : ''}
                </Fact>
                <Fact label="Time zone">{timeZone}</Fact>
              </>
            ) : (
              <Fact label="Time range">Doesn't apply: the datasource isn't time-aware</Fact>
            )}
            <Fact label="Response">{response}</Fact>
          </DataList>
          <Text size="sm" fw="bold">
            Request
          </Text>
          <Code block>
            {JSON.stringify(
              { spec: query.spec, range: resolved, raw: time.range, shifts: time.shifts, timeZone },
              null,
              2,
            )}
          </Code>
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="json" pt="md">
        <Stack>
          <Text size="sm" fw="bold">
            Widget
          </Text>
          <Code block>{JSON.stringify(widget, null, 2)}</Code>
          <Text size="sm" fw="bold">
            Frames
          </Text>
          {countRows(frames) > MAX_JSON_ROWS ? (
            <Text size="sm" c="dimmed">
              {countRows(frames)} rows: too many to show. Download the JSON from the Data tab.
            </Text>
          ) : (
            <Code block>{JSON.stringify(frames, null, 2)}</Code>
          )}
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="stats" pt="md">
        <Stack>
          <DataList orientation="horizontal">
            <Fact label="Fetched">
              {result.dataUpdatedAt ? formatTime(result.dataUpdatedAt, timeZone, 'seconds') : 'Not yet'}
            </Fact>
            <Fact label="Request time">{result.data ? `${result.data.durationMs} ms` : '–'}</Fact>
            <Fact label="Frames">{frames.length}</Fact>
            <Fact label="Rows">{countRows(frames)}</Fact>
          </DataList>
          <Text size="sm" fw="bold">
            Cache key
          </Text>
          <Text size="sm" c="dimmed">
            Widgets whose queries have the same key share one request.
          </Text>
          <Code block>{JSON.stringify(options.queryKey, null, 2)}</Code>
        </Stack>
      </Tabs.Panel>
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DataList.Item>
      <DataList.ItemLabel>{label}</DataList.ItemLabel>
      <DataList.ItemValue>{children}</DataList.ItemValue>
    </DataList.Item>
  );
}

/** The query's frames as a table, the first rows only, with CSV and JSON downloads. */
function DataPanel({
  frames,
  fileName,
  timeZone,
  empty,
}: {
  frames: DataFrame[];
  fileName: string;
  timeZone: string;
  /** Said when there is no frame: loading, the error, or that the query returned none. */
  empty: string;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frame = frames[frameIndex] ?? frames[0];
  if (!frame)
    return (
      <Text size="sm" c="dimmed">
        {empty}
      </Text>
    );
  return (
    <Stack>
      {frames.length > 1 ? (
        <Select
          label="Frame"
          value={String(frameIndex)}
          onChange={(value) => setFrameIndex(Number(value))}
          allowDeselect={false}
          data={frames.map((each, i) => ({ value: String(i), label: each.name ?? `Frame ${i + 1}` }))}
        />
      ) : null}
      <Group gap="xs">
        <Button
          variant="default"
          size="xs"
          onClick={() => downloadFile(`${fileName}.csv`, frameToCsv(frame), 'text/csv')}
        >
          Download CSV
        </Button>
        <Button
          variant="default"
          size="xs"
          onClick={() =>
            downloadFile(`${fileName}.json`, JSON.stringify(frames, null, 2), 'application/json')
          }
        >
          Download JSON
        </Button>
      </Group>
      <Table.ScrollContainer minWidth={frame.fields.length * 120}>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              {frame.fields.map((field) => (
                <Table.Th key={field.name}>{getFieldLabel(field)}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.from({ length: Math.min(frame.length, MAX_ROWS) }, (_, row) => (
              <Table.Tr key={row}>
                {frame.fields.map((field) => (
                  <Table.Td key={field.name}>{formatValue(field, field.values[row], timeZone)}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {frame.length > MAX_ROWS ? (
        <Text size="sm" c="dimmed">
          The first {MAX_ROWS} of {frame.length} rows. The downloads have them all.
        </Text>
      ) : null}
    </Stack>
  );
}
