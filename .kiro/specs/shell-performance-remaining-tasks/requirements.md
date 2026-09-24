# Requirements Document

## Introduction

This document defines the remaining shell performance verification work from the three unchecked items in Plan 01 task `task-r01-02.md`: evaluating React Activity for far dashboard tiles, verifying instant Drawer transitions under the application reduced-motion setting, and measuring panel-slide and breakpoint-crossing behavior. Completed Plan 01 tasks are excluded. The work uses representative controlled traces from the production build of `/dashboards/perf`, records measurements and decisions in `docs/grid-and-charts.md`, and does not prescribe implementation changes except for the conditional React Activity and Drawer decisions stated below.

## Glossary

- **Dashboard Shell**: The application shell and dashboard canvas displayed by the production build at `/dashboards/perf`.
- **Performance Evaluator**: The verification process that captures traces, calculates measurements, applies acceptance thresholds, and records results.
- **Controlled Production Trace**: One representative browser performance recording captured from the production build of `/dashboards/perf` while the application window remains in the foreground and only the named scenario action is performed.
- **Baseline Configuration**: The Dashboard Shell without React Activity prototype behavior for far tiles.
- **React Activity Prototype**: A temporary evaluation configuration that hides far tile content with React Activity while preserving the existing tile performance measures.
- **First-Mount Latch**: The existing behavior that first mounts tile content when the tile enters a 200-pixel margin around the viewport and keeps the content mounted afterward.
- **Content Visibility Measure**: The existing `content-visibility: auto` behavior applied to dashboard tiles.
- **Far-Tile Visibility Margin**: A visibility boundary separate from the First-Mount Latch, configured between 1.8 and 2.2 times the current viewport height beyond each vertical viewport edge.
- **Far Tile**: A dashboard tile located outside the Far-Tile Visibility Margin.
- **Widget Skeleton**: The existing loading placeholder matching the widget kind rendered by a dashboard tile.
- **Width-Change Scenario**: A controlled action that produces one dashboard canvas width change.
- **Scripting Time**: Browser-reported scripting duration attributable to the Width-Change Scenario inside a Controlled Production Trace.
- **Scripting-Time Improvement**: The Baseline Configuration Scripting Time minus the React Activity Prototype Scripting Time, divided by the Baseline Configuration Scripting Time, expressed as a percentage.
- **Scrolling Scenario**: A controlled scroll through the dashboard tiles while the React Activity Prototype is active.
- **Long Task**: A browser main-thread task with a duration greater than 50 milliseconds.
- **Activity Decision**: A `go` decision that retains the React Activity Prototype or a `no-go` decision that restores the Baseline Configuration.
- **Application Motion Setting**: The application preference named `motion`, with `reduce` selecting reduced motion.
- **OS Reduced Motion**: The operating-system reduced-motion preference exposed to the browser.
- **Drawer Open Scenario**: A controlled action that opens one closed Mantine Drawer.
- **Drawer Close Scenario**: A controlled action that closes one open Mantine Drawer.
- **Instant Drawer Transition**: A Drawer state change with a configured transition duration of 0 milliseconds and no animated intermediate frame.
- **Panel Slide Scenario**: One Dashboard Shell panel toggle that executes the 180-millisecond panel animation.
- **Animation Interval**: The time from the start through the end of the 180-millisecond Panel Slide Scenario animation.
- **Breakpoint-Crossing Scenario**: One context-bar toggle that changes the dashboard canvas width across a grid breakpoint.
- **Chart Resize Count**: The number of resize events observed for chart containers during one Breakpoint-Crossing Scenario.
- **Measurement Record**: The measured values and decisions stored in the `Measured` content of `docs/grid-and-charts.md`.

## Requirements

### Requirement 1: Evaluate React Activity for far tiles

**User Story:** As a performance engineer, I want to compare the React Activity prototype with the current far-tile behavior, so that the Dashboard Shell retains the prototype only when width-change scripting improves without introducing scrolling long tasks.

#### Acceptance Criteria

