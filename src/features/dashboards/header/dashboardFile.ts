import { orderWidgets, storedDashboardSchema, type Dashboard } from '@/core/dashboard/dashboardSchema';
import type { Plugins } from '@/plugins/usePlugins';
import { downloadFile } from '@/utils/downloadFile';

/** The exported file's text: widgets in reading order, so the file reads top to bottom. */
export const serializeDashboard = (dashboard: Dashboard) => JSON.stringify(orderWidgets(dashboard), null, 2);

/** Saves the dashboard as `<id>.json` through the browser's download. */
export const downloadDashboard = (dashboard: Dashboard) =>
  downloadFile(`${dashboard.id}.json`, serializeDashboard(dashboard), 'application/json');

/**
 * Reads an imported file: migrate and validate it, then check that every widget type and
 * datasource exists here and accepts the file's options and query specs. Throws an Error that
 * says what is wrong.
 */
export function parseDashboardFile(text: string, plugins: Plugins): Dashboard {
  const dashboard = storedDashboardSchema.parse(JSON.parse(text));
  for (const widget of Object.values(dashboard.widgets)) {
    const definition = plugins.widgets[widget.type];
    if (!definition) throw new Error(`Unknown widget type "${widget.type}".`);
    definition.optionsSchema.parse(widget.options);
    for (const query of widget.queries) {
      const datasource = plugins.datasources[query.datasource];
      if (!datasource) throw new Error(`Unknown datasource "${query.datasource}".`);
      datasource.querySchema?.parse(query.spec);
    }
  }
  return dashboard;
}
