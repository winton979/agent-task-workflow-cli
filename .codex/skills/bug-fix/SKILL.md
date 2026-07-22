---
name: bug-fix
description: Fix a selected active bug brief and validate the result. Archive automatically when complete.
user-invocable: true
---

Purpose

Fix the intended bug from .ai/bugs/active/.

Workspace Context

When workspace.yaml exists at the workflow root, read its repository IDs, paths, and descriptions before investigating or changing code.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Do not assume a workflow-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Rules

1. Identify the intended brief in .ai/bugs/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.
2. Recheck current behavior and the brief's evidence before changing code.
3. Minimize changes.
4. Avoid unrelated refactoring.
5. Correct a confirmed root cause rather than a symptom. When the brief has only hypotheses, do not report one as confirmed; validate the behavioral correction and state the remaining uncertainty.
6. Preserve existing behavior.
7. Explain reasoning.
8. Validate the fix before stopping.
9. If the bug is fixed, archive the brief automatically by moving it to .ai/bugs/archive/.

Current Decision Check

Before changing code, inspect .ai/decisions/decisions.md when it contains real entries:

* revalidate every decision identifier named in brief metadata
* extract only active decisions whose Scope and Applies when fields materially constrain the current work; use legacy entries without metadata under the same narrow relevance test
* if a referenced decision is inactive, missing, or contradicted by a newly relevant active decision, surface the conflict and do not choose a winner without user confirmation

When making implementation decisions

* Extend existing behavior before introducing new abstractions.
* Prefer the smallest behavioral correction that resolves the confirmed root cause or, when no cause is confirmed, the accepted behavioral failure.
* Introduce new dependencies only when existing project capabilities cannot reasonably solve the problem.

Output

## Cause Status

Confirmed cause or unresolved hypotheses and confidence.

## Fix

Changes made.

## Validation

Verification performed.

