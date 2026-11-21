export interface SentryStatus {
  /** A DSN is saved or set in the environment. */
  isConfigured: boolean;
  /** The SDK started on this page load. */
  isRunning: boolean;
  /** The saved config differs from the one the SDK started with: a reload applies it. */
  needsReload: boolean;
  dsn: string;
  environment: string;
  release: string;
  features: {
    errors: boolean;
    logs: boolean;
    metrics: boolean;
    replay: boolean;
    tracing: boolean;
  };
}
