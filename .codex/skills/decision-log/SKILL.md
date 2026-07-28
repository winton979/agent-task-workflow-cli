---
name: decision-log
description: Record durable decisions with scope and lifecycle metadata. Require explicit user confirmation before changing an existing decision.
user-invocable: true
---

Purpose

Record approved stable project constraints. Do not record bug lessons, personal learning, or per-task implementation history.

Workspace Context

Before reading or writing any .ai path, determine the workflow state root. Managed skills are discovered from the launch root, but a launch-root workspace.yaml may declare context_repository. When it does:

1. Resolve that repository ID from the launch-root workspace.yaml, honoring launch-root workspace.local.yaml when present.
2. Verify that its resolved directory exists and is a Git repository root. If it is missing or invalid, stop and report the configuration error; never fall back to a launch-root .ai directory.
3. Treat the selected repository as the workflow state root. Read its workspace.yaml and workspace.local.yaml for the business repository map, and resolve every .ai path in this skill from that directory.

Without context_repository, the launch root remains the workflow state root and its workspace manifest is the repository map.

Retain the resulting absolute canonical directory as `workflowStateRoot`. Every .ai read, write, move, or delete must use an absolute path below `<workflowStateRoot>/.ai`. Never use a relative `.ai/...` path, infer the state root from the current command directory, or choose an existing .ai directory in a nested or registered repository.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Treat repositories whose resolved disabled flag is true as unavailable for routine development in the current cycle. Do not select, inspect, index, or include them in a working set unless the user explicitly asks about that repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Changing the command directory never changes `workflowStateRoot`. Do not assume a workflow-state-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

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
