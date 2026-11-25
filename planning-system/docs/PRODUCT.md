---
title: Dashboard Builder
status: draft
updated: 2026-11-24
---

# Dashboard Builder

## Purpose

- A web app to build dashboards from your own data, without code
- Other apps can use it as their dashboard part (for example rhb-cdss)

## Users

- People who build dashboards: pick data, add charts and tables, arrange them
- People who view dashboards
- Several users; each works alone, no live editing together

## Capabilities

### Dashboards

- Build a dashboard on a grid: add, move and resize widgets: built
- Undo and redo while editing: built
- Charts and tables as widgets: built
- Start from a template: built (check)
- Explore data before building: built (check)

### Data

- Connect to data: files, sample data, company databases and cloud data services: built
- Test a connection before saving it: built
- Keep passwords and keys in this browser only: built (open: ADR-0018)

### Saving

- Save work in this browser or on a shared server; the user picks the place: built
- Sign in, with work kept per user: planned

### Other tools

- Visual node editor for flows and graphs: built
- Error reporting when a problem occurs: built (optional)

## Goals

- A new user builds a first dashboard in minutes
- The app works with no server; a server adds sharing and sign-in
- New data types and widgets can be added without changes to the core

## Out of scope

- Live editing by several users at the same time

## Terms

- Dashboard: a page of widgets on a grid
- Widget: one chart, table or other block on a dashboard
- Connection: saved access to one data place (open: ADR-0019)
- Storage: where your work is saved (open: ADR-0019)
