import { describe, expect, it } from 'vitest';
import { getSentryStatus, testSentryConnection } from './client';
import { loadSentryConfig, saveSentryConfig } from './settings';
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

  it('supports saving and loading settings from localStorage', () => {
    const config = loadSentryConfig();
    expect(config).toBeDefined();
    saveSentryConfig({
      ...config,
      tracesSampleRate: 0.8,
    });
    const updated = loadSentryConfig();
    expect(updated.tracesSampleRate).toBe(0.8);
  });

  it('handles connection test without throwing when DSN is empty or invalid', async () => {
    const result = await testSentryConnection();
    expect(result).toBeDefined();
    expect(typeof result.ok).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });
});
