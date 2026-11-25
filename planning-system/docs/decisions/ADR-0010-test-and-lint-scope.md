---
id: ADR-0010
title: Test and lint scope
status: open
date: 2026-11-24
milestone: M5
supersedes: null
was: D-09
---

## Question

- Pick each test's environment by file extension?
- Cut the change-detector tests, `rules.test.ts`, `docs.test.ts`, `toolchain.test.ts`?
- Which lint rule set? Do design-token rules stay as warnings?
- Do `no-explicit-any` and `ban-ts-comment` stay?

## Evidence

- R6

## Recommendation

- Research: correctness, hooks, Compiler rules and type checking. Drop style rules. Environment by extension

## Decision

- Not decided

## Blocks

- M5, M8
