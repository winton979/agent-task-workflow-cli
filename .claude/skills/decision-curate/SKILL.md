---
name: decision-curate
description: Audit .ai/decisions/decisions.md and propose removing, merging, or tightening stale, duplicate, or low-value entries. Only apply changes after explicit user confirmation.
user-invocable: true
---

Purpose

Keep .ai/decisions/decisions.md narrow enough that future exploration can find stable constraints quickly and trace historical changes only when needed. Prune assertively; the file is a curated constraint set, not a complete memory.

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

1. Read .ai/decisions/decisions.md.
2. Inspect the current codebase only as needed to judge whether each decision still represents a live constraint.
3. Classify each entry as keep active, tighten, supersede, deprecate, merge, or remove.
4. Bias toward removal or merge when an entry is stale, duplicate, too local, too vague, common knowledge, a bug lesson, kept for possible future value, or no longer changes future implementation choices. Preserve a concise superseded entry only when it explains an active decision's lineage.
5. When evidence does not show that an entry changes a concrete future choice, classify it as remove, merge, deprecate, or tighten; do not keep it by default.
6. Present a review list with every entry, its classification, and a short reason.
7. Flag every pair of active entries whose Scope and Applies when conditions overlap but whose decisions conflict. Propose a resolution, a narrower applicability condition, or supersession.
8. When proposing tighten, supersede, deprecate, merge, or remove, quote or summarize the exact affected entry so the user can approve safely.
9. Do NOT modify the file yet. Wait for explicit user confirmation on each proposed change set.
10. After confirmation, apply only the approved edits and preserve unrelated entries.
11. Summarize what was kept active, tightened, superseded, deprecated, merged, removed, and why.

Retention Standard

Keep an active entry only if it still acts as a durable project constraint or explains an intentional choice a future task could otherwise get wrong. It must change a future choice, not merely remind developers to avoid a past mistake. Possible future usefulness is not enough. Keep a superseded entry only when its link to an active successor explains material history.

Removal Candidates

* one-off implementation details
* bug lessons, postmortem notes, or reminders to be careful
* common engineering practices
* decisions already enforced clearly by code, tests, or tooling
* duplicate or near-duplicate entries
* vague notes that do not change future choices
* entries preserved for possible future usefulness rather than a concrete future choice
* constraints invalidated by later refactors, simplifications, or performance work
* historical context that belongs in task or bug archives instead
* active entries with no Scope, no applicable condition where one is needed, or a conflict with another active entry

Requirements

* Default to proposing, not editing
* Never remove or rewrite an entry without explicit user confirmation
* Prefer deleting or merging low-value entries over rewriting them into longer prose
* Do not keep an entry merely because removal feels risky; state the risk and propose the smallest removal, merge, or narrowing that preserves any real constraint
* Do not automatically add metadata to legacy entries; propose targeted migration only when it materially improves retrieval
* Keep the remaining file concise and high-signal
