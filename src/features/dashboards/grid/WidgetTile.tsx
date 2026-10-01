import { Box, Paper } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useId, useState } from 'react';
import { QueryBoundary } from '@/ui/components/QueryBoundary';
import { TextSkeleton } from '@/ui/components/Skeletons';
import { AppError } from '@/core/errors/AppError';
import type { DataFrame } from '@/core/data/DataFrame';
import type { Query } from '@/plugins/DatasourcePlugin';
import { widgetDataQuery } from '../data/dashboardQueries';
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
  isEditing = false,
  previewQueries,
}: {
  id: string;
  range: TimeRange;
  isEditing?: boolean;
  previewQueries?: Query[];
}) {
  const widget = useWidget(id);
  return widget ? (
    <Tile
      id={id}
      widget={previewQueries ? { ...widget, queries: previewQueries } : widget}
      range={range}
      isEditing={isEditing}
      isPreview={previewQueries !== undefined}
    />
  ) : null;
}

function Tile({
  id,
  widget,
  range,
  isEditing,
  isPreview,
}: {
  id: string;
  widget: Widget;
  range: TimeRange;
  isEditing: boolean;
  isPreview: boolean;
}) {
  const titleId = useId();
  const { ref, entry } = useIntersection<HTMLDivElement>(nearViewport);
  const [hasBeenSeen, setSeen] = useState(false);
  if (!hasBeenSeen && entry?.isIntersecting) setSeen(true);
  const { widgets, datasources } = usePlugins();
  const result = useQuery({
    ...widgetDataQuery(widget.queries, range, datasources, widget.title),
    enabled: hasBeenSeen,
    throwOnError: false,
  });
  const skeleton = widgets[widget.type]?.skeleton ?? unknownSkeleton;
  return (
    <Paper
      id={isPreview ? undefined : 'widget-' + id}
      variant="widget"
      component="section"
      aria-labelledby={titleId}
      aria-busy={result.isFetching}
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
          range={range}
          isEditing={isEditing}
          isFetching={result.isFetching}
          hasFailed={result.isError}
        />
      )}
      <Box ref={ref} className={classes.body}>
        <QueryBoundary
          name={widget.title}
          retry={() => result.refetch()}
          resetKeys={[widget.options, widget.queries]}
        >
          {hasBeenSeen ? <WidgetBody widget={widget} frames={result.data} error={result.error} /> : skeleton}
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
