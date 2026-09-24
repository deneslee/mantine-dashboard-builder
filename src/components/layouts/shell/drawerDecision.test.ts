import { expect, it } from 'vitest';

type DrawerDirection = 'open' | 'close';
type DrawerDecision = 'retain' | 'change-and-repeat';

type DrawerDecisionCase = {
  openPasses: boolean;
  closePasses: boolean;
};

type DrawerDecisionResult = {
  decision: DrawerDecision;
  directionsToRepeat: DrawerDirection[];
};

const propertyCaseCount = 128;
const directionCombinations: DrawerDecisionCase[] = [
  { openPasses: false, closePasses: false },
  { openPasses: false, closePasses: true },
  { openPasses: true, closePasses: false },
  { openPasses: true, closePasses: true },
];

function evaluateDrawerDecision({ openPasses, closePasses }: DrawerDecisionCase): DrawerDecisionResult {
  const directionsToRepeat: DrawerDirection[] = [];

  if (!openPasses) directionsToRepeat.push('open');
  if (!closePasses) directionsToRepeat.push('close');

  return {
    decision: directionsToRepeat.length === 0 ? 'retain' : 'change-and-repeat',
    directionsToRepeat,
  };
}

function generateDrawerDecisionCases(count: number): DrawerDecisionCase[] {
  return Array.from(
    { length: count },
    (_, index) => directionCombinations[index % directionCombinations.length]!,
  );
}

/** Validates: Requirements 2.5, 2.6 */
it('Feature: shell-performance-remaining-tasks, Property 4: Drawer decision requires both directions', () => {
  const cases = generateDrawerDecisionCases(propertyCaseCount);
  expect(cases).toHaveLength(propertyCaseCount);
  expect(new Set(cases.map(({ openPasses, closePasses }) => `${openPasses}:${closePasses}`))).toEqual(
    new Set(['false:false', 'false:true', 'true:false', 'true:true']),
  );

  for (const testCase of cases) {
    const { openPasses, closePasses } = testCase;
    const result = evaluateDrawerDecision(testCase);
    const shouldRetain = openPasses && closePasses;

    expect(result.decision === 'retain').toBe(shouldRetain);
    expect(result.decision).toBe(shouldRetain ? 'retain' : 'change-and-repeat');
    expect(result.directionsToRepeat).toEqual([
      ...(openPasses ? [] : ['open' as const]),
      ...(closePasses ? [] : ['close' as const]),
    ]);
    expect(result.directionsToRepeat.includes('open')).toBe(!openPasses);
    expect(result.directionsToRepeat.includes('close')).toBe(!closePasses);
  }
});
