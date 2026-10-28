import { SplitViewHeader } from './SplitViewHeader';
import { SplitViewPane, SplitViewRoot } from './SplitViewRoot';

/**
 * The compound API: `SplitView.Root`, `.Pane`, `.Header`. Its own file, so the component files
 * export only components and keep Fast Refresh.
 */
export const SplitView = {
  Root: SplitViewRoot,
  Pane: SplitViewPane,
  Header: SplitViewHeader,
};
