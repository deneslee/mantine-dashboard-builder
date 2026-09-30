export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  enableLogs: boolean;
}

const STORAGE_KEY = 'sentry.config.v1';

export function getDefaultSentryConfig(): SentryConfig {
  return {
    dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
    environment: import.meta.env.VITE_SENTRY_ENV ?? import.meta.env.MODE ?? 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE ?? '0.1.0',
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 1.0),
    replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0.1),
    replaysOnErrorSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 1.0),
    enableLogs: true,
  };
}

export function loadSentryConfig(): SentryConfig {
  const defaults = getDefaultSentryConfig();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SentryConfig>;
    return {
      ...defaults,
      ...parsed,
      // If localStorage has an empty DSN, fall back to environment variable if present
      dsn: parsed.dsn && parsed.dsn.trim().length > 0 ? parsed.dsn : defaults.dsn,
    };
  } catch {
    return defaults;
  }
}

export function saveSentryConfig(config: SentryConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('[sentry] Failed to save config to localStorage', e);
  }
}

export function resetSentryConfig(): SentryConfig {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return getDefaultSentryConfig();
}
