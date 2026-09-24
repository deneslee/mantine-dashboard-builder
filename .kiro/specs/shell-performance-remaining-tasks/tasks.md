# Implementation Plan: Shell Performance Remaining Tasks

## Overview

Complete only the three unfinished Plan 01 performance items: evaluate a reversible React Activity prototype for far dashboard tiles, verify reduced-motion Drawer transitions, and measure panel-slide and breakpoint-crossing behavior. Capture baseline evidence before changing Activity code, keep browser measurements separate from code work, apply the Activity go/no-go rule exactly, make Drawer changes only after a failed unchanged-implementation trace, and finish by recording evidence and validating the final source state.

## Tasks

- [x] 1. Capture the unchanged Activity baseline
  - [x] 1.1 **[Manual/browser measurement] Capture the baseline width-change trace before editing Activity code**
    - Preserve the current `WidgetTile.tsx` baseline and record the build commit, Chrome version, fixed viewport, device-pixel ratio, zoom, throttling, foreground state, warmed route state, panel direction, initial widths, and interval-selection method.
    - Build the production application, manually serve it with `pnpm preview`, and capture one controlled `/dashboards/perf` width-change trace that does not cross a grid breakpoint.
    - Record the baseline main-thread Scripting duration for the width-change work interval while excluding the preceding 180 ms panel animation; reject and recapture contaminated, incomplete, zero-scripting, or nonrepresentative evidence.
    - Do not modify `WidgetTile.tsx`, Drawer behavior, shell behavior, or documentation in this task.
    - _Requirements: 1.5, 1.7_

- [x] 2. Implement the reversible Activity experiment
  - [x] 2.1 **[Code] Add the isolated far-tile Activity prototype**
    - Modify `src/features/dashboards/components/grid/WidgetTile.tsx` to add a React 19 `Activity` boundary and a distinct far-visibility `useIntersection` observer using a vertical margin near `2 × viewportHeight` and independent from the existing `200px` first-mount observer.
    - Keep the first-mount latch monotonic, default an unavailable far-observer entry to visible, show the registry-selected skeleton beside hidden Activity content, and preserve the existing `WidgetBoundary`, `Suspense`, widget props, CSS containment, and `content-visibility` behavior.
    - Keep the experiment reversible: do not change DTOs, stores, persisted state, shared contracts, widget registry behavior, or CSS, and retain enough baseline information to restore the exact pre-prototype file.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 **[Automated property test] Verify monotonic first-mount state**
    - Add generated near/far intersection-event sequences to the focused `WidgetTile` test coverage, with at least 100 deterministic cases and no new runtime dependency.
    - **Property 1: First-mount state is monotonic**
    - **Validates: Requirements 1.1**

  - [x] 2.3 **[Automated component tests] Cover Activity observer and rendering behavior**
    - Use a controllable `IntersectionObserver` stub to verify separate `200px` and far-margin observers, no first mount from far events, permanent near-intersection latching, matching skeleton display while hidden, restoration of the same mounted widget state, and preserved error-boundary and Suspense behavior.
    - Keep prototype-only tests isolated so they can be removed completely if the final decision is `no-go`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Build and measure the Activity prototype
  - [x] 3.1 **[Code validation] Validate and build the prototype before browser capture**
    - Run the focused `WidgetTile` tests that apply to the prototype, TypeScript checking, and a production build; resolve source or test failures before taking measurements.
    - Use the resulting production build for both prototype traces and do not substitute the Vite development server.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [-] 3.2 **[Manual/browser measurement] Capture equivalent prototype width-change and scrolling traces**
    - Reproduce the baseline width-change scenario with the same Chrome version, viewport, panel, direction, initial widths, warm-up, action, and interval-selection rule, then record prototype Scripting duration.
    - With the prototype active, warm every tile's first-mount latch outside the trace, return to the top, wait for idle, and capture one continuous top-to-bottom-to-top scrolling trace.
    - Count main-thread tasks strictly greater than 50 ms in the scrolling interval and record both the count and longest duration; invalidate rather than edit around cold loading or unrelated work.
    - _Requirements: 1.5, 1.6_

  - [x] 3.3 **[Automated property test] Verify the scripting-improvement calculation**
    - Generate positive baseline and nonnegative prototype durations, including values around the 40% boundary, and verify that the baseline is always the denominator and display rounding never drives the decision value.
    - Use at least 100 deterministic cases in test-only code and add no runtime dependency.
    - **Property 2: Scripting improvement uses the baseline denominator**
    - **Validates: Requirements 1.7**

  - [x] 3.4 **[Automated property test] Verify the exhaustive Activity decision rule**
    - Generate improvement values and nonnegative long-task counts, including exact and adjacent threshold cases, and verify `go` occurs only for improvement `>= 40` with zero scrolling long tasks; every other case must produce `no-go` and the rollback requirement.
    - Use at least 100 deterministic cases in test-only code and add no runtime dependency.
    - **Property 3: Activity decision is exhaustive and reversible**
    - **Validates: Requirements 1.8, 1.9, 1.10**

