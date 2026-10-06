import { Button, Modal, SegmentedControl, Select, Stack, Text } from '@mantine/core';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import type { TimeOverride, TimeRange } from '@/core/time/timeRange';
import { TimeRangePicker } from '../header/TimeRangePicker';
import { formatRange, formatShift } from '../header/formatRange';
import { useDashboard, useDashboardActions } from '../state/useDashboard';
import { focusWidgetMenu } from './focusWidgetMenu';

const SHIFTS = ['1h', '1d', '1w', '4w'].map((by) => ({ value: by, label: formatShift(by) }));

/**
 * A widget's own time: an own range, or what it inherits shifted back. In edit mode it changes the
 * saved widget, as one undo step; otherwise the viewer's override in the URL (`wt`), on top of the
 * saved one. The URL keeps an override only where it differs from the saved value.
 */
export function WidgetTimeDialog({
  id,
  title,
  range,
  isEditing,
  onClose,
}: {
  id: string;
  title: string;
  /** The dashboard range, where an own range starts. */
  range: TimeRange;
  isEditing: boolean;
  onClose: () => void;
}) {
  const actions = useDashboardActions();
  const navigate = useNavigate({ from: '/dashboards/$id' });
  const saved = useDashboard((s) => s.doc.widgets[id]?.time);
  const viewer = useSearch({ strict: false, select: (search) => search.wt?.[id] });
  const current = isEditing ? saved : viewer;
  const [mode, setMode] = useState(current?.mode ?? 'inherit');
  const [ownRange, setOwnRange] = useState(current?.mode === 'range' ? current : range);
  const [shift, setShift] = useState(current?.mode === 'shift' ? current.by : '1w');
  const isOverSaved = !isEditing && saved !== undefined;
  const inherited = isOverSaved
    ? `As saved: ${saved.mode === 'range' ? formatRange(saved) : formatShift(saved.by)}.`
    : "The dashboard's time range.";
  const handleClose = () => {
    onClose();
    focusWidgetMenu(id);
  };
  const handleApply = () => {
    const next: TimeOverride | undefined =
      mode === 'range'
        ? { mode, from: ownRange.from, to: ownRange.to }
        : mode === 'shift'
          ? { mode, by: shift }
          : undefined;
    if (isEditing) actions.editWidget(id, { time: next });
    else
      void navigate({
        search: (prev) => {
          const wt = { ...prev.wt };
          if (next && JSON.stringify(next) !== JSON.stringify(saved)) wt[id] = next;
          else delete wt[id];
          return { ...prev, wt: Object.keys(wt).length ? wt : undefined };
        },
        resetScroll: false,
      });
    handleClose();
  };
  return (
    <Modal opened onClose={handleClose} title={`Time for ${title}`} centered>
      <Stack>
        <SegmentedControl
          aria-label="Time"
          value={mode}
          onChange={(value) => setMode(value as typeof mode)}
          data={[
            { value: 'inherit', label: isOverSaved ? 'As saved' : "Dashboard's" },
            { value: 'range', label: 'Own range' },
            { value: 'shift', label: 'Earlier' },
          ]}
        />
        {mode === 'inherit' ? (
          <Text size="sm" c="dimmed">
            {inherited}
          </Text>
        ) : null}
        {mode === 'range' ? <TimeRangePicker value={ownRange} onChange={setOwnRange} /> : null}
        {mode === 'shift' ? (
          <Select
            label={isOverSaved ? 'Compared with as saved' : "Compared with the dashboard's range"}
            data={SHIFTS}
            value={shift}
            onChange={(value) => value && setShift(value)}
            allowDeselect={false}
          />
        ) : null}
        <Button onClick={handleApply}>Apply</Button>
      </Stack>
    </Modal>
  );
}
