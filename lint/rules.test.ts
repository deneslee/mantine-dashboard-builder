import { execFileSync } from 'node:child_process';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

/** The token rules must fire, or `pnpm lint` passing proves nothing (plan-03 §5). */
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
    let json = '';
    try {
      execFileSync(
        process.execPath,
        ['node_modules/oxlint/bin/oxlint', '--no-ignore', '-f', 'json', 'lint/fixtures/raw-style-props.tsx'],
        { encoding: 'utf8' },
      );
    } catch (e) {
      // oxlint exits non-zero when it finds errors, which is what this test expects.
      json = (e as { stdout: string }).stdout;
    }
    const { diagnostics } = JSON.parse(json) as {
      diagnostics: { code: string; severity: string; message: string }[];
    };
    const raw = diagnostics.filter((d) => d.code === 'app(no-raw-style-props)');
    expect(raw.every((d) => d.severity === 'error')).toBe(true);
    expect(raw.map((d) => d.message.match(/for `(\w+)`/)?.[1])).toEqual(['gap', 'c', 'fw', 'size', 'stroke']);
    expect(
      diagnostics.some((d) => d.code === 'eslint(no-restricted-imports)' && d.severity === 'error'),
    ).toBe(true);
  });
});
