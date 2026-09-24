import * as Sentry from '@sentry/react';

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    Sentry.logger.info(message, context);
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    Sentry.logger.warn(message, context);
  },
  error: (message: string, context?: Record<string, unknown>) => {
    Sentry.logger.error(message, context);
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    Sentry.logger.debug(message, context);
  },
};

export const metrics = {
  count: (name: string, value: number = 1, options?: Parameters<typeof Sentry.metrics.count>[2]) => {
    Sentry.metrics.count(name, value, options);
  },
  distribution: (
    name: string,
    value: number,
    options?: Parameters<typeof Sentry.metrics.distribution>[2],
  ) => {
    Sentry.metrics.distribution(name, value, options);
  },
  gauge: (name: string, value: number, options?: Parameters<typeof Sentry.metrics.gauge>[2]) => {
    Sentry.metrics.gauge(name, value, options);
  },
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
