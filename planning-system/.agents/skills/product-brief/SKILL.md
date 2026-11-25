---
name: product-brief
description: Rules for docs/PRODUCT.md, the short non-technical description of the product. Use before you write or change it, or when a capability is added, built or dropped.
---

# Product brief

## Sections (fixed, from `template.md`)

- Purpose: what the product is, in 1–3 lines.
- Users: who uses it, and for what.
- Capabilities: grouped; each line ends with `built`, `planned` or `idea`.
- Goals: what success looks like.
- Out of scope: what the product will not do.
- Terms: one line per product word that has one meaning (for example "connection").

## Rules

- A reader with no technical knowledge must understand every line.
- No library, framework, file, package or code names. Those belong in decisions.
- A capability is what a user can do, not how it is built.
- `built` only when checked in the running app or the code.
- Lists only. Max 60 lines without frontmatter.
- Frontmatter `status`: `draft` or `current`. Only the user sets `current`.
