import type { Icon } from '@tabler/icons-react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { z } from 'zod';
import type { DataFrame } from '@/core/data/DataFrame';

/** What a widget component receives: one frame per query, and its options, already parsed. */
export interface WidgetProps<Options> {
  frames: DataFrame[];
  options: Options;
}

/** A widget plugin. Features define them; `app/plugins.ts` collects them. */
export interface WidgetPlugin<Options = unknown> {
  type: string;
  name: string;
  icon: Icon;
  /** Size in `lg` grid cells when added from the palette (phase 3). */
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  capabilities: { time: boolean; inspect: boolean; export: ('csv' | 'json')[]; hoverSync: boolean };
  optionsSchema: z.ZodType<Options>;
  /** A lazy chunk: a dashboard loads only the widget code it shows. */
  component: LazyExoticComponent<ComponentType<WidgetProps<Options>>>;
  /** Shown while the tile waits to come into view, and while its chunk and data load. */
  skeleton: ReactNode;
}

/**
 * Checks that a component and its options schema agree, then drops the options type so
 * definitions fit in one plugins map. The tile parses options with the same schema before
 * rendering, so the pairing holds at runtime.
 */
export function defineWidget<Options>(definition: WidgetPlugin<Options>): WidgetPlugin {
  return definition as unknown as WidgetPlugin;
}
