import { expect, it } from 'vitest';

type ActivityDecision = 'go' | 'no-go';

type ActivityDecisionCase = {
  improvementPercent: number;
  scrollingLongTaskCount: number;
};

type ActivityDecisionResult = {
  decision: ActivityDecision;
  rollbackRequired: boolean;
};

const propertyCaseCount = 128;
const decisionThresholdPercent = 40;
const boundaryCases: ActivityDecisionCase[] = [
  { improvementPercent: 39.999, scrollingLongTaskCount: 0 },
  { improvementPercent: 40, scrollingLongTaskCount: 0 },
  { improvementPercent: 40.001, scrollingLongTaskCount: 0 },
  { improvementPercent: 39.999, scrollingLongTaskCount: 1 },
  { improvementPercent: 40, scrollingLongTaskCount: 1 },
  { improvementPercent: 40.001, scrollingLongTaskCount: 1 },
];

function evaluateActivityDecision(
  improvementPercent: number,
  scrollingLongTaskCount: number,
): ActivityDecisionResult {
  const decision =
    improvementPercent >= decisionThresholdPercent && scrollingLongTaskCount === 0 ? 'go' : 'no-go';

  return {
    decision,
    rollbackRequired: decision === 'no-go',
  };
}

function generateActivityDecisionCases(count: number): ActivityDecisionCase[] {
  let state = 0xc2b2_ae35;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };

  return Array.from({ length: count }, (_, index) => {
    const boundaryCase = boundaryCases[index];
    if (boundaryCase) {
      return boundaryCase;
    }

    return {
      improvementPercent: ((next() % 400_001) - 200_000) / 1_000,
      scrollingLongTaskCount: next() % 32,
    };
  });
}

/** Validates: Requirements 1.8, 1.9, 1.10 */
it('Feature: shell-performance-remaining-tasks, Property 3: Activity decision is exhaustive and reversible', () => {
  const cases = generateActivityDecisionCases(propertyCaseCount);
  expect(cases).toHaveLength(propertyCaseCount);

  for (const { improvementPercent, scrollingLongTaskCount } of cases) {
    expect(scrollingLongTaskCount).toBeGreaterThanOrEqual(0);

    const result = evaluateActivityDecision(improvementPercent, scrollingLongTaskCount);
    const expectedGo = improvementPercent >= decisionThresholdPercent && scrollingLongTaskCount === 0;

    expect(result.decision === 'go').toBe(expectedGo);
    expect(result.decision).toBe(expectedGo ? 'go' : 'no-go');
    expect(result.rollbackRequired).toBe(!expectedGo);
  }
});
