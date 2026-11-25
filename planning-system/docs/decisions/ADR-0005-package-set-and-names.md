---
id: ADR-0005
title: Package set and names
status: open
date: 2026-11-24
milestone: M2
supersedes: null
was: D-04
---

## Question

- Which packages exist, and what are they called?
- `domain` or `core`?
- Plugin contracts in `plugins`, or a package of their own?
- Relay wire contract in `domain`, or separate?
- `packages/plugins` as one package, or one per kind?
- Where do `src/utils` and `core/build` go?

## Evidence

- R2, R3

## Options

- (a) `domain`, `ui`, `plugins`, `convex`
- (b) (a) plus `shell`, `platform`, `plugin-api`, `relay-contract`

## Recommendation

- Research: R2 and R3 disagree. Settle in T8

## Decision

- Not decided

## Blocks

- Package extraction (M4)