- [x] 4. Apply the Activity go/no-go result
  - [x] 4.1 **[Code + measurement decision] Calculate the result and establish the final Activity source state**
    - Calculate `((baseline - prototype) / baseline) × 100` at full precision and apply `go` only when the improvement is at least 40% and the scrolling trace has zero tasks greater than 50 ms.
    - On `go`, retain the Activity prototype and its applicable tests. On `no-go`, restore the exact baseline `WidgetTile.tsx`, remove all prototype-only tests and helpers, and search the repository to confirm no Activity boundary, far observer, far-margin helper, or prototype-only code remains.
    - Keep the raw and one-decimal display values, scrolling count/longest duration, decision, and final source state ready for the single documentation update.
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 1.11_

- [x] 5. Verify reduced-motion Drawers before changing them
  - [-] 5.1 **[Manual/browser measurement] Capture unchanged Drawer open and close traces**
    - Use a production build below the shell `md` threshold with application `motion.v1` set to `reduce`, `<html data-motion="reduce">`, OS reduced motion disabled, and no browser reduced-motion emulation.
    - Confirm the resolved Drawer transition duration is `0 ms`, then capture separate controlled open and close traces with screenshots and inspect each for an animated intermediate frame.
    - If both directions are instant, retain the existing implementation without a Drawer source change. Keep both direction results and the provisional retain/change decision for documentation.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [-] 5.2 **[Conditional code + manual retest] Correct only failed Drawer directions**
    - If either unchanged trace fails, make the smallest central transition correction, preferring the `Drawer` default in `reducedMotionTheme`; use instance-level `transitionProps` in `Shell.tsx` only if Mantine does not consume the theme default.
    - Preserve focus trapping, return focus, overlay behavior, escape handling, unmount semantics, and both shell Drawer variants.
    - Add or update focused automated behavior coverage only when source changes, rebuild the production application, and recapture only each failed direction under the same controls until the final evidence satisfies the instant-transition criterion.
    - If both unchanged traces passed, complete this task by confirming no conditional source/test change was made.
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [x] 5.3 **[Automated property test] Verify that Drawer retention requires both directions**
    - Cover all open/close pass combinations in test-only decision logic and verify that retention occurs if and only if both directions pass, while every failed direction requires change-and-repeat.
    - Use the prescribed property-test naming and add no runtime dependency.
    - **Property 4: Drawer decision requires both directions**
    - **Validates: Requirements 2.5, 2.6**

- [x] 6. Measure panel animation and breakpoint crossing
  - [-] 6.1 **[Manual/browser measurement] Capture the complete panel-slide animation trace**
    - From the final production source state, use normal motion and one docked panel toggle that executes the 180 ms transition; capture the full interval from `transitionrun` or the first transition frame through `transitionend` or the settled frame.
    - Count every main-thread task strictly greater than 50 ms that overlaps the interval using the design's strict overlap rule, and record pass only when the overlap count is zero.
    - Keep accepted chart work beginning after the animation end separate from the panel-slide result.
    - _Requirements: 3.1, 3.2_

  - [-] 6.2 **[Manual/browser measurement] Capture and count breakpoint-crossing chart resizes**
    - Select a context-bar toggle that crosses exactly one configured `lg = 1100px` or `md = 640px` breakpoint and record the starting/ending canvas widths, breakpoint, and direction.
    - Attach temporary `ResizeObserver` instrumentation to every chart container, count one event per in-interval entry, and end after shell unlock, breakpoint commit, and two animation frames without another entry.
    - Record the total, observed chart count, and per-chart counts or min/max distribution. Keep the result explicitly informational and never use it to alter Activity, Drawer, or panel-slide pass/fail status.
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [x] 6.3 **[Automated property test] Verify resize-entry counting and non-gating behavior**
    - Generate timestamped mixed-container resize streams and scenario intervals, verify only observed in-interval entries are counted, and prove that changing any nonnegative resize count alone cannot change a pass/fail decision.
    - Use at least 100 deterministic cases in test-only code and add no runtime dependency.
    - **Property 5: Resize count is accurate and non-gating**
    - **Validates: Requirements 3.4, 3.5, 3.6**

