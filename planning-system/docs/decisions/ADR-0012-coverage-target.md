---
id: ADR-0012
title: Coverage target
status: open
date: 2026-11-24
milestone: M2
supersedes: null
was: D-11
---

## Question

- Adopt ECC's 80 % coverage target?

## Evidence

- ECC `orch-*` and `tdd` skills default to 80 % (R8)
- ADR-0001 A-11: shrink the suite

## Options

- (a) 80 % on changed code
- (b) No number: every changed behaviour has a test
- (c) No target

## Recommendation

- Claude: (b). Tell ECC commands to skip the 80 % gate

## Decision

- Not decided

## Blocks

- The first `orch-*` run
