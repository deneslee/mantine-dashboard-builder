export type NotifyLevel = 'success' | 'info' | 'warning' | 'error';

export interface NotifyAction {
  label: string;
  onClick: () => void;
}

export interface NotifyInput {
  /** Outcome first, under 60 characters: "Dashboard saved", not "Success". */
  title: string;
  message?: string;
  action?: NotifyAction;
  /** Same key within 10s updates the existing toast instead of stacking. */
  dedupeKey?: string;
  /** Where it came from, shown in the inbox. */
  source?: string;
  /** Override auto-close in ms; `false` keeps it until dismissed. */
  autoClose?: number | false;
}

export interface InboxItem {
  id: string;
  level: NotifyLevel;
  title: string;
  message?: string;
  source?: string;
  at: number;
  read: boolean;
  count: number;
}
