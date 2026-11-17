import type { ComponentType, LazyExoticComponent } from 'react';
import type { PluginIcon } from './PluginIcon';

/**
 * A context-bar panel a plugin contributes, beside the tabs routes declare (`shell/ContextTab`).
 * `app/` turns these into context tabs; the panel's code is lazy.
 */
export interface ContextPanelPlugin {
  /** Unique among panels; also the tab's id. */
  id: string;
  label: string;
  icon: PluginIcon;
  component: LazyExoticComponent<ComponentType>;
  /** TanStack route ids the panel applies to, such as `/dashboards/$id`. `app/` adds it to the tabs of those routes. */
  routes: string[];
}
