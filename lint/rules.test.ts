import { execFileSync } from 'node:child_process';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  filename: string;
}

/** Runs oxlint on a fixture path. It exits non-zero on errors, which is what these tests expect. */
function oxlint(path: string): Diagnostic[] {
  let json = '';
  try {
    json = execFileSync(
      process.execPath,
      ['node_modules/oxlint/bin/oxlint', '--no-ignore', '-f', 'json', path],
      {
        encoding: 'utf8',
      },
    );
  } catch (e) {
    json = (e as { stdout: string }).stdout;
  }
  return (JSON.parse(json) as { diagnostics: Diagnostic[] }).diagnostics;
}

/** The token rules must fire, or `pnpm lint` passing proves nothing (docs/design-system.md). */
describe('token lint rules', () => {
  it('Stylelint reports raw colors, palette shades and raw values as errors', async () => {
    const { results } = await stylelint.lint({
      files: 'lint/fixtures/raw-values.css',
      configFile: '.stylelintrc.json',
    });
    const reported = results[0]?.warnings.map((w) => `${w.line} ${w.rule} ${w.severity}`);
    expect(reported).toEqual(
      expect.arrayContaining([
        '3 function-disallowed-list error',
        '4 declaration-property-value-disallowed-list error',
        '5 declaration-property-value-allowed-list error',
        '6 declaration-property-value-allowed-list error',
      ]),
    );
  });

  it('oxlint reports raw style props and primitives imports as errors', () => {
    const diagnostics = oxlint('lint/fixtures/raw-style-props.tsx');
    const raw = diagnostics.filter((d) => d.code === 'app(no-raw-style-props)');
    expect(raw.every((d) => d.severity === 'error')).toBe(true);
    expect(raw.map((d) => d.message.match(/for `(\w+)`/)?.[1])).toEqual(['gap', 'c', 'fw', 'size', 'stroke']);
    expect(
      diagnostics.some((d) => d.code === 'eslint(no-restricted-imports)' && d.severity === 'error'),
    ).toBe(true);
  });
});

/** Folder imports must follow the layers (AGENTS.md › Structure), or package-shaped folders are a wish. */
describe('layer lint rules', () => {
  it('reports every import that crosses a layer, and none of the allowed ones', () => {
    const counts: Record<string, number> = {};
    for (const d of oxlint('lint/fixtures/src')) {
      if (d.code !== 'eslint(no-restricted-imports)') continue;
      expect(d.severity).toBe('error');
      const file = d.filename.replaceAll('\\', '/').replace('lint/fixtures/src/', '');
      counts[file] = (counts[file] ?? 0) + 1;
    }
    // One per import line in each fixture; features/allowed.ts must not appear.
    expect(counts).toEqual({
      'utils/imports.ts': 1,
      'core/imports.ts': 5,
      'ui/imports.ts': 3,
      'lib/imports.ts': 2,
      'plugins/imports.ts': 2,
      'shell/imports.ts': 2,
      'features/imports.ts': 4,
      'app/imports.ts': 1,
    });
  });
});
