---
name: decision-log
description: Record durable decisions with scope and lifecycle metadata. Require explicit user confirmation before changing an existing decision.
user-invocable: true
---

Purpose

Record approved stable project constraints. Do not record bug lessons, personal learning, or per-task implementation history.

Workflow

1. Decide whether the candidate meets the Selection Standard. Reject it if it is only a bug lesson, common engineering practice, or one-task implementation detail.
2. Draft a concise entry using the Entry Format and inspect related existing decisions.
3. Show the draft and any overlap, conflict, or supersession to the user.
4. Do NOT create or modify an entry yet. Wait for explicit user confirmation.
5. After confirmation, append the approved new entry or apply only the approved change to an existing entry.

Selection Standard

Bias toward not writing. A decision belongs here only when it is a stable constraint and leaving it undocumented would make a future task or bug exploration materially more likely to choose the wrong path. Potential usefulness, historical interest, or "might help someday" is insufficient.

Future-choice test: before drafting, name the specific future implementation, exploration, compatibility, or boundary choice this entry would change. If no concrete future choice can be named, skip the entry.

Bug count, task count, or review pain is not a selection criterion. A bug may be evidence for a decision, but the bug lesson itself is not the decision. Repeated bugs should usually produce tests, lint rules, code simplification, or one consolidated constraint; they must not produce entries proportional to incident count.

Record only durable constraints such as:

* project invariants that will likely constrain future work
* rejected alternatives someone could plausibly retry later
* externally forced choices such as compatibility, compliance, vendor, or performance limits
* intentional behavior that looks incorrect unless explained

Do not record:

* bug lessons, postmortem notes, or reminders to be more careful
* one-off implementation details
* local cleanup notes or TODOs
* common engineering practices already implied by the codebase, tests, or toolchain
* temporary workarounds that are not yet accepted long-term behavior
* facts already made obvious by code, tests, or tooling
* entries kept only because they may be useful someday
* constraints that disappeared after later simplification or optimization

If unsure, skip the entry.

Save Location

.ai/decisions/decisions.md

Entry Format

## DEC-YYYYMMDD-descriptive-slug

Status: active
Scope: auth, api
Applies when: all supported configurations
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

* Use a stable DEC-YYYYMMDD-descriptive-slug identifier for every new entry
* Status is active, superseded, or deprecated. Record only approved decisions; do not create drafts in this file
* Scope uses concise, stable project-area terms. Use global only when a decision genuinely applies across the project
* Applies when distinguishes versions, environments, clients, or other conditions when Scope alone is insufficient
* Supersedes and Superseded by name a prior or successor DEC identifier, or - when there is none
* Maximum 14 nonblank lines per decision
* After confirmation, default to appending a new active entry
* Prefer fewer, harder decisions over broad coverage
* One decision should capture one durable constraint, not a mixed summary
* Do not create separate entries for repeated symptoms when one underlying constraint covers them
* A zero-entry outcome is acceptable when no candidate passes the Selection Standard
* If a new entry appears to revise, merge with, or supersede an existing decision, do not edit or append yet
* Instead, show the relevant prior entry, explain the overlap or conflict, and ask the user whether to append, revise, merge, supersede, or skip
* After explicit confirmation to supersede, append the new active entry and update the prior entry's Status to superseded and Superseded by reference
* If two active entries overlap and conflict, stop and ask the user to resolve, narrow Applies when, or supersede one; never choose automatically
* Only modify an existing entry after explicit user confirmation
* Legacy date-based entries remain valid historical context. Do not bulk-migrate them without a user request
* Keep concise
