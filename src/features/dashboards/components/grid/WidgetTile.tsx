import { Box, Paper } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useId, useState } from 'react';
import { WidgetBoundary } from '@/components/errors/WidgetBoundary';
import { TextSkeleton } from '@/components/feedback/skeletons/Skeletons';
import { AppError } from '@/lib/errors/AppError';
import type { DataFrame } from '@/types/dataframe';
import type { Query } from '@/types/datasource';
import { widgetDataQuery } from '../../api/queries';
import { useWidget } from '../../hooks/useDashboard';
import type { RawRange } from '../../model/timeRange';
import type { Widget } from '../../model/types';
import { useDashboardRegistry } from '../../registry';
import { WidgetHeader } from './WidgetHeader';
import classes from './WidgetTile.module.css';

const nearViewport = { rootMargin: '200px' };
const unknownSkeleton = <TextSkeleton lines={3} />;

export function WidgetTile({
  id,
  range,
  previewQueries,
}: {
  id: string;
  range: RawRange;
  previewQueries?: Query[];
}) {
  const widget = useWidget(id);
  return widget ? (
    <Tile
      widget={previewQueries ? { ...widget, queries: previewQueries } : widget}
      range={range}
      preview={previewQueries !== undefined}
    />
  ) : null;
}

function Tile({ widget, range, preview }: { widget: Widget; range: RawRange; preview: boolean }) {
  const titleId = useId();
  const { ref, entry } = useIntersection<HTMLDivElement>(nearViewport);
  const [seen, setSeen] = useState(false);
  if (!seen && entry?.isIntersecting) setSeen(true);
  const { widgets, datasources } = useDashboardRegistry();
  const result = useQuery({
    ...widgetDataQuery(widget.queries, range, datasources, widget.title),
    enabled: seen,
    throwOnError: false,
  });
  const skeleton = widgets[widget.type]?.skeleton ?? unknownSkeleton;
  return (
    <Paper
      id={preview ? undefined : 'widget-' + widget.id}
      variant="widget"
      component="section"
      aria-labelledby={titleId}
      aria-busy={result.isFetching}
    >
      {preview ? (
        <Box p="sm" id={titleId}>
          {widget.title} preview
        </Box>
      ) : (
        <WidgetHeader
          widget={widget}
          titleId={titleId}
          range={range}
          fetching={result.isFetching}
          failed={result.isError}
        />
      )}
      <Box ref={ref} className={classes.body}>
        <WidgetBoundary
          name={widget.title}
          retry={() => result.refetch()}
          resetKeys={[widget.options, widget.queries]}
        >
          {seen ? <WidgetBody widget={widget} frames={result.data} error={result.error} /> : skeleton}
        </WidgetBoundary>
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
  const definition = useDashboardRegistry().widgets[widget.type];
  if (!definition)
    throw new AppError('validation', 'No widget of type "' + widget.type + '".', { retryable: false });
  const options = definition.optionsSchema.safeParse(widget.options);
  if (!options.success)
    throw new AppError(
      'validation',
      'The options for this ' + definition.name.toLowerCase() + ' are invalid.',
      { retryable: false, details: options.error.issues },
    );
  if (!frames && error) throw error;
  if (!frames) return definition.skeleton;
  return (
    <Suspense fallback={definition.skeleton}>
      <definition.component frames={frames} options={options.data} />
    </Suspense>
  );
}
