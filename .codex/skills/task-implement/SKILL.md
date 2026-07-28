---
name: task-implement
description: Implement a selected active task brief and validate it. Archive automatically when complete.
user-invocable: true
---

Purpose

Implement the intended task from .ai/tasks/active/ while deciding when implementation choices require confirmation.

Workspace Context

Before reading or writing any .ai path, determine the workflow state root. Managed skills are discovered from the launch root, but a launch-root workspace.yaml may declare context_repository. When it does:

1. Resolve that repository ID from the launch-root workspace.yaml, honoring launch-root workspace.local.yaml when present.
2. Verify that its resolved directory exists and is a Git repository root. If it is missing or invalid, stop and report the configuration error; never fall back to a launch-root .ai directory.
3. Treat the selected repository as the workflow state root. Read its workspace.yaml and workspace.local.yaml for the business repository map, and resolve every .ai path in this skill from that directory.

Without context_repository, the launch root remains the workflow state root and its workspace manifest is the repository map.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Treat repositories whose resolved disabled flag is true as unavailable for routine development in the current cycle. Do not select, inspect, index, or include them in a working set unless the user explicitly asks about that repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Do not assume a workflow-state-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Rules

1. Identify the intended brief in .ai/tasks/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.
2. Prepare with Brief Sufficiency and Current Decision Check before changing code.
3. Use Execution Mode below to choose direct execution or an Implementation Proposal.
4. Validate the result before reporting the work complete.
5. If the work is complete, archive the selected brief automatically by moving it to .ai/tasks/archive/.

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

Current Decision Check

Before planning or changing code, inspect .ai/decisions/decisions.md when it contains real entries:

* revalidate every decision identifier named in brief metadata
* extract only active decisions whose Scope and Applies when fields materially constrain the current work; use legacy entries without metadata under the same narrow relevance test
* if a referenced decision is inactive, missing, or contradicted by a newly relevant active decision, surface the conflict and do not choose a winner without user confirmation

When implementation expands the working set, record the reason in the selected active brief's Context or Revisions. After explicit confirmation of a narrow clarification, record its date, exact change, and reason under Revisions in the selected active brief before continuing implementation.

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

Decision Threshold

Ask for confirmation only when the unresolved decision can materially change:

* system behavior
* architecture or system boundaries
* compatibility or public contracts
* long-term maintenance
* risk profile

Do not ask for confirmation for routine local implementation or fix details when existing conventions are sufficient.

Execution Mode

Task-implement supports two execution modes. Default to Direct Execution.

## Direct Execution

Use when:

* the change scope is clear
* the required change is explicit from the brief
* existing project conventions determine the implementation approach
* no meaningful architectural or design choice is introduced

Inspect the brief and relevant context, apply the smallest correct change, and verify the result. Do not introduce planning or confirmation steps unless required by implementation uncertainty.

## Decision-Gated Execution

Use only when implementation choices materially affect the outcome, architecture or compatibility is involved, or user input is required under the Decision Threshold.

Implementation Proposal

Before modifying files, determine whether the implementation requires user confirmation.

Create an Implementation Proposal only when:

* multiple reasonable implementation approaches exist
* the change affects system boundaries
* the change introduces a durable design decision
* the implementation requires assumptions that materially affect the outcome
* the risk of choosing incorrectly is significant

Do not create a proposal when:

* the required change is explicit
* the modification is localized
* an existing project pattern clearly determines the implementation
* the change is routine and low-risk

An Implementation Proposal is a concise modification report, not a request for the user to design the implementation. It should contain only:

## Recommended Action

The concrete implementation direction the agent intends to take.

## Affected Areas

Files, modules, or boundaries likely involved.

## Material Decisions

Only user-owned decisions that materially affect implementation. Omit this section when there is no such decision.

## Risks

Important uncertainties or possible side effects.

## Next Step

State the recommended action and request approval to execute it only because the proposal gate was required. Do not ask the user to choose routine implementation details.

After presenting an Implementation Proposal:

* Wait for user confirmation before modifying files.
* Do not create task artifacts.
* Do not repeat broad discovery after confirmation.
* Use the confirmed proposal as implementation context.

Output

If an Implementation Proposal is required, output only the proposal sections from Execution Mode and wait for confirmation. Do not modify files.

After direct execution or confirmed proposal execution, output:

## Plan

Short summary of the implementation path actually used. Do not invent a pre-approval plan for routine work.

## Changes

Files modified.

## Validation

How acceptance criteria were satisfied.

