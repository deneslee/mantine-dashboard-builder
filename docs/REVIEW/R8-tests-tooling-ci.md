# R8: Tests, build and checks, CI

Part of the [R5 review](R5-codebase-overview.md), at `main` commit `2515b1e`. Covers the tests, `vitest.config.ts`, `lint/`, Storybook and `.github/`.

## In short

Testing is strong: tests sit beside their code, every story renders in Chromium with an accessibility check, play functions cover the edit flows, and `lint/rules.test.ts` proves each layer rule fires. CI runs lint, format, tests and the build on every pull request. The gaps are a few untested files and two pieces of setup that rely on people remembering.

## 5. DynamoDB queries have no tests; two form hooks only via stories

- `plugins/optional/aws/dynamodbRuntime.ts` (101 lines) has no test. Athena, Aurora, Redshift, BigQuery, Firestore, Azure SQL and MongoDB all have one.
- `features/datasources/useConnectionForm.ts` (184 lines: splitting secrets from settings, the vault steps, the connection test) is exercised only through the Data sources page stories.
- `features/dashboards/data/useWidgetData.ts` has no test of its own (see [R6 #3](R6-app-shell-features.md#3-a-widget-can-show-the-previous-querys-data-after-its-queries-change)).

AGENTS.md asks for a unit test for every function with branching logic in datasource plugins, and a `renderHook` test for hooks with real logic.

**Look at:** a DynamoDB runtime test like `sqlRuntimes.test.ts` (parameters, items to frame, time fields), and hook tests for the vault steps and the kept-frames rule.

## 6. The Node test list is kept by hand

`vitest.config.ts` lists the tests that run in plain Node (`NODE_TESTS`); every other test runs in jsdom. A new pure-logic test outside the listed folders, such as a new `ui/components` helper, silently runs in jsdom: slower, and able to pass while touching the DOM it shouldn't.

**Look at:** deciding by folder or by a file-name convention, so the list can't fall behind, or a test that fails when a jsdom-run test imports nothing from React.

## 7. CI actions are pinned by tag, not by commit

`.github/workflows/github-pages.yaml` uses `actions/checkout@v7`, `voidzero-dev/setup-vp@v1.21.2`, `actions/configure-pages@v6` and `actions/upload-pages-artifact@v5`. A tag can be moved to other code. The repo already hardens its npm supply chain (`minimumReleaseAge`, `allowBuilds`), so the workflow is the remaining open door, and the job has the Sentry auth token.

**Look at:** pinning each action to a commit SHA with the version in a comment. Renovate can keep those up to date.

## Checked and fine

- **The toolchain test** (`lint/toolchain.test.ts`) catches a Vite+ and Vitest version mismatch after an update.
- **The docs link test** (`lint/docs.test.ts`) keeps relative links in the docs working; these review files follow it.
- **Source maps** go to Sentry only from `main`, and are never published to GitHub Pages.
- **Renovate** groups packages that move together, and waits 3 days before proposing a release, which is longer than pnpm's 1-day quarantine.
