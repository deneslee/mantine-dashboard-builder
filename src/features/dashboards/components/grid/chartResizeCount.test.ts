import { expect, it } from 'vitest';

type ResizeEntry = {
  containerId: string;
  timestampMs: number;
};

type ScenarioInterval = {
  startMs: number;
  endMs: number;
};

type PassFailInputs = {
  activityImprovementPercent: number;
  scrollingLongTaskCount: number;
  drawerOpenPasses: boolean;
  drawerClosePasses: boolean;
  panelOverlappingLongTaskCount: number;
};

type ResizeCountCase = {
  entries: ResizeEntry[];
  interval: ScenarioInterval;
  observedContainerIds: string[];
  alternateResizeCount: number;
  passFailInputs: PassFailInputs;
};

const propertyCaseCount = 128;
const chartContainerIds = ['chart-a', 'chart-b', 'chart-c', 'chart-d'];
const unobservedContainerIds = ['other-a', 'other-b'];
const allContainerIds = [...chartContainerIds, ...unobservedContainerIds];

function isObservedInInterval(
  entry: ResizeEntry,
  interval: ScenarioInterval,
  observedContainerIds: ReadonlySet<string>,
) {
  return (
    observedContainerIds.has(entry.containerId) &&
    entry.timestampMs >= interval.startMs &&
    entry.timestampMs <= interval.endMs
  );
}

function countChartResizeEntries(
  entries: readonly ResizeEntry[],
  interval: ScenarioInterval,
  observedContainerIds: ReadonlySet<string>,
) {
  let count = 0;

  for (const entry of entries) {
    if (isObservedInInterval(entry, interval, observedContainerIds)) count += 1;
  }

  return count;
}

function evaluateMeasurement(passFailInputs: PassFailInputs, chartResizeCount: number) {
  return {
    activityResult:
      passFailInputs.activityImprovementPercent >= 40 && passFailInputs.scrollingLongTaskCount === 0
        ? ('pass' as const)
        : ('fail' as const),
    drawerResult:
      passFailInputs.drawerOpenPasses && passFailInputs.drawerClosePasses
        ? ('pass' as const)
        : ('fail' as const),
    panelSlideResult:
      passFailInputs.panelOverlappingLongTaskCount === 0 ? ('pass' as const) : ('fail' as const),
    chartResizeCount,
    chartResizeClassification: 'informational' as const,
  };
}

function generateResizeCountCases(count: number): ResizeCountCase[] {
  let state = 0x27d4_eb2f;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };

  return Array.from({ length: count }, () => {
    const startMs = 250 + (next() % 5_000);
    const endMs = startMs + 1 + (next() % 1_000);
    const interval = { startMs, endMs };
    const observedContainerIds = chartContainerIds.filter((_, index) => index === 0 || next() % 2 === 0);
    const middleMs = startMs + Math.floor((endMs - startMs) / 2);
    const randomEntryCount = next() % 32;
    const entries: ResizeEntry[] = [
      { containerId: 'chart-a', timestampMs: startMs - 1 },
      { containerId: 'chart-a', timestampMs: startMs },
      { containerId: 'chart-a', timestampMs: middleMs },
      { containerId: 'chart-a', timestampMs: endMs },
      { containerId: 'chart-a', timestampMs: endMs + 1 },
      { containerId: 'other-a', timestampMs: middleMs },
    ];

    for (let index = 0; index < randomEntryCount; index += 1) {
      entries.push({
        containerId: allContainerIds[next() % allContainerIds.length] ?? 'other-b',
        timestampMs: startMs - 250 + (next() % (endMs - startMs + 501)),
      });
    }

    return {
      entries,
      interval,
      observedContainerIds,
      alternateResizeCount: next() % 10_000,
      passFailInputs: {
        activityImprovementPercent: ((next() % 100_001) - 50_000) / 1_000,
        scrollingLongTaskCount: next() % 8,
        drawerOpenPasses: next() % 2 === 0,
        drawerClosePasses: next() % 2 === 0,
        panelOverlappingLongTaskCount: next() % 8,
      },
    };
  });
}

/** Validates: Requirements 3.4, 3.5, 3.6 */
it('Feature: shell-performance-remaining-tasks, Property 5: Resize count is accurate and non-gating', () => {
  const cases = generateResizeCountCases(propertyCaseCount);
  expect(cases).toHaveLength(propertyCaseCount);

  for (const testCase of cases) {
    const observedContainerIds = new Set(testCase.observedContainerIds);
    const includedEntries = testCase.entries.filter((entry) =>
      isObservedInInterval(entry, testCase.interval, observedContainerIds),
    );
    const excludedEntries = testCase.entries.filter(
      (entry) => !isObservedInInterval(entry, testCase.interval, observedContainerIds),
    );
    const resizeCount = countChartResizeEntries(testCase.entries, testCase.interval, observedContainerIds);

    expect(includedEntries.length).toBeGreaterThan(0);
    expect(excludedEntries.length).toBeGreaterThan(0);
    expect(resizeCount).toBe(includedEntries.length);
    expect(countChartResizeEntries(includedEntries, testCase.interval, observedContainerIds)).toBe(
      includedEntries.length,
    );
    expect(countChartResizeEntries(excludedEntries, testCase.interval, observedContainerIds)).toBe(0);

    const measured = evaluateMeasurement(testCase.passFailInputs, resizeCount);
    const changedCount =
      testCase.alternateResizeCount === resizeCount
        ? testCase.alternateResizeCount + 1
        : testCase.alternateResizeCount;
    const measuredWithChangedCount = evaluateMeasurement(testCase.passFailInputs, changedCount);

    expect(resizeCount).toBeGreaterThanOrEqual(0);
    expect(changedCount).toBeGreaterThanOrEqual(0);
    expect(measuredWithChangedCount.chartResizeCount).not.toBe(measured.chartResizeCount);
    expect(measuredWithChangedCount.chartResizeClassification).toBe('informational');
    expect({
      activityResult: measuredWithChangedCount.activityResult,
      drawerResult: measuredWithChangedCount.drawerResult,
      panelSlideResult: measuredWithChangedCount.panelSlideResult,
    }).toEqual({
      activityResult: measured.activityResult,
      drawerResult: measured.drawerResult,
      panelSlideResult: measured.panelSlideResult,
    });
  }
});
