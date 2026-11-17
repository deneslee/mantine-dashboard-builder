import type { PluginIcon } from './PluginIcon';

/** Where an action appears. Menus render one item per action whose placement matches. */
export type ActionPlacement = 'dashboard.header' | 'widget.menu';

/** What an action is run on: ids only, so it stays serializable. */
export interface ActionContext {
  dashboardId?: string;
  widgetId?: string;
}

/** Something a user can do that a plugin contributes. Its code loads when the menu item is clicked. */
export interface ActionPlugin {
  /** Unique among actions. */
  id: string;
  label: string;
  icon: PluginIcon;
  placements: ActionPlacement[];
  load: () => Promise<{ run(ctx: ActionContext): void | Promise<void> }>;
}
