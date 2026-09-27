import { Box, Group, Paper, Text } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useId, useState } from 'react';
import { WidgetBoundary } from '@/components/errors/WidgetBoundary';
import { TextSkeleton } from '@/components/feedback/skeletons/Skeletons';
import { fontWeight } from '@/design-system/tokens/semantic';
import { AppError } from '@/lib/errors/AppError';
import { widgetDataQuery } from '../../api/queries';
import type { RawRange } from '../../model/timeRange';
import type { Widget } from '../../model/types';
import { useDashboardRegistry } from '../../registry';
import classes from './WidgetTile.module.css';

/** Content starts mounting this far before the tile scrolls into view. */
const nearViewport = { rootMargin: '200px' };
/** For a widget type the registry doesn't know; its body then shows the error. */
const unknownSkeleton = <TextSkeleton lines={3} />;

interface TileProps {
  widget: Widget;
  range: RawRange;
}

/**
 * One grid tile: a header, then the widget inside its own error boundary. The widget mounts the
 * first time the tile is near the viewport (its chunk and queries start then) and stays mounted
 * afterwards, so scrolling back is instant.
 */
export function WidgetTile({ widget, range }: TileProps) {
  const titleId = useId();
  const { ref, entry } = useIntersection<HTMLDivElement>(nearViewport);
  const [seen, setSeen] = useState(false);
  if (!seen && entry?.isIntersecting) setSeen(true);
  const skeleton = useDashboardRegistry().widgets[widget.type]?.skeleton ?? unknownSkeleton;

  return (
    <Paper variant="widget" component="section" aria-labelledby={titleId}>
      <Group className={classes.header} justify="space-between" wrap="nowrap">
        <Text id={titleId} size="sm" fw={fontWeight.medium} truncate>
          {widget.title}
        </Text>
      </Group>
      <Box ref={ref} className={classes.body}>
        <WidgetBoundary name={widget.title}>
          {seen ? <WidgetBody widget={widget} range={range} /> : skeleton}
        </WidgetBoundary>
      </Box>
    </Paper>
  );
}

/**
 * Runs the widget's queries and draws it. An unknown type, invalid options or a first-load error
 * throws to the tile's boundary; the rest of the dashboard keeps running.
 */
function WidgetBody({ widget, range }: TileProps) {
  const { widgets, datasources } = useDashboardRegistry();
  const { data: frames } = useQuery(widgetDataQuery(widget.queries, range, datasources, widget.title));

  const definition = widgets[widget.type];
  if (!definition)
    throw new AppError('validation', `No widget of type "${widget.type}".`, { retryable: false });
  const options = definition.optionsSchema.safeParse(widget.options);
  if (!options.success)
    throw new AppError('validation', `The options for this ${definition.name.toLowerCase()} are invalid.`, {
      retryable: false,
      details: options.error.issues,
    });

  // Only on the first load: on a range change `frames` still holds the previous data.
  if (!frames) return definition.skeleton;
  return (
    <Suspense fallback={definition.skeleton}>
      <definition.component frames={frames} options={options.data} />
    </Suspense>
  );
}
