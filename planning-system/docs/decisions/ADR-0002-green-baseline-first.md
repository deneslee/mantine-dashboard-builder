---
id: ADR-0002
title: Green baseline before the moves
status: proposed
date: 2026-11-24
milestone: M2
supersedes: null
was: D-01
---

## Question

- Fix the red tests and the lint cache before any folder move? This changes the order in ADR-0001 A-10

## Evidence

- R6 (measured), R5, R2

## Options

- (a) Baseline first, then moves
- (b) Keep A-10; fix tests in the tests milestone

## Recommendation

- Research: (a). A move can only be shown to keep behaviour if the checks pass before it

## Decision

- Not decided

## Blocks

- Milestone order (M3 before M4)
