---
name: decision-sweep-weekly
description: Weekly sweep of recent task and bug briefs to propose durable decision entries with lifecycle metadata.
user-invocable: true
---

Purpose

Batch-review the past week of work and sediment only stable constraints that outlive a single task. Replaces per-task reminders and bug lessons with one weekly pass that should usually skip most briefs. A sweep that proposes no new decisions is a valid successful outcome.

When to Run

Run once per week, ideally on Friday. May also run ad-hoc after a busy stretch.

Workflow

1. Scan briefs created in the last 7 days under .ai/tasks/archive/ and .ai/bugs/archive/. Filter by filename date prefix YYYY-MM-DD. If a brief lacks a date prefix, fall back to filesystem mtime.
2. For cancelled briefs in either archive, treat the abandonment itself as potential decision material.
3. Group related briefs by the underlying constraint or trade-off before drafting. Repeated symptoms are evidence, not separate decisions.
4. Evaluate each brief or group against the Sediment Conditions below.
5. For each candidate, draft a decision entry using the lifecycle metadata format.
6. Bias toward skip. Produce a draft only when the decision is clearly durable and likely to change a concrete future choice.
7. Present a single review list: every scanned brief with a verdict (write / skip / insufficient info), then the proposed drafts grouped at the end.
8. For every skip, give a short reason such as bug lesson, common practice, one-off detail, already encoded in code, no future constraint, or still unsettled.
9. Do NOT append anything yet. Wait for the user to confirm which drafts to keep, edit, or drop.
10. If a proposed draft appears to overlap with, conflict with, or refine an existing decision, include that prior entry in the review and present explicit options such as append as new, revise existing, merge, supersede, or skip.
11. Only after confirmation, apply the approved action for each draft. Default to appending new active DEC entries oldest first; revise, merge, supersede, deprecate, or remove only when the user explicitly selects that action.
12. Report what was appended, revised, merged, superseded, and skipped.

Sediment Conditions

A brief or related group becomes a decision entry only if it contains a stable constraint, passes the future-choice test, and satisfies any of:

* Cross-task impact: the choice constrains how future tasks must be written.
* A concrete alternative was rejected and someone could plausibly pick it later.
* Counter-intuitive choice: code reads like an anti-pattern but is intentional.
* Externally driven: compliance, performance, compatibility, or a third-party API limit forced the call.
* A cancelled attempt whose failure proves a reusable constraint, not merely that one approach was poorly executed.
* Without the note, a future explore step would likely need to rediscover the same constraint.

Skip Conditions

* Affects only the implementation detail of one task.
* Captures a bug lesson, postmortem reminder, or ordinary mistake instead of a project constraint.
* A temporary or unsettled conclusion.
* A bare fact with no decision behind it.
* Common engineering knowledge or standard practice.
* Already obvious from code, tests, tooling, or existing project structure.
* Kept only because it might be useful someday.
* A constraint that was later simplified away, optimized away, or otherwise stopped mattering.
* Too vague to guide a future task.

Entry Format

## DEC-YYYYMMDD-descriptive-slug

Status: active
Scope: concise project areas
Applies when: all supported configurations or a concrete condition
Supersedes: -
Superseded by: -

### Problem

What issue was encountered.

### Decision

What was chosen.

### Reason

Why this choice was made.

### Alternatives Considered

What alternatives were rejected.

Requirements

* Maximum 14 nonblank lines per decision
* Default to appending new active entries
* Use a stable DEC-YYYYMMDD-descriptive-slug identifier for every new entry
* Decision growth must be non-linear with task and bug volume; many related briefs should collapse to one durable constraint or be skipped
* Prefer zero drafts over weak drafts
* When superseding, update the prior entry to Status: superseded and name its successor only after explicit user confirmation
* If active entries conflict, propose a resolution, a narrower Applies when condition, or supersession; never choose automatically
* Legacy date-based entries remain valid. Do not bulk-migrate them without a user request
* Never edit, merge, supersede, deprecate, or delete prior entries without explicit user confirmation
