---
name: decision-log
description: Record implementation decisions to .ai/decisions/decisions.md. Default to append; if updating an existing decision, require explicit user confirmation first. Max 10 lines per entry.
user-invocable: true
---

Purpose

Record important implementation decisions.

Selection Standard

Bias toward not writing. A decision belongs here only when leaving it undocumented would make a future task or bug exploration materially more likely to choose the wrong path.

Record only durable constraints such as:

* project invariants that will likely constrain future work
* rejected alternatives someone could plausibly retry later
* externally forced choices such as compatibility, compliance, vendor, or performance limits
* intentional behavior that looks incorrect unless explained

Do not record:

* one-off implementation details
* local cleanup notes or TODOs
* temporary workarounds that are not yet accepted long-term behavior
* facts already made obvious by code, tests, or tooling
* constraints that disappeared after later simplification or optimization

If unsure, skip the entry.

Save Location

.ai/decisions/decisions.md

Append Format

## YYYY-MM-DD

### Problem

What issue was encountered.

### Decision

What was chosen.

### Reason

Why this choice was made.

### Alternatives Considered

What alternatives were rejected.

Requirements

* Maximum 10 lines per decision
* Default to append
* Prefer fewer, harder decisions over broad coverage
* One decision should capture one durable constraint, not a mixed summary
* If a new entry appears to revise, merge with, or supersede an existing decision, do not edit or append yet
* Instead, show the relevant prior entry, explain the overlap or conflict, and ask the user whether to append, revise, merge, supersede, or skip
* Only modify an existing entry after explicit user confirmation
* Keep concise
