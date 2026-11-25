---
id: ADR-0007
title: Boundary and layer rules after the move
status: open
date: 2026-11-24
milestone: M5
supersedes: null
was: D-06
---

## Question

- Re-key the `layer()` lint rules to new paths, or replace them with package boundaries?
- Which lint-enforced rules stay?

## Evidence

- R6, R9 (engineering rules)

## Options

- (a) Re-key `layer()`
- (b) Package dependencies plus a few `no-restricted-imports` rules
- (c) `eslint-plugin-boundaries`

## Recommendation

- Research: (b), then (c) only if needed

## Decision

- Not decided

## Blocks

- M5
