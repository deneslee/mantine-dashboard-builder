import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import type { z } from 'zod';
import type { DataFrame } from '@/core/data/DataFrame';
import { wait } from '@/utils/wait';
import type { PluginIcon } from './PluginIcon';

/** What a widget component receives: one frame per query, and its options, already parsed. */
export interface WidgetProps<Options> {
  frames: DataFrame[];
  options: Options;
  /** The dashboard's time zone: show times as its clock does, never the browser's. */
  timeZone: string;
}

/**
 * The datasources a widget's queries may use: `'any'`, or the datasource kinds it accepts
 * (a built-in datasource id such as `mock`, or an optional plugin's `DatasourceType.type` such as `athena`).
 * The query editor offers only matching datasources (a later task).
 */
export type QueryTypes = 'any' | readonly string[];

/** What lists, palettes and menus show about a widget. Never loads its code. */
export interface WidgetMeta {
  /** The widget's id in the registry. */
  type: string;
  name: string;
  /** One sentence for the widget palette. */
  description: string;
  icon: PluginIcon;
  /** Size in `lg` grid cells when added from the palette. */
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  /** It shows data over time, so a widget of this type can have its own time (when a query's datasource is time-aware too). */
  isTimeAware: boolean;
  queryTypes: QueryTypes;
}

/** What an options editor receives: the parsed options, and a way to replace them. */
export interface OptionsEditorProps<Options> {
  value: Options;
  onChange: (next: Options) => void;
}

/** A lazy options editor (`lazyWidget`). */
export type LazyOptionsEditor<Options> = LazyExoticComponent<ComponentType<OptionsEditorProps<Options>>> & {
  preload?: () => Promise<unknown>;
};

/** A widget plugin: its metadata, plus its schema and lazy code. Features define them; `app/plugins.ts` collects them. */
export interface WidgetPlugin<Options = unknown> extends WidgetMeta {
  optionsSchema: z.ZodType<Options>;
  /** A lazy chunk (`lazyWidget`): a dashboard loads only the widget code it shows. */
  component: LazyWidget<Options>;
  /** Optional, and lazy. Without one, options are edited as JSON (generated editors come later, D6.1). */
  optionsEditor?: LazyOptionsEditor<Options>;
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

/** How many times a chunk load is tried, and how long to wait before each retry. */
export interface RetryOptions {
  /** Total tries, the first included. Default `LOAD_ATTEMPTS`. */
  attempts?: number;
  /** Milliseconds to wait before retry number `retry` (1-based). Default `500 * 2 ** (retry - 1)`. */
  delayMs?: (retry: number) => number;
}

export const LOAD_ATTEMPTS = 3;

/** `load()`, retried after a rejection up to `attempts` tries in all. Rejects with the last error. */
export async function loadWithRetry<T>(load: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? LOAD_ATTEMPTS;
  const delayMs = options.delayMs ?? ((retry: number) => 500 * 2 ** (retry - 1));
  for (let attempt = 1; ; attempt++) {
    try {
      return await load();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await wait(delayMs(attempt));
    }
  }
}

/**
 * `lazy(load)` plus `preload`, sharing one import. The constraint is `lazy`'s own; the props are
 * checked against the definition's options where it is used. Loading is retried on failure; after
 * the last try fails, the next `preload` tries again.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export function lazyWidget<Component extends ComponentType<any>>(
  load: () => Promise<{ default: Component }>,
  retry?: RetryOptions,
): LazyExoticComponent<NoInfer<Component>> & { preload: () => Promise<unknown> } {
  let loading: Promise<{ default: Component }> | undefined;
  const loadOnce = () =>
    (loading ??= loadWithRetry(load, retry).catch((error: unknown) => {
      loading = undefined; // the next preload starts over
      throw error;
    }));
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

/** A widget's metadata alone: no schema, component, editor or skeleton. Calls no loader. */
export function getWidgetMeta(widget: WidgetMeta): WidgetMeta {
  const { type, name, description, icon, defaultSize, minSize, isTimeAware, queryTypes } = widget;
  return { type, name, description, icon, defaultSize, ...(minSize && { minSize }), isTimeAware, queryTypes };
}

/** Every widget's metadata, in registry order, for palettes and pickers. */
export function listWidgetMeta(widgets: Record<string, WidgetPlugin>): WidgetMeta[] {
  return Object.values(widgets).map(getWidgetMeta);
}
