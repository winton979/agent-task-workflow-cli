---
name: decision-sweep-weekly
description: Weekly sweep of recent task and bug briefs to decide which deserve a decision-log entry. Proposes entries for confirmation before appending.
user-invocable: true
---

Purpose

Batch-review the past week of work and sediment only the decisions that outlive a single task. Replaces per-task reminders with one weekly pass.

When to Run

Run once per week, ideally on Friday. May also run ad-hoc after a busy stretch.

Workflow

1. Scan briefs created in the last 7 days under .ai/tasks/archive/ and .ai/bugs/archive/. Filter by filename date prefix YYYY-MM-DD. If a brief lacks a date prefix, fall back to filesystem mtime.
2. For cancelled briefs in either archive, treat the abandonment itself as potential decision material.
3. Evaluate each brief against the Sediment Conditions below.
4. For each candidate, draft a decision entry using the four-section format.
5. Bias toward skip. Produce a draft only when the decision is clearly durable and likely to matter again.
6. Present a single review list: every scanned brief with a verdict (write / skip / insufficient info), then the proposed drafts grouped at the end.
7. For every skip, give a short reason such as one-off detail, already encoded in code, no future constraint, or still unsettled.
8. Do NOT append anything yet. Wait for the user to confirm which drafts to keep, edit, or drop.
9. If a proposed draft appears to overlap with, conflict with, or refine an existing decision, include that prior entry in the review and present explicit options such as append as new, revise existing, merge, supersede, or skip.
10. Only after confirmation, apply the approved action for each draft. Default to appending new entries oldest first under the matching YYYY-MM-DD section heading; revise or merge only when the user explicitly selects that action.
11. Report what was appended, revised, merged, superseded, and skipped.

Sediment Conditions

A brief becomes a decision entry if it satisfies any of:

* Cross-task impact: the choice constrains how future tasks must be written.
* A concrete alternative was rejected and someone could plausibly pick it later.
* Counter-intuitive choice: code reads like an anti-pattern but is intentional.
* Externally driven: compliance, performance, compatibility, or a third-party API limit forced the call.
* A cancelled attempt whose failure is itself a useful conclusion.
* Without the note, a future explore step would likely need to rediscover the same constraint.

Skip Conditions

* Affects only the implementation detail of one task.
* A temporary or unsettled conclusion.
* A bare fact with no decision behind it.
* Already obvious from code, tests, tooling, or existing project structure.
* A constraint that was later simplified away, optimized away, or otherwise stopped mattering.
* Too vague to guide a future task.

Entry Format

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
* One date section per day; multiple decisions on the same day stack under the same heading
* Never edit, merge, supersede, or delete prior entries without explicit user confirmation
