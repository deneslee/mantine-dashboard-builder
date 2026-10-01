import { Button, Modal, NumberInput, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { GRID_COLUMNS, resolveLayouts } from '@/core/dashboard/layout';
import { usePlugins } from '@/plugins/usePlugins';
import { focusWidgetMenu } from '../grid/focusWidgetMenu';
import { useDashboard, useDashboardActions, useWidget } from '../state/useDashboard';

/** Move or resize a widget by numbers: the keyboard and screen-reader way to do what dragging does. */
export function PlacementDialog({ id, kind }: { id: string; kind: 'move' | 'resize' }) {
  const actions = useDashboardActions();
  const widget = useWidget(id);
  const breakpoint = useDashboard((s) => s.breakpoint);
  const item = useDashboard((s) =>
    resolveLayouts(s.doc.layouts)[s.breakpoint].find((entry) => entry.i === id),
  );
  const definition = usePlugins().widgets[widget?.type ?? ''];
  const cols = GRID_COLUMNS[breakpoint];
  const [first, setFirst] = useState(kind === 'move' ? (item?.x ?? 0) + 1 : (item?.w ?? 2));
  const [second, setSecond] = useState(kind === 'move' ? (item?.y ?? 0) + 1 : (item?.h ?? 2));
  const handleClose = () => {
    actions.openTool(null);
    focusWidgetMenu(id);
  };
  const isValid =
    Number.isInteger(first) &&
    Number.isInteger(second) &&
    (kind === 'move'
      ? first >= 1 && first <= cols - (item?.w ?? 1) + 1 && second >= 1
      : first >= Math.min(definition?.minSize?.w ?? 1, cols) &&
        first <= cols &&
        second >= (definition?.minSize?.h ?? 1));
  return (
    <Modal
      opened
      onClose={handleClose}
      title={`${kind === 'move' ? 'Move' : 'Resize'} ${widget?.title ?? 'widget'}`}
      centered
    >
      <Stack>
        <NumberInput
          data-autofocus
          label={kind === 'move' ? 'Column' : 'Width (columns)'}
          value={first}
          onChange={(value) => setFirst(Number(value))}
          min={1}
          max={cols}
          allowDecimal={false}
        />
        <NumberInput
          label={kind === 'move' ? 'Row' : 'Height (rows)'}
          value={second}
          onChange={(value) => setSecond(Number(value))}
          min={1}
          allowDecimal={false}
        />
        <Text size="sm" c="dimmed">
          Positions start at 1. Tiles compact upward into available space.
        </Text>
        <Button
          disabled={!isValid}
          onClick={() => {
            actions.placeWidget(
              id,
              kind === 'move'
                ? { x: first - 1, y: second - 1 }
                : { w: first, h: second, x: Math.min(item?.x ?? 0, cols - first) },
            );
            handleClose();
          }}
        >
          Apply
        </Button>
      </Stack>
    </Modal>
  );
}
