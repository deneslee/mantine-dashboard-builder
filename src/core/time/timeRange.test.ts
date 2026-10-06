import { describe, expect, it } from 'vitest';
import {
  isValidTime,
  isValidTimeZone,
  parseRefreshInterval,
  resolveEffectiveTime,
  resolveRange,
  resolveTime,
  resolveWidgetTime,
  timeOverrideSchema,
  type TimeRange,
} from './timeRange';

const now = Date.UTC(2026, 8, 27, 12, 0); // Sunday 27 Sep 2026, 12:00 UTC
const iso = (value: string, timeZone = 'UTC', edge: 'start' | 'end' = 'start') =>
  resolveTime(value, now, timeZone, edge)?.toISOString();

describe('resolveTime', () => {
  it('resolves now and relative times against now', () => {
    expect(resolveTime('now', now, 'UTC')?.getTime()).toBe(now);
    expect(resolveTime('now-15m', now, 'UTC')?.getTime()).toBe(now - 15 * 60_000);
    expect(resolveTime('now-24h', now, 'UTC')?.getTime()).toBe(now - 24 * 3_600_000);
    expect(resolveTime('now-7d', now, 'UTC')?.getTime()).toBe(now - 7 * 86_400_000);
    expect(resolveTime('now-2w', now, 'UTC')?.getTime()).toBe(now - 14 * 86_400_000);
  });

  it('rounds to the start of a unit, or to its end for the end of a range', () => {
    expect(iso('now/d')).toBe('2026-09-27T00:00:00.000Z');
    expect(iso('now/d', 'UTC', 'end')).toBe('2026-09-27T23:59:59.999Z');
    expect(iso('now-1d/d')).toBe('2026-09-26T00:00:00.000Z');
    expect(iso('now/h')).toBe('2026-09-27T12:00:00.000Z');
    expect(iso('now/w')).toBe('2026-09-21T00:00:00.000Z'); // weeks start on Monday
  });

  it('rounds days in the given time zone', () => {
    // 12:00 UTC is 14:00 in Budapest (summer time) and 08:00 in New York.
    expect(iso('now/d', 'Europe/Budapest')).toBe('2026-09-26T22:00:00.000Z');
    expect(iso('now/d', 'America/New_York')).toBe('2026-09-27T04:00:00.000Z');
    expect(iso('now/d', 'America/New_York', 'end')).toBe('2026-09-28T03:59:59.999Z');
  });

  it('keeps days midnight to midnight across a DST change', () => {
    const afterChange = Date.UTC(2026, 9, 26, 12, 0); // Budapest left summer time on 25 Oct
    expect(resolveTime('now-1d/d', afterChange, 'Europe/Budapest')?.toISOString()).toBe(
      '2026-10-24T22:00:00.000Z',
    );
    expect(resolveTime('now-1d/d', afterChange, 'Europe/Budapest', 'end')?.toISOString()).toBe(
      '2026-10-25T22:59:59.999Z', // a 25-hour day
    );
  });

  it('accepts ISO dates', () => {
    expect(iso('2026-09-20T08:00:00Z')).toBe('2026-09-20T08:00:00.000Z');
    expect(resolveTime('2026-09-20', now, 'UTC')).toBeInstanceOf(Date);
  });

  it('rejects anything else', () => {
    for (const bad of ['', 'yesterday', 'now-', 'now-5y', 'now+1h', 'now/y', '20 Sep 2026', '2026-13-45']) {
      expect(isValidTime(bad), bad).toBe(false);
    }
    expect(isValidTimeZone('Europe/Budapest')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});

describe('resolveRange', () => {
  it('resolves both ends, or nothing when either is invalid', () => {
    expect(resolveRange({ from: 'now-1h', to: 'now' }, now, 'UTC')).toEqual({
      from: new Date(now - 3_600_000),
      to: new Date(now),
    });
    expect(resolveRange({ from: 'soon', to: 'now' }, now, 'UTC')).toBeUndefined();
  });
});

describe('resolveWidgetTime', () => {
  const dashboard: TimeRange = { from: 'now-24h', to: 'now' };
  const today = { mode: 'range', from: 'now/d', to: 'now' } as const;
  const lastWeek = { mode: 'shift', by: '1w' } as const;
  const yesterday = { mode: 'shift', by: '1d' } as const;

  it('inherits the dashboard range without overrides', () => {
    expect(resolveWidgetTime(dashboard)).toEqual({ range: dashboard, shifts: [] });
  });

  it("uses the widget's saved range or shift over the dashboard", () => {
    expect(resolveWidgetTime(dashboard, today)).toEqual({ range: { from: 'now/d', to: 'now' }, shifts: [] });
    expect(resolveWidgetTime(dashboard, lastWeek)).toEqual({ range: dashboard, shifts: ['1w'] });
  });

  it("puts the viewer's override over the saved one", () => {
    expect(resolveWidgetTime(dashboard, lastWeek, today)).toEqual({
      range: { from: 'now/d', to: 'now' },
      shifts: [],
    });
    expect(resolveWidgetTime(dashboard, today, yesterday)).toEqual({
      range: { from: 'now/d', to: 'now' },
      shifts: ['1d'],
    });
    expect(resolveWidgetTime(dashboard, undefined, today)).toEqual({
      range: { from: 'now/d', to: 'now' },
      shifts: [],
    });
  });

  it('adds a shift to a shift', () => {
    const time = resolveWidgetTime(dashboard, lastWeek, yesterday);
    expect(time).toEqual({ range: dashboard, shifts: ['1w', '1d'] });
    expect(resolveEffectiveTime({ ...time, timeZone: 'UTC' }, now)).toEqual({
      from: new Date(now - 9 * 86_400_000),
      to: new Date(now - 8 * 86_400_000),
    });
  });

  it('accepts only well-formed overrides', () => {
    expect(timeOverrideSchema.safeParse(today).success).toBe(true);
    expect(timeOverrideSchema.safeParse(lastWeek).success).toBe(true);
    expect(timeOverrideSchema.safeParse({ mode: 'shift', by: 'a week' }).success).toBe(false);
    expect(timeOverrideSchema.safeParse({ mode: 'range', from: 'soon', to: 'now' }).success).toBe(false);
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
