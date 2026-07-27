---
name: bug-fix
description: Fix a selected active bug brief and validate the result. Archive automatically when complete.
user-invocable: true
---

Purpose

Fix the intended bug from .ai/bugs/active/.

Workspace Context

When workspace.yaml exists at the workflow root, read its repository IDs, paths, and descriptions before investigating or changing code. Also read workspace.local.yaml when present; its repository paths override the shared paths on the current machine.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Do not assume a workflow-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Rules

1. Identify the intended brief in .ai/bugs/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.
2. Prepare with Fix Sufficiency and Current Decision Check before changing code.
3. Use Fix Strategy below to choose direct fixing or a Fix Strategy Proposal.
4. Validate the fix before reporting it complete.
5. If the bug is fixed, archive the brief automatically by moving it to .ai/bugs/archive/.

Fix Sufficiency

Before planning or changing code, determine whether the selected brief remains executable against the current project state.

* Investigate facts available from the repository or environment instead of asking the user.
* Treat the brief's Expected Behavior and Acceptance Criteria as the confirmed desired contract. Current code, tests, configuration, and direct observations describe current behavior.
* Correct a confirmed root cause rather than a symptom. When the brief has only hypotheses, do not report one as confirmed; validate the behavioral correction and state the remaining uncertainty.
* For a local, reversible fix choice that does not materially affect expected behavior, scope, compatibility, security, data, or acceptance, follow existing conventions and choose the smallest correction.
* Do not infer an unresolved user decision that materially affects those concerns. Ask one focused question at a time, include a recommended answer, and wait.
* If relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation.
* If a choice materially changes Expected Behavior, accepted scope, or Acceptance Criteria, stop and require renewed bug-explore. Do not continue against an outdated brief.
* If current project state materially contradicts the brief's evidence or constraints, surface the conflict and resolve it under the same rules.

Current Decision Check

Before planning or changing code, inspect .ai/decisions/decisions.md when it contains real entries:

* revalidate every decision identifier named in brief metadata
* extract only active decisions whose Scope and Applies when fields materially constrain the current work; use legacy entries without metadata under the same narrow relevance test
* if a referenced decision is inactive, missing, or contradicted by a newly relevant active decision, surface the conflict and do not choose a winner without user confirmation

Fix Constraints

* Follow the Expected Behavior and Acceptance Criteria strictly.
* Minimize changes and preserve existing behavior.
* Avoid unrelated refactoring.
* State assumptions explicitly.
* Explain material reasoning.
* Define the validation required before the fix can be reported complete.

When making fix decisions

* Extend existing behavior before introducing new abstractions.
* Prefer the smallest behavioral correction that resolves the confirmed root cause or, when no cause is confirmed, the accepted behavioral failure.
* Introduce new dependencies only when existing project capabilities cannot reasonably solve the problem.

Decision Threshold

Ask for confirmation only when the unresolved decision can materially change:

* system behavior
* architecture or system boundaries
* compatibility or public contracts
* long-term maintenance
* risk profile

Do not ask for confirmation for routine local implementation or fix details when existing conventions are sufficient.

Fix Strategy

Bug-fix defaults to fixing directly when evidence is sufficient and the correction is localized.

Do not delay fixes for immaterial uncertainty. If the root cause is sufficiently supported by evidence and the fix is localized, proceed.

Fix Strategy Proposal

Before modifying files, determine whether the fix strategy requires confirmation.

Request confirmation only when:

* the root cause is uncertain
* multiple fixes have materially different trade-offs
* the fix changes behavior beyond the reported issue
* the fix affects system boundaries or compatibility
* the regression risk is significant

A Fix Strategy Proposal should contain only:

## Root Cause

Observed cause supported by evidence, or the unresolved cause uncertainty.

## Fix Approach

The intended correction.

## Impact

Affected behavior or components.

## Regression Risk

What should be verified.

## Confirmation

Ask whether to proceed.

After presenting a Fix Strategy Proposal:

* Wait for user confirmation before modifying files.
* Do not create bug artifacts.
* Do not repeat broad discovery after confirmation.
* Use the confirmed proposal as fix context.

Output

If a Fix Strategy Proposal is required, output only the proposal sections from Fix Strategy and wait for confirmation. Do not modify files.

After direct fixing or confirmed proposal execution, output:

## Cause Status

Confirmed cause or unresolved hypotheses and confidence.

## Fix

Changes made.

## Validation

Verification performed.

