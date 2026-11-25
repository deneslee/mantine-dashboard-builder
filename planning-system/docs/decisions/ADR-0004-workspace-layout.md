---
id: ADR-0004
title: Target workspace layout
status: proposed
date: 2026-11-24
milestone: M2
supersedes: null
was: D-03
---

## Question

- Is the target `apps/{web,relay}` plus `packages/*`, reached by moving the apps first and extracting packages after?

## Evidence

- R2

## Options

- (a) Apps first (`apps/web`, `apps/relay`, Convex as a package), then shared code into `packages/*`
- (b) Apps only, no shared packages yet
- (c) Keep the single-package layout

## Recommendation

- Research: (a)

## Decision

- Not decided

## Blocks

- M4
