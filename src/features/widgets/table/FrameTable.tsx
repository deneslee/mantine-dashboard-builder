import { NumberFormatter, ScrollArea, Table, UnstyledButton } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconSelector } from '@tabler/icons-react';
import type { Row } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { createAppColumnHelper, useAppTable, type appTableFeatures } from '@/components/table/useAppTable';
import { iconSize, iconStroke } from '@/design-system/tokens/semantic';
import { fieldLabel, unitAffix, type DataFrame, type Field } from '@/types/dataframe';
import type { WidgetProps } from '@/types/widget';
import type { ColumnOptions, TableOptions } from './options';
import classes from './FrameTable.module.css';

/** Rows are one line, so the virtualizer can place them without measuring. Matches `.row`. */
const ROW_HEIGHT = 32;
const empty: DataFrame = { length: 0, fields: [] };
/** A row is only its index into the frame's columns; the values stay in the columns. */
interface RowRef {
  i: number;
}
type TableRow = Row<typeof appTableFeatures, RowRef>;
const column = createAppColumnHelper<RowRef>();

function cell(field: Field, value: unknown, options: ColumnOptions | undefined): ReactNode {
  if (value === null || value === undefined) return null;
  if (field.type === 'time' && typeof value === 'number') return dayjs(value).format('D MMM, HH:mm:ss');
  if (field.type === 'number' && typeof value === 'number') {
    if (options?.format === 'percent')
      return <NumberFormatter value={value * 100} decimalScale={1} fixedDecimalScale suffix="%" />;
    return <NumberFormatter value={value} thousandSeparator=" " {...unitAffix(field.config?.unit)} />;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean);
}

const alignOf = (field: Field, options: ColumnOptions | undefined) =>
  options?.align ?? (field.type === 'number' ? 'right' : 'left');

const ariaSort = { asc: 'ascending', desc: 'descending' } as const;
const SortIcon = { asc: IconArrowUp, desc: IconArrowDown, none: IconSelector };

/**
 * The first frame as a table. Headers sort (click or Enter); only the rows in view are in the
 * DOM, so a frame of 10 000 rows scrolls like one of 10.
 */
export function FrameTable({ frames, options }: WidgetProps<TableOptions>) {
  const frame = frames[0] ?? empty;
  const fields = new Map(frame.fields.map((field) => [field.name, field]));
  const columns = frame.fields.map((field) =>
    column.accessor((row) => field.values[row.i], {
      id: field.name,
      header: options.columns[field.name]?.label ?? fieldLabel(field),
      sortFn: field.type === 'string' ? 'text' : 'basic',
    }),
  );
  const data = Array.from({ length: frame.length }, (_, i) => ({ i }));
  const table = useAppTable({ columns, data });
  // State, not a ref: the body's virtualizer needs the element, and a child's layout effects run
  // before its parent's ref is attached. Setting state re-renders the body once the element exists.
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollArea h="100%" viewportRef={setViewport} type="auto" offsetScrollbars="y">
      <Table stickyHeader fz="sm" verticalSpacing={0} className={classes.table}>
        <Table.Thead>
          {table.getHeaderGroups().map((group) => (
            <Table.Tr key={group.id}>
              {group.headers.map((header) => {
                const field = fields.get(header.column.id);
                const sorted = header.column.getIsSorted();
                const Icon = SortIcon[sorted || 'none'];
                return (
                  <Table.Th
                    key={header.id}
                    aria-sort={sorted ? ariaSort[sorted] : undefined}
                    ta={field ? alignOf(field, options.columns[field.name]) : undefined}
                  >
                    <UnstyledButton
                      className={clsx('mantine-focus-auto', classes.sort)}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {String(header.column.columnDef.header)}
                      <Icon size={iconSize.xs} stroke={iconStroke} aria-hidden />
                    </UnstyledButton>
                  </Table.Th>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Thead>
        <VirtualBody rows={table.getRowModel().rows} viewport={viewport} fields={fields} options={options} />
      </Table>
    </ScrollArea>
  );
}

interface BodyProps {
  rows: TableRow[];
  viewport: HTMLDivElement | null;
  fields: Map<string, Field>;
  options: TableOptions;
}

/**
 * The rows in view, with spacers standing in for the rest. Its own component: scrolling re-renders
 * only this, and the React Compiler, which skips TanStack Virtual, still memoizes the table above.
 */
function VirtualBody({ rows, viewport, fields, options }: BodyProps) {
  // oxlint-disable-next-line react/incompatible-library -- scoped to this component on purpose (see above)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => viewport,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    // A first guess until the viewport is measured, so the first paint already has rows.
    initialRect: { width: 0, height: 10 * ROW_HEIGHT },
  });
  const items = virtualizer.getVirtualItems();
  const before = items[0]?.start ?? 0;
  const after = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);
  const span = fields.size;

  return (
    <Table.Tbody>
      {before > 0 ? (
        <Table.Tr aria-hidden>
          <Table.Td colSpan={span} p={0} h={before} />
        </Table.Tr>
      ) : null}
      {items.map((item) => {
        const row = rows[item.index];
        if (!row) return null;
        return (
          <Table.Tr key={row.id} className={classes.row}>
            {row.getAllCells().map((c) => {
              const field = fields.get(c.column.id);
              const cellOptions = field ? options.columns[field.name] : undefined;
              return (
                <Table.Td key={c.id} ta={field ? alignOf(field, cellOptions) : undefined}>
                  {field ? cell(field, c.getValue(), cellOptions) : null}
                </Table.Td>
              );
            })}
          </Table.Tr>
        );
      })}
      {after > 0 ? (
        <Table.Tr aria-hidden>
          <Table.Td colSpan={span} p={0} h={after} />
        </Table.Tr>
      ) : null}
    </Table.Tbody>
  );
}
