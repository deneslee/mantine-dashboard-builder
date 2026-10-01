import { describe, expect, it } from 'vitest';
import { isValidTime, parseRefreshInterval, resolveRange, resolveTime } from './timeRange';

const now = Date.UTC(2026, 8, 27, 12, 0);

describe('resolveTime', () => {
  it('resolves now and relative times against now', () => {
    expect(resolveTime('now', now)?.getTime()).toBe(now);
    expect(resolveTime('now-15m', now)?.getTime()).toBe(now - 15 * 60_000);
    expect(resolveTime('now-24h', now)?.getTime()).toBe(now - 24 * 3_600_000);
    expect(resolveTime('now-7d', now)?.getTime()).toBe(now - 7 * 86_400_000);
    expect(resolveTime('now-2w', now)?.getTime()).toBe(now - 14 * 86_400_000);
  });

  it('accepts ISO dates', () => {
    expect(resolveTime('2026-09-20T08:00:00Z', now)?.toISOString()).toBe('2026-09-20T08:00:00.000Z');
    expect(resolveTime('2026-09-20', now)).toBeInstanceOf(Date);
  });

  it('rejects anything else', () => {
    for (const bad of ['', 'yesterday', 'now-', 'now-5y', 'now+1h', '20 Sep 2026', '2026-13-45']) {
      expect(isValidTime(bad), bad).toBe(false);
    }
  });
});

describe('resolveRange', () => {
  it('resolves both ends, or nothing when either is invalid', () => {
    expect(resolveRange({ from: 'now-1h', to: 'now' }, now)).toEqual({
      from: new Date(now - 3_600_000),
      to: new Date(now),
    });
    expect(resolveRange({ from: 'soon', to: 'now' }, now)).toBeUndefined();
  });
});

describe('parseRefreshInterval', () => {
  it('reads intervals and treats off or junk as no refresh', () => {
    expect(parseRefreshInterval('30s')).toBe(30_000);
    expect(parseRefreshInterval('1m')).toBe(60_000);
    expect(parseRefreshInterval('1h')).toBe(3_600_000);
    expect(parseRefreshInterval('off')).toBeUndefined();
    expect(parseRefreshInterval('0s')).toBeUndefined();
    expect(parseRefreshInterval('fast')).toBeUndefined();
  });
});