- [x] 7. Record the evidence and close only satisfied Plan 01 items
  - [x] 7.1 **[Documentation code change] Update the measured performance and motion records**
    - Update only the relevant sections of `docs/grid-and-charts.md` with the measurement date/environment, baseline and prototype scripting times, unrounded and one-decimal improvement, scrolling long-task count and longest duration, Activity decision/final source state, Drawer open/close duration and intermediate-frame results, final Drawer decision/rerun note, panel-slide overlap count/result, and complete breakpoint resize details.
    - Preserve completed Plan 01 history and the accepted post-animation chart-reflow note. Label resize counts `informational—not pass/fail` and do not invent a maximum.
    - _Requirements: 1.11, 2.7, 3.7_

  - [x] 7.2 **[Planning-file code change] Mark only Plan 01 tasks whose done conditions are proven**
    - Update `.agents/plan/tasks/task-r01-02.md` only after reviewing each existing unchecked item's own done condition against the final traces, source state, and documentation.
    - Mark the Activity item complete only when numbers and go/no-go are documented and no-go rollback is complete; mark the Drawer item complete only when final open behavior is instant under application-reduce/OS-off controls (with close evidence also preserved by this spec); mark the panel/breakpoint item complete only when both measured cells are filled.
    - Leave any unsatisfied item unchecked and do not modify completed Plan 01 checkboxes or unrelated plan/task files.
    - _Requirements: 1.11, 2.7, 3.7_

- [x] 8. Validate the final repository state
  - [x] 8.1 **[Automated validation] Run targeted and full checks against the retained or restored implementation**
    - Run relevant focused tests first, including `WidgetTile`, Providers/motion, and Shell tests when their source paths changed, then run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
    - Fix failures without broadening scope, rerun affected checks, and ensure the validated build matches the final Activity and Drawer decisions documented in `docs/grid-and-charts.md`.
    - For Activity `no-go`, validate after complete restoration; for Activity `go`, validate with the retained prototype and tests.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8, 1.9, 2.3, 2.4, 2.5, 2.6, 3.2, 3.6_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks labeled **Manual/browser measurement** require human-operated Chrome DevTools traces against a production build; they are evidence-gathering tasks, not application-code implementation.
- Tasks labeled **Code**, **Documentation code change**, or **Planning-file code change** modify checked-in files. Conditional Drawer code changes occur only after failed unchanged-implementation evidence.
- Tasks marked with `*` are optional automated test tasks and can be skipped for a faster measurement pass; each listed property remains individually traceable to the design.
- Baseline evidence must exist before Activity edits. Prototype evidence must be equivalent to baseline evidence. The final Activity source must contain either the complete retained prototype or the exact restored baseline—never a partial experiment.
- Browser traces are not replaced by automated tests. Resize counts remain informational and non-gating at every stage.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["3.2"] },
    { "id": 6, "tasks": ["3.3"] },
    { "id": 7, "tasks": ["3.4"] },
    { "id": 8, "tasks": ["4.1"] },
    { "id": 9, "tasks": ["5.1"] },
    { "id": 10, "tasks": ["5.2"] },
    { "id": 11, "tasks": ["5.3"] },
    { "id": 12, "tasks": ["6.1", "6.2"] },
    { "id": 13, "tasks": ["6.3"] },
    { "id": 14, "tasks": ["7.1", "7.2"] },
    { "id": 15, "tasks": ["8.1"] }
  ]
}
```
