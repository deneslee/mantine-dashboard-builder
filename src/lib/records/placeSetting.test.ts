import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { getPlaceSetting, setPlaceSetting } from './placeSetting';

beforeEach(() => localStorage.clear());

describe('placeSetting', () => {
  it('reads nothing as an empty string', () => {
    expect(getPlaceSetting('convex')).toBe('');
  });

  it('saves a value per place and clears it with an empty one', () => {
    expect(setPlaceSetting('convex', 'https://x.convex.cloud')).toEqual({ ok: true });
    expect(getPlaceSetting('convex')).toBe('https://x.convex.cloud');
    expect(getPlaceSetting('other')).toBe('');
    setPlaceSetting('convex', '');
    expect(getPlaceSetting('convex')).toBe('');
  });

  it('reads a damaged value as empty', () => {
    localStorage.setItem('dashboard-builder:place-settings', '{oops');
    expect(getPlaceSetting('convex')).toBe('');
  });
});
