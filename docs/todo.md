1. Require the build check before merging into main, so a red update can't land by accident.
2. After Oct 24, 03:40 UTC, remove the toolchain entries from minimumReleaseAgeExclude in pnpm-workspace.yaml. Renovate's 3-day wait makes them unnecessary. This is in the plan.
