/**
 * Puts focus back on a widget's menu button once a drawer or dialog has closed, or on Add widget
 * when there is no widget to return to. Waits a frame so the closing element has let go of focus.
 */
export const focusWidgetMenu = (id?: string) =>
  requestAnimationFrame(() => document.getElementById(id ? `widget-menu-${id}` : 'add-widget')?.focus());
