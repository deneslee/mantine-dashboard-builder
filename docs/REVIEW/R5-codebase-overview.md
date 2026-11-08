# R5: Whole codebase review

Reviewed Nov 8, 2026, at `main` commit [`2515b1e`](https://github.com/deneslee/mantine-dashboard-builder/tree/2515b1e). Read-only: the code, the Floorplan map of it, and the library sources where a finding depends on them. Nothing was installed, run or built.

| File                                | Covers                                       |
| ----------------------------------- | -------------------------------------------- |
| R5 (this file)                      | The short verdict, every finding, the order  |
| [R6](R6-app-shell-features.md)      | App, frame, screens, design system           |
| [R7](R7-data-plugins-relay.md)      | Core, plugins, services, the relay, security |
| [R8](R8-tests-tooling-ci.md)        | Tests, build and checks, CI                  |
| [R4](R4-typescript-and-packages.md) | TypeScript configs and packages (earlier)    |

## In short

The codebase is clean and deliberate: about 17,000 lines of product code with 76 test files and 15 story files beside them, no `any` outside generated code, no TODOs, no inline styles and no direct `localStorage` keys outside the storage helper. The layer rules hold, and the security-sensitive parts (vault, relay) are the best-written code here.

One real bug: **saving Sentry settings a second time throws**, because the SDK allows only one Replay recorder per page. The rest is small: one widget data edge case, a few untested files, and housekeeping that fits work already planned.

**In plain words:** the app is built carefully and the dangerous parts are well protected. One settings button can break, a chart can briefly show old data after its query changes, and a few pieces have no automatic checks yet.

## Findings

Score = (impact + risk) × (6 − effort), each from 1 to 5. Higher means do it sooner.

| #   | Finding                                                              | Where | Score |
| --- | -------------------------------------------------------------------- | ----- | ----- |
| 1   | Saving Sentry settings twice throws                                  | R7    | 35    |
| 2   | Integrations load the Sentry SDK past its single entry point         | R7    | 20    |
| 3   | A widget can show the previous query's data after its queries change | R6    | 20    |
| 4   | Sentry settings are read from storage without a schema               | R7    | 20    |
| 5   | DynamoDB queries have no tests; two form hooks only via stories      | R8    | 20    |
| 6   | The Node test list is kept by hand                                   | R8    | 16    |
| 7   | CI actions are pinned by tag, not by commit                          | R8    | 16    |
| 8   | The dashboard page re-renders on every address change                | R6    | 12    |
| 9   | Drafts rewrite the whole dashboard twice on every edit               | R7    | 12    |
| 10  | The relay can close a connection pool that's still in use            | R7    | 12    |
| 11  | The app's crash screen doesn't cover the providers                   | R6    | 10    |
| 12  | Older files break the naming rules (`types.ts`)                      | R6    | 10    |
| 13  | Large components to split when next touched                          | R6    | 8     |

R4's findings stand alongside these. R4 #4 (mixed version styles) is corrected there: Renovate's `rangeStrategy: 'bump'` makes the mix deliberate.

**False alarms from the Floorplan health check:** the "secret keys" are a fake AWS key in two test files and the PEM header pattern in `googleAuth.ts`. The "unused file" is `routes/dashboards/$id.tsx`, which the generated route tree loads. The "endpoints without a login check" are route groups the scanner read as server endpoints.

## Order of work

1. **Now, small fixes:** #1 (create the Replay recorder once), #4, #11, and R4's quick ones (test globals, Node types, engine rules).
2. **With the data restructure you paused the builder for:** #3, #8 and #9. They're about the same things: what a widget shows while it loads, re-rendering and storage writes.
3. **With the packages phase (P1):** R4's base tsconfig and `core` package, plus #6.
4. **When Sentry's plan 06 starts:** #2 and the rest of `features/integrations`.
5. **Ongoing:** #5, #7, #10, #12, #13, when the files are touched.

These are directions, not decisions: each gets its specifics when it's picked up.
