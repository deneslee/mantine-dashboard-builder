import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import type { z } from 'zod';
import type { DataFrame } from '@/core/data/DataFrame';

/** What a widget component receives: one frame per query, and its options, already parsed. */
export interface WidgetProps<Options> {
  frames: DataFrame[];
  options: Options;
  /** The dashboard's time zone: show times as its clock does, never the browser's. */
  timeZone: string;
}

/** A widget plugin. Features define them; `app/plugins.ts` collects them. */
export interface WidgetPlugin<Options = unknown> {
  type: string;
  name: string;
  /** Size in `lg` grid cells when added from the palette (phase 3). */
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  /** It shows data over time, so a widget of this type can have its own time (when a query's datasource is time-aware too). */
  isTimeAware: boolean;
  optionsSchema: z.ZodType<Options>;
  /** A lazy chunk (`lazyWidget`): a dashboard loads only the widget code it shows. */
  component: LazyWidget<Options>;
  /** Shown while the tile waits to come into view, and while its chunk and data load. */
  skeleton: ReactNode;
}

/**
 * A lazy widget component. With `preload` (`lazyWidget`) its chunk starts loading alongside the
 * widget's data; a plain `lazy` one loads when it first renders, after the data.
 */
export type LazyWidget<Options> = LazyExoticComponent<ComponentType<WidgetProps<Options>>> & {
  preload?: () => Promise<unknown>;
};

/**
 * `lazy(load)` plus `preload`, sharing one import. The constraint is `lazy`'s own; the props are
 * checked against the definition's options where it is used.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export function lazyWidget<Component extends ComponentType<any>>(
  load: () => Promise<{ default: Component }>,
): LazyExoticComponent<NoInfer<Component>> & { preload: () => Promise<unknown> } {
  let loading: ReturnType<typeof load> | undefined;
  const loadOnce = () => (loading ??= load());
  return Object.assign(lazy(loadOnce), { preload: loadOnce });
}

/**
 * Checks that a component and its options schema agree, then drops the options type so
 * definitions fit in one plugins map. The tile parses options with the same schema before
 * rendering, so the pairing holds at runtime.
 */
export function defineWidget<Options>(definition: WidgetPlugin<Options>): WidgetPlugin {
  return definition as unknown as WidgetPlugin;
}
