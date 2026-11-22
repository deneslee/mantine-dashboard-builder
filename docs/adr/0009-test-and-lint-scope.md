# ADR-0009: Test and lint scope

**Date**: 2026-11-22
**Status**: proposed
**Deciders**: you (not decided yet)

|              |                                                            |
| ------------ | ---------------------------------------------------------- |
| **Phase**    | [P5](../restructure/phases/P5-tooling.md)                  |
| **Blocks**   | the tooling and tests phases.                              |
| **Research** | [tests-lint-ci](../restructure/research/tests-lint-ci.md). |

`proposed` means **not decided**. Only you change the status to `accepted`. Until then, nothing below is a decision.

## Context

- Pick each test's environment by file extension?
- Cut the change-detector tests, `rules.test.ts`, `docs.test.ts` and `toolchain.test.ts`?
- Which lint rule set?
- Do any design-token rules stay, as warnings?
- Do `no-explicit-any` and `ban-ts-comment` stay?

## Decision

Not decided.

**Recommendation (research):** correctness, hooks, Compiler rules and type checking. Drop the style rules. Environment by extension.

## Alternatives Considered

Not listed yet. See the research above.

## Consequences

Written when the decision is accepted.
