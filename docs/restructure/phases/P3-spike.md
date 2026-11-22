# P3: Spike (throwaway branch)

|                     |                                                       |
| ------------------- | ----------------------------------------------------- |
| **Status**          | not started                                           |
| **Goal**            | Answer the unverified items before moving code        |
| **Needs decisions** | [ADR-0003](../../adr/0003-target-workspace-layout.md) |
| **Candidate gaps**  | none                                                  |

The candidate gaps are known problems this phase could fix. They are not a commitment; the scope is confirmed when the phase starts.

## Spike items

Each item gets a yes or no. A "no" reopens ADR-0003 or ADR-0004.

- type-aware lint (tsgolint) across workspace packages;
- wildcard `exports` across mixed `.ts` and `.tsx` files;
- Convex bundling a TS-source workspace package;
- PostCSS and Mantine CSS from a linked package;
- the Vitest drive-letter path on Windows;
- whether excluding `docs/**` from the cache inputs fixes the lint cache miss.

## Steps

Steps are written when this phase is next. Each step gets a spec in [../specs/](../specs/README.md), named `P3-<step>.md`, and is run per [../workflow.md](../workflow.md).

| Step | Spec | Status |
| ---- | ---- | ------ |
| —    | —    | —      |
