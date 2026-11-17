import { IconInfoCircle } from '@tabler/icons-react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { PageTabEntry } from '../ContextTab';
import { createPageTabStore } from './createPageTabStore';

const entry = (id: string): PageTabEntry => ({
  id,
  label: id,
  icon: IconInfoCircle,
  host: document.createElement('div'),
});

describe('createPageTabStore', () => {
  it('register adds in order and notifies', () => {
    const store = createPageTabStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const e1 = entry('a');
    const e2 = entry('b');
    store.register(e1);
    store.register(e2);
    expect(store.getSnapshot()).toEqual([e1, e2]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps the snapshot identity until a change', () => {
    const store = createPageTabStore();
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    store.register(entry('a'));
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
  });

  it('removes by identity and only once', () => {
    const store = createPageTabStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const off = store.register(entry('a'));
    off();
    off();
    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createPageTabStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.register(entry('a'));
    expect(listener).not.toHaveBeenCalled();
  });
});
