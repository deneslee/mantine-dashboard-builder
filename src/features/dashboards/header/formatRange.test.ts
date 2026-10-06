import { describe, expect, it } from 'vitest';
import { formatRange, formatShift } from './formatRange';

describe('formatRange', () => {
  it('names a preset, and shows the ends of anything else', () => {
    expect(formatRange({ from: 'now/d', to: 'now' }, 'UTC')).toBe('Today');
    expect(formatRange({ from: 'now-3h', to: 'now-1h' }, 'UTC')).toBe('now-3h – now-1h');
  });

  it('shows dates in the time zone', () => {
    const range = { from: '2026-09-20T04:00:00.000Z', to: '2026-09-27T03:59:59.999Z' };
    expect(formatRange(range, 'America/New_York')).toBe('20 Sep 2026 – 26 Sep 2026');
    expect(formatRange(range, 'UTC')).toBe('20 Sep 2026 – 27 Sep 2026');
  });

  it('words a shift, in the plural from two', () => {
    expect(formatShift('1w')).toBe('1 week earlier');
    expect(formatShift('4w')).toBe('4 weeks earlier');
    expect(formatShift('12h')).toBe('12 hours earlier');
  });
});
