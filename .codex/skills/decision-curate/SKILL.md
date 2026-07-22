---
name: decision-curate
description: Audit .ai/decisions/decisions.md and propose removing, merging, or tightening stale, duplicate, or low-value entries. Only apply changes after explicit user confirmation.
user-invocable: true
---

Purpose

Keep .ai/decisions/decisions.md narrow enough that future exploration can find active constraints quickly and trace historical changes only when needed.

Workspace Context

When workspace.yaml exists at the workflow root, read its repository IDs, paths, and descriptions before investigating or changing code.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Do not assume a workflow-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Workflow

1. Read .ai/decisions/decisions.md.
2. Inspect the current codebase only as needed to judge whether each decision still represents a live constraint.
3. Classify each entry as keep active, tighten, supersede, deprecate, merge, or remove.
4. Bias toward removal when an entry is stale, duplicate, too local, too vague, or no longer changes future implementation choices. Preserve a concise superseded entry when it explains an active decision's lineage.
5. Present a review list with every entry, its classification, and a short reason.
6. Flag every pair of active entries whose Scope and Applies when conditions overlap but whose decisions conflict. Propose a resolution, a narrower applicability condition, or supersession.
7. When proposing tighten, supersede, deprecate, merge, or remove, quote or summarize the exact affected entry so the user can approve safely.
8. Do NOT modify the file yet. Wait for explicit user confirmation on each proposed change set.
9. After confirmation, apply only the approved edits and preserve unrelated entries.
10. Summarize what was kept active, tightened, superseded, deprecated, merged, removed, and why.

Retention Standard

Keep an active entry only if it still acts as a durable project constraint or explains an intentional choice a future task could otherwise get wrong. Keep a superseded entry only when its link to an active successor explains material history.

Removal Candidates

* one-off implementation details
* decisions already enforced clearly by code, tests, or tooling
* duplicate or near-duplicate entries
* vague notes that do not change future choices
* constraints invalidated by later refactors, simplifications, or performance work
* historical context that belongs in task or bug archives instead
* active entries with no Scope, no applicable condition where one is needed, or a conflict with another active entry

Requirements

* Default to proposing, not editing
* Never remove or rewrite an entry without explicit user confirmation
* Prefer deleting low-value entries over rewriting them into longer prose
* Do not automatically add metadata to legacy entries; propose targeted migration only when it materially improves retrieval
* Keep the remaining file concise and high-signal
