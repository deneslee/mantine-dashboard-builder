export interface SentryStatus {
  isConfigured: boolean;
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
