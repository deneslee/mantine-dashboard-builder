import { describe, expect, it, vi } from 'vite-plus/test';
import { BUILD_TARGET_KEY, defaultBuildTarget, saveBuildTarget } from './buildTarget';

const storage = (value: string | null) => ({
  getItem: (key: string) => (key === BUILD_TARGET_KEY ? value : null),
});

describe('defaultBuildTarget', () => {
  it('takes the repository the build came from, then the one last used here', () => {
    expect(defaultBuildTarget({ repository: 'deneslee/site', branch: 'release' }, storage(null))).toEqual({
      repository: 'deneslee/site',
      branch: 'release',
    });
    expect(defaultBuildTarget({ repository: 'deneslee/site' }, storage(null)).branch).toBe('main');
    expect(
      defaultBuildTarget({}, storage('{"version":1,"repository":"deneslee/fork","branch":"pages"}')),
    ).toEqual({ repository: 'deneslee/fork', branch: 'pages' });
  });

  it('starts empty when nothing usable is saved', () => {
    for (const saved of [
      null,
      'not json',
      '{"version":1,"repository":"no-slash","branch":"main"}',
      '{"repository":"a/b"}',
    ])
      expect(defaultBuildTarget({}, storage(saved)), String(saved)).toEqual({
        repository: '',
        branch: 'main',
      });
  });
});

describe('saveBuildTarget', () => {
  it('saves the target with a version, and shrugs off storage that throws', () => {
    const setItem = vi.fn();
    saveBuildTarget({ repository: 'deneslee/site', branch: 'main' }, { setItem });
    expect(setItem).toHaveBeenCalledWith(
      BUILD_TARGET_KEY,
      '{"version":1,"repository":"deneslee/site","branch":"main"}',
    );
    expect(() =>
      saveBuildTarget(
        { repository: 'deneslee/site', branch: 'main' },
        {
          setItem: () => {
            throw new DOMException('QuotaExceededError');
          },
        },
      ),
    ).not.toThrow();
  });
});
