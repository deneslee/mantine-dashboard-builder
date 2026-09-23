import { Box, Group, Paper, Text } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { Suspense, useId, useState } from 'react';
import { WidgetBoundary } from '@/features/errors';
import type { WidgetProps } from '../../model/types';
import { widgetKinds } from '../widgets/widgetKinds';
import classes from './WidgetTile.module.css';

/** Content starts mounting this far before the tile scrolls into view. */
const nearViewport = { rootMargin: '200px' };

/**
 * One grid tile: a header, then the widget inside its own error boundary and Suspense.
 * The widget mounts the first time the tile is near the viewport (its chunk and query start
 * then) and stays mounted afterwards, so scrolling back is instant.
 */
export function WidgetTile({ dashboardId, widget }: WidgetProps) {
  const titleId = useId();
  const { ref, entry } = useIntersection<HTMLDivElement>(nearViewport);
  const [seen, setSeen] = useState(false);
  if (!seen && entry?.isIntersecting) setSeen(true);

  const kind = widgetKinds[widget.kind];

  return (
    <Paper variant="widget" component="section" aria-labelledby={titleId}>
      <Group className={classes.header} justify="space-between" wrap="nowrap">
        <Text id={titleId} size="sm" fw={600} truncate>
          {widget.title}
        </Text>
      </Group>
      <Box ref={ref} className={classes.body}>
        <WidgetBoundary name={widget.title}>
          {seen ? (
            <Suspense fallback={kind.skeleton}>
              <kind.component dashboardId={dashboardId} widget={widget} />
            </Suspense>
          ) : (
            kind.skeleton
          )}
        </WidgetBoundary>
      </Box>
    </Paper>
  );
}
