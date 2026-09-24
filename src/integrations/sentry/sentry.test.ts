import { describe, expect, it } from 'vitest';
import { getIntegrations } from '../registry';
import { getSentryStatus } from './client';
import { logger, metrics } from './telemetry';

describe('Sentry Integration', () => {
  it('reports status with all 5 telemetry features enabled', () => {
    const status = getSentryStatus();
    expect(status).toBeDefined();
    expect(status.features.errors).toBe(true);
    expect(status.features.logs).toBe(true);
    expect(status.features.metrics).toBe(true);
    expect(status.features.replay).toBe(true);
    expect(status.features.tracing).toBe(true);
  });

  it('exposes telemetry logger and metrics without throwing', () => {
    expect(() => {
      logger.info('test info message', { test: true });
      logger.warn('test warn message');
      logger.error('test error message');
      metrics.count('unit_test_metric', 1);
      metrics.distribution('unit_test_dist', 100);
      metrics.gauge('unit_test_gauge', 42);
    }).not.toThrow();
  });

  it('registers Sentry in integrations catalog with route and features', () => {
    const integrations = getIntegrations();
    const sentry = integrations.find((i) => i.id === 'sentry');
    expect(sentry).toBeDefined();
    expect(sentry?.to).toBe('/integrations/sentry');
    expect(sentry?.features).toContain('Errors');
    expect(sentry?.features).toContain('Logs');
    expect(sentry?.features).toContain('App Metrics');
    expect(sentry?.features).toContain('Session Replay');
    expect(sentry?.features).toContain('Tracing');
  });
});
