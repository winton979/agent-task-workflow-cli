---
name: decision-curate
description: Audit .ai/decisions/decisions.md and propose removing, merging, or tightening stale, duplicate, or low-value entries. Only apply changes after explicit user confirmation.
user-invocable: true
---

Purpose

Keep .ai/decisions/decisions.md narrow enough that future explore steps can read it quickly and trust that every surviving entry still matters.

Workflow

1. Read .ai/decisions/decisions.md.
2. Inspect the current codebase only as needed to judge whether each decision still represents a live constraint.
3. Classify each entry as keep, tighten, merge, or remove.
4. Bias toward removal when an entry is stale, duplicate, too local, too vague, or no longer changes future implementation choices.
5. Present a review list with every entry, its classification, and a short reason.
6. When proposing tighten, merge, or remove, quote or summarize the exact affected entry so the user can approve safely.
7. Do NOT modify the file yet. Wait for explicit user confirmation on each proposed change set.
8. After confirmation, apply only the approved edits and preserve unrelated entries.
9. Summarize what was kept, tightened, merged, removed, and why.

Retention Standard

Keep an entry only if it still acts as a durable project constraint or explains an intentional choice a future task could otherwise get wrong.

Removal Candidates

* one-off implementation details
* decisions already enforced clearly by code, tests, or tooling
* duplicate or near-duplicate entries
* vague notes that do not change future choices
* constraints invalidated by later refactors, simplifications, or performance work
* historical context that belongs in task or bug archives instead

Requirements

* Default to proposing, not editing
* Never remove or rewrite an entry without explicit user confirmation
* Prefer deleting low-value entries over rewriting them into longer prose
* Keep the remaining file concise and high-signal
