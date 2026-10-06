import { describe, expect, it } from 'vitest';
import { formatRange, formatShift } from './formatRange';

describe('formatRange', () => {
  it('names a preset, and shows the ends of anything else', () => {
    expect(formatRange({ from: 'now/d', to: 'now' })).toBe('Today');
    expect(formatRange({ from: 'now-3h', to: 'now-1h' })).toBe('now-3h – now-1h');
  });

  it('words a shift, in the plural from two', () => {
    expect(formatShift('1w')).toBe('1 week earlier');
    expect(formatShift('4w')).toBe('4 weeks earlier');
    expect(formatShift('12h')).toBe('12 hours earlier');
  });
});
