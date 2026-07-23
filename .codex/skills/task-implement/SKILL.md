---
name: task-implement
description: Implement a selected active task brief and validate it. Archive automatically when complete.
user-invocable: true
---

Purpose

Implement the intended task from .ai/tasks/active/.

Workspace Context

When workspace.yaml exists at the workflow root, read its repository IDs, paths, and descriptions before investigating or changing code. Also read workspace.local.yaml when present; its repository paths override the shared paths on the current machine.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Do not assume a workflow-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Rules

1. Identify the intended brief in .ai/tasks/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.
2. Read the selected brief and inspect the relevant current code before planning.
3. Validate the result before reporting the work complete.
4. If the work is complete, archive the selected brief automatically by moving it to .ai/tasks/archive/.

Optional Plan Handoff

When the immediately preceding conversation includes a completed task-plan result, reuse its recommended approach and the user's explicit choices only after rechecking the selected brief, current facts, and active decisions. Treat them as implementation preferences, not as a replacement for these rules or authorization to change the accepted contract. Direct execution does not require a plan.

Brief Sufficiency

Before planning or changing code, and whenever planning or implementation reveals an ambiguity, determine whether the selected brief remains executable against the current project state.

* Investigate facts available from the repository or environment instead of asking the user.
* Treat the brief as the confirmed desired contract and current code, tests, configuration, and direct observations as the source of current behavior. A difference between current behavior and the brief's Goal or Acceptance Criteria is normally the work to implement; surface a conflict only when current facts contradict the brief's recorded Context or Constraints.
* Use optional working_set metadata as an initial investigation scope, not a whitelist. Expand it when evidence requires.
* For a local, reversible implementation choice that does not materially affect behavior, scope, compatibility, security, data, or acceptance, follow existing conventions and choose the simplest option.
* Do not infer an unresolved user decision that materially affects those concerns. Ask one focused question at a time, include a recommended answer, and wait.
* If relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation.
* If clarification materially changes the Goal, accepted scope, or Acceptance Criteria, or the unresolved decisions collectively require material contract revision, stop and require renewed task-explore. Do not continue against an outdated brief.
* If current project state materially contradicts the brief's context, surface the conflict and resolve it under the same rules.

When implementation expands the working set, record the reason in the selected active brief's Context or Revisions. After explicit confirmation of a narrow clarification, record its date, exact change, and reason under Revisions in the selected active brief before continuing implementation.

Current Decision Check

Before planning or changing code, inspect .ai/decisions/decisions.md when it contains real entries:

* revalidate every decision identifier named in brief metadata
* extract only active decisions whose Scope and Applies when fields materially constrain the current work; use legacy entries without metadata under the same narrow relevance test
* if a referenced decision is inactive, missing, or contradicted by a newly relevant active decision, surface the conflict and do not choose a winner without user confirmation

Implementation Constraints

* Follow the acceptance criteria strictly.
* Prefer minimal changes and respect existing project conventions.
* Avoid unrelated refactoring.
* State assumptions explicitly.
* Define the validation required before work can be reported complete.

When making implementation decisions

* Reuse existing helpers, patterns, and APIs before introducing new ones.
* Before introducing a new abstraction, confirm that extending existing code would not satisfy the requirement.
* Choose the simplest implementation that satisfies the acceptance criteria.
* Introduce a new dependency or abstraction only when no in-project option exists, and state why.
* Do not optimize for hypothetical future reuse.

Output

## Plan

Short implementation plan.
State an explicit user choice from a completed task-plan only when one exists.

## Changes

Files modified.

## Validation

How acceptance criteria were satisfied.

