import { expect, it } from 'vitest';

type DurationCase = {
  baselineMs: number;
  prototypeMs: number;
  targetImprovementPercent: number;
};

const propertyCaseCount = 128;
const decisionThresholdPercent = 40;
const boundaryImprovementPercents = [39.949, 39.951, 39.999, 40, 40.001, 40.049, 40.051];

function evaluateScriptingImprovement(baselineMs: number, prototypeMs: number) {
  const improvementPercent = ((baselineMs - prototypeMs) / baselineMs) * 100;

  return {
    improvementPercent,
    displayPercent: Number(improvementPercent.toFixed(1)),
    meetsThreshold: improvementPercent >= decisionThresholdPercent,
  };
}

function generateDurationCases(count: number): DurationCase[] {
  let state = 0x85eb_ca6b;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };

  return Array.from({ length: count }, (_, index) => {
    const baselineMs = (1 + (next() % 1_000_000)) / 1_000;
    const targetImprovementPercent =
      boundaryImprovementPercents[index] ?? ((next() % 300_001) - 200_000) / 1_000;
    const prototypeMs = baselineMs * (1 - targetImprovementPercent / 100);

    return { baselineMs, prototypeMs, targetImprovementPercent };
  });
}

/** Validates: Requirements 1.7 */
it('Feature: shell-performance-remaining-tasks, Property 2: Scripting improvement uses the baseline denominator', () => {
  const cases = generateDurationCases(propertyCaseCount);
  expect(cases).toHaveLength(propertyCaseCount);

  for (const { baselineMs, prototypeMs, targetImprovementPercent } of cases) {
    expect(baselineMs).toBeGreaterThan(0);
    expect(prototypeMs).toBeGreaterThanOrEqual(0);

    const result = evaluateScriptingImprovement(baselineMs, prototypeMs);
    const baselineNormalizedImprovement = (1 - prototypeMs / baselineMs) * 100;

    expect(result.improvementPercent).toBeCloseTo(baselineNormalizedImprovement, 10);
    expect(result.improvementPercent).toBeCloseTo(targetImprovementPercent, 10);
    expect(result.meetsThreshold).toBe(result.improvementPercent >= decisionThresholdPercent);
    expect(result.displayPercent).toBe(Number(result.improvementPercent.toFixed(1)));
  }

  const roundedUpBelowThreshold = evaluateScriptingImprovement(100, 60.001);
  expect(roundedUpBelowThreshold.improvementPercent).toBeLessThan(decisionThresholdPercent);
  expect(roundedUpBelowThreshold.displayPercent).toBe(decisionThresholdPercent);
  expect(roundedUpBelowThreshold.meetsThreshold).toBe(false);

  const roundedDownAboveThreshold = evaluateScriptingImprovement(100, 59.999);
  expect(roundedDownAboveThreshold.improvementPercent).toBeGreaterThan(decisionThresholdPercent);
  expect(roundedDownAboveThreshold.displayPercent).toBe(decisionThresholdPercent);
  expect(roundedDownAboveThreshold.meetsThreshold).toBe(true);
});
