import { Box, Paper } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { Suspense, useId, useState } from 'react';
import { QueryBoundary } from '@/ui/components/QueryBoundary';
import { TextSkeleton } from '@/ui/components/Skeletons';
import { AppError } from '@/core/errors/AppError';
import type { DataFrame } from '@/core/data/DataFrame';
import type { Query } from '@/plugins/DatasourcePlugin';
import { useWidgetData } from '../data/useWidgetData';
import { useEffectiveTime } from '../state/useEffectiveTime';
import { useWidget } from '../state/useDashboard';
import type { TimeRange } from '@/core/time/timeRange';
import type { Widget } from '@/core/dashboard/dashboardSchema';
import { usePlugins } from '@/plugins/usePlugins';
import { WidgetHeader } from './WidgetHeader';
import classes from './WidgetTile.module.css';

const nearViewport = { rootMargin: '200px' };
const unknownSkeleton = <TextSkeleton lines={3} />;

export function WidgetTile({
  id,
  range,
  timeZone,
  isEditing = false,
  previewQueries,
}: {
  id: string;
  /** The dashboard range; the widget's own overrides apply on top. */
  range: TimeRange;
  timeZone: string;
  isEditing?: boolean;
  previewQueries?: Query[];
}) {
  const widget = useWidget(id);
  return widget ? (
    <Tile
      id={id}
      widget={previewQueries ? { ...widget, queries: previewQueries } : widget}
      range={range}
      timeZone={timeZone}
      isEditing={isEditing}
      isPreview={previewQueries !== undefined}
    />
  ) : null;
}

function Tile({
  id,
  widget,
  range,
  timeZone,
  isEditing,
  isPreview,
}: {
  id: string;
  widget: Widget;
  range: TimeRange;
  timeZone: string;
  isEditing: boolean;
  isPreview: boolean;
}) {
  const titleId = useId();
  const { ref, entry } = useIntersection<HTMLDivElement>(nearViewport);
  const [hasBeenSeen, setSeen] = useState(false);
  if (!hasBeenSeen && entry?.isIntersecting) setSeen(true);
  const { widgets } = usePlugins();
  const time = useEffectiveTime(id, range, timeZone, { isEditing });
  const data = useWidgetData(widget.queries, time, { isEnabled: hasBeenSeen, source: widget.title });
  const skeleton = widgets[widget.type]?.skeleton ?? unknownSkeleton;
  return (
    <Paper
      id={isPreview ? undefined : 'widget-' + id}
      variant="widget"
      component="section"
      aria-labelledby={titleId}
      aria-busy={data.isFetching}
    >
      {isPreview ? (
        <Box p="sm" id={titleId}>
          {widget.title} preview
        </Box>
      ) : (
        <WidgetHeader
          id={id}
          widget={widget}
          titleId={titleId}
          isEditing={isEditing}
          isFetching={data.isFetching}
          hasFailed={data.hasFailed}
          onRefresh={() => void data.refetch()}
        />
      )}
      <Box ref={ref} className={classes.body}>
        <QueryBoundary name={widget.title} retry={data.refetch} resetKeys={[widget.options, widget.queries]}>
          {hasBeenSeen ? <WidgetBody widget={widget} frames={data.frames} error={data.error} /> : skeleton}
        </QueryBoundary>
      </Box>
    </Paper>
  );
}

function WidgetBody({
  widget,
  frames,
  error,
}: {
  widget: Widget;
  frames: DataFrame[] | undefined;
  error: unknown;
}) {
  const definition = usePlugins().widgets[widget.type];
  if (!definition)
    throw new AppError('validation', 'No widget of type "' + widget.type + '".', { isRetryable: false });
  const options = definition.optionsSchema.safeParse(widget.options);
  if (!options.success)
    throw new AppError(
      'validation',
      'The options for this ' + definition.name.toLowerCase() + ' are invalid.',
      { isRetryable: false, details: options.error.issues },
    );
  if (!frames && error) throw error;
  if (!frames) return definition.skeleton;
  return (
    <Suspense fallback={definition.skeleton}>
      <definition.component frames={frames} options={options.data} />
    </Suspense>
  );
}