1. THE React Activity Prototype SHALL preserve the First-Mount Latch.
2. THE React Activity Prototype SHALL preserve the Content Visibility Measure.
3. THE React Activity Prototype SHALL use the Far-Tile Visibility Margin independently from the First-Mount Latch margin.
4. WHILE a Far Tile is hidden by the React Activity Prototype, THE Dashboard Shell SHALL display the matching Widget Skeleton in the tile.
5. WHEN the Performance Evaluator runs the Width-Change Scenario, THE Performance Evaluator SHALL capture one Controlled Production Trace for the Baseline Configuration and one Controlled Production Trace for the React Activity Prototype under equivalent scenario conditions.
6. WHEN the Performance Evaluator runs the Scrolling Scenario, THE Performance Evaluator SHALL capture one Controlled Production Trace for the React Activity Prototype.
7. WHEN both Width-Change Scenario traces are available, THE Performance Evaluator SHALL calculate the Scripting-Time Improvement.
8. IF the Scripting-Time Improvement is at least 40 percent and the Scrolling Scenario trace contains zero Long Tasks, THEN THE Performance Evaluator SHALL retain the React Activity Prototype as the Activity Decision.
9. IF the Scripting-Time Improvement is less than 40 percent or the Scrolling Scenario trace contains at least one Long Task, THEN THE Performance Evaluator SHALL restore all React Activity Prototype code to the Baseline Configuration.
10. IF the Scripting-Time Improvement is less than 40 percent or the Scrolling Scenario trace contains at least one Long Task, THEN THE Performance Evaluator SHALL classify the Activity Decision as `no-go`.
11. WHEN the Activity Decision is complete, THE Performance Evaluator SHALL add the baseline Scripting Time, prototype Scripting Time, Scripting-Time Improvement, scrolling Long Task result, and Activity Decision to the Measurement Record.

### Requirement 2: Verify instant Drawer transitions

**User Story:** As a user who selects reduced motion in the application, I want Drawer open and close actions to complete instantly even when operating-system reduced motion is disabled, so that the application preference controls Drawer motion.

#### Acceptance Criteria

1. WHERE the Application Motion Setting is `reduce` and OS Reduced Motion is disabled, WHEN the Performance Evaluator runs the Drawer Open Scenario, THE Performance Evaluator SHALL capture one Controlled Production Trace for the Drawer Open Scenario.
2. WHERE the Application Motion Setting is `reduce` and OS Reduced Motion is disabled, WHEN the Performance Evaluator runs the Drawer Close Scenario, THE Performance Evaluator SHALL capture one Controlled Production Trace for the Drawer Close Scenario.
3. WHERE the Application Motion Setting is `reduce` and OS Reduced Motion is disabled, WHEN the Drawer Open Scenario occurs, THE Dashboard Shell SHALL satisfy the Instant Drawer Transition criterion.
4. WHERE the Application Motion Setting is `reduce` and OS Reduced Motion is disabled, WHEN the Drawer Close Scenario occurs, THE Dashboard Shell SHALL satisfy the Instant Drawer Transition criterion.
5. IF the Drawer Open Scenario or Drawer Close Scenario fails the Instant Drawer Transition criterion, THEN THE Performance Evaluator SHALL require a Drawer transition implementation change before repeating the failed scenario.
6. IF the Drawer Open Scenario and Drawer Close Scenario satisfy the Instant Drawer Transition criterion, THEN THE Performance Evaluator SHALL retain the existing Drawer transition implementation.
7. WHEN both Drawer scenarios have been evaluated, THE Performance Evaluator SHALL add both transition results and the retain-or-change decision to the Measurement Record.

### Requirement 3: Measure panel slide and breakpoint crossing

**User Story:** As a performance engineer, I want production measurements for panel animation and breakpoint-crossing chart resize behavior, so that animation responsiveness is verified and resize behavior is documented without an unsupported limit.

#### Acceptance Criteria

1. WHEN the Performance Evaluator runs the Panel Slide Scenario, THE Performance Evaluator SHALL capture one Controlled Production Trace containing the complete Animation Interval.
2. WHILE the Panel Slide Scenario is inside the Animation Interval, THE Dashboard Shell SHALL execute with zero Long Tasks overlapping the Animation Interval.
3. WHEN the Performance Evaluator runs the Breakpoint-Crossing Scenario, THE Performance Evaluator SHALL capture one Controlled Production Trace containing the complete context-bar toggle.
4. WHEN the Breakpoint-Crossing Scenario trace is complete, THE Performance Evaluator SHALL calculate the Chart Resize Count.
5. THE Performance Evaluator SHALL classify the Chart Resize Count as informational.
6. THE Performance Evaluator SHALL exclude the Chart Resize Count from pass-or-fail criteria.
7. WHEN both measurement scenarios are complete, THE Performance Evaluator SHALL add the panel-slide Long Task result and Chart Resize Count to the Measurement Record.
