---
id: ADR-0013
title: Keep "add to build"
status: open
date: 2026-11-24
milestone: M6
supersedes: null
was: D-12
---

## Question

- The live site can commit `plugins.json` with a GitHub token and rebuild (G-030). Keep it, or ship every datasource type in every build?

## Evidence

- R4. Every type in every build: +6.1 kB gzip (measured)

## Options

- Four alternatives, listed in R4

## Recommendation

- Research: drop the flow, ship every type

## Decision

- Not decided

## Blocks

- Plugin tasks; how path-coupled the M4 moves are
