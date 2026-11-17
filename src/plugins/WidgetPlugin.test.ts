import { describe, expect, it, vi } from 'vite-plus/test';
import { z } from 'zod';
import { defineWidget, lazyWidget, listWidgetMeta, loadWithRetry, LOAD_ATTEMPTS } from './WidgetPlugin';

const NO_WAIT = { delayMs: () => 0 };
const Component = () => null;

const widget = (
  load: () => Promise<{ default: () => null }>,
  editorLoad?: () => Promise<{ default: () => null }>,
) =>
  defineWidget({
    type: 't',
    name: 'T',
    description: 'd',
    icon: () => null,
    defaultSize: { w: 1, h: 1 },
    isTimeAware: false,
    queryTypes: 'any',
    optionsSchema: z.object({}),
    component: lazyWidget(load),
    optionsEditor: editorLoad && lazyWidget(editorLoad),
    skeleton: null,
  });

describe('widget metadata', () => {
  it('listing metadata never loads code', () => {
    const load = vi.fn(async () => ({ default: Component }));
    const editorLoad = vi.fn(async () => ({ default: Component }));
    const list = listWidgetMeta({ t: widget(load, editorLoad) });
    expect(load).not.toHaveBeenCalled();
    expect(editorLoad).not.toHaveBeenCalled();
    expect(list).toEqual([
      {
        type: 't',
        name: 'T',
        description: 'd',
        icon: expect.any(Function),
        defaultSize: { w: 1, h: 1 },
        isTimeAware: false,
        queryTypes: 'any',
      },
    ]);
    const keys = Object.keys(list[0]!);
    for (const key of ['component', 'optionsEditor', 'skeleton', 'optionsSchema']) {
      expect(keys).not.toContain(key);
    }
  });

  it('a definition does not load its code until asked', () => {
    const load = vi.fn(async () => ({ default: Component }));
    lazyWidget(load);
    expect(load).not.toHaveBeenCalled();
  });
});

describe('loading widget code', () => {
  it('retries a failed load', async () => {
    const load = vi
      .fn<() => Promise<{ default: () => null }>>()
      .mockRejectedValueOnce(new Error('chunk'))
      .mockResolvedValue({ default: Component });
    await expect(lazyWidget(load, NO_WAIT).preload()).resolves.toEqual({ default: Component });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('gives up after the last try, and the next preload starts over', async () => {
    const error = new Error('chunk');
    const load = vi.fn(async (): Promise<{ default: () => null }> => {
      throw error;
    });
    const lazy = lazyWidget(load, NO_WAIT);
    await expect(lazy.preload()).rejects.toBe(error);
    expect(load).toHaveBeenCalledTimes(LOAD_ATTEMPTS);
    await expect(lazy.preload()).rejects.toBe(error);
    expect(load).toHaveBeenCalledTimes(2 * LOAD_ATTEMPTS);
  });

  it('shares one load between concurrent preloads', async () => {
    const load = vi.fn(async () => ({ default: Component }));
    const lazy = lazyWidget(load, NO_WAIT);
    await Promise.all([lazy.preload(), lazy.preload()]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('waits between tries', async () => {
    const delayMs = vi.fn(() => 0);
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValue('ok');
    await expect(loadWithRetry(load, { delayMs })).resolves.toBe('ok');
    expect(delayMs.mock.calls).toEqual([[1], [2]]);
  });
});
