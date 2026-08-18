# Phase 2: Effort-to-Spec Task Graph Workflow

Status: ready-for-agent

## Problem Statement

After Phase 1 establishes a ready Effort, task-cli has no durable path from that settled exploration to a version-controlled Spec Record and executable Task Briefs. Users must manually translate the same decisions into separate artifacts, losing Requirement and Acceptance Criterion traceability and allowing dependent work to start in the wrong order.

The workflow needs one natural-language, resumable route that turns a ready Effort into a confirmed Spec and a reviewed Task Graph without exposing another decomposition Skill or adding persistent lifecycle states beyond an Effort's `open` and `closed` markers.

## Solution

Add one managed `effort-spec` Skill. It selects an unambiguous ready, open Effort, retains an unconfirmed Spec Proposal in that Effort, and writes a version-controlled Spec Record only after explicit confirmation. A confirmed Spec then produces an internal Decomposition and a reviewed Task Graph. Explicit approval of the complete graph atomically creates generated Task Briefs.

Generated Task Briefs retain immutable Task Graph Metadata: a stable Task ID, the source Spec Record and revision, owned Requirement and Acceptance Criterion IDs, a Verification Owner assignment, and true blocking dependencies. `task-implement` enforces those dependencies and current Task Compatibility for generated Briefs, then persists Completion Evidence before archiving. Existing hand-authored Task and all Bug workflows remain unchanged.

## User Stories

1. As an AI-assisted developer, I want to turn a ready Effort into a Spec Proposal, so that exploration decisions become reviewable without repeating discovery.
2. As an AI-assisted developer, I want to resume an Effort awaiting Spec confirmation, so that leaving a session does not lose proposed work.
3. As an AI-assisted developer, I want ambiguous Effort requests to require selection, so that no Spec is attached to the wrong Effort.
4. As an AI-assisted developer, I want a confirmed Spec Record stored under the repository's tracked specifications, so that Git history records the source contract.
5. As an AI-assisted developer, I want a Spec Proposal to remain separate from a confirmed Spec Record, so that an unconfirmed draft cannot silently drive Tasks.
6. As an AI-assisted developer, I want stable Requirement and Acceptance Criterion IDs, so that Task coverage can be inspected without relying on prose matching.
7. As an AI-assisted developer, I want one Effort to have one revisable Spec Record, so that revisions do not create parallel source contracts.
8. As an AI-assisted developer, I want a confirmed Spec to generate a Task Graph internally, so that I do not need to invoke a visible decomposition Skill.
9. As an AI-assisted developer, I want to inspect every proposed Task, its owned conditions, validation, and true dependencies before Tasks are created, so that I can approve the plan as a whole.
10. As an AI-assisted developer, I want graph confirmation to create every Task Brief or none, so that active work never represents a partial graph.
11. As an AI-assisted developer, I want every generated Task Brief to identify its source Spec revision, so that implementation and audits remain traceable.
12. As an AI-assisted developer, I want each Acceptance Criterion to have exactly one Verification Owner, so that integration evidence has a clear owner.
13. As an AI-assisted developer, I want Task dependencies to represent only real blockers, so that unrelated Tasks can proceed independently.
14. As an AI-assisted developer, I want generated Task IDs to remain stable across active and archived locations, so that dependency resolution does not depend on filenames.
15. As an AI-assisted developer, I want `task-implement` to refuse a generated Task whose dependencies are incomplete, so that blocked work cannot start accidentally.
16. As an AI-assisted developer, I want `task-implement` to refuse a generated Task that is no longer compatible with the latest Task Graph, so that a revised Spec cannot be implemented through stale work.
17. As an AI-assisted developer, I want completed generated Tasks to retain Completion Evidence, so that Effort status and later revisions can rely on durable facts.
18. As an AI-assisted developer, I want a later Spec Proposal revision to preserve the existing confirmed Spec until I explicitly approve it, so that execution always has one valid source contract.
19. As an AI-assisted developer, I want a confirmed Spec revision to produce an Impact Report and a new candidate Task Graph, so that stale downstream work is visible before anything changes.
20. As an AI-assisted developer, I want compatible existing Tasks to retain their IDs after re-decomposition, so that stable work is not duplicated.
21. As an AI-assisted developer, I want incompatible Task Briefs preserved but blocked, so that history is not rewritten and unsafe work cannot continue.
22. As an AI-assisted developer, I want Effort status to list derived ready and blocked generated Tasks, so that natural-language management remains useful through implementation.
23. As an AI-assisted developer, I want to close an Effort with active Tasks after explicit confirmation, so that coordination can end without deleting delivery artifacts.
24. As an AI-assisted developer, I want to explicitly reopen a closed Effort, so that later feedback can create a new Spec Proposal without inventing another lifecycle state.
25. As a task-cli user, I want existing Task Briefs without Task Graph Metadata to retain their current execution behavior, so that adoption is backward compatible.
26. As a task-cli user, I want Task and Bug cancellation, audit, workspace context, and provider parity to continue working as before, so that Phase 2 is additive.
27. As a maintainer, I want the same behavior installed for Claude and Codex, so that workflow meaning does not vary by provider.

## Implementation Decisions

- Add `effort-spec` as the sole new user-invocable managed Skill. Decomposition is an internal phase of this Skill, not a separate `task-decompose` or lifecycle command.
- Create tracked specification state alongside existing workflow state. It holds one confirmed Spec Record per Effort; active Efforts retain only their unconfirmed Spec Proposals and remain ignored.
- A Spec Record contains Destination, Context, Constraints, Confirmed Decisions, Out of Scope, Risks, a source Effort reference, stable Requirement IDs, stable Acceptance Criterion IDs, and concise in-place revision history. The workflow writes and updates files but never stages or commits them.
- Require explicit advancement at two boundaries: confirming a Spec Proposal before writing or revising a Spec Record, and confirming the complete Task Graph before creating Task Briefs. Any material change to Destination, Context, Constraints, Confirmed Decisions, Requirements, Acceptance Criteria, Out of Scope, or Risks returns to the proposal boundary. Ambiguous Effort, Spec, or Task selection requires clarification rather than recency inference.
- Require Decomposition validation before Task Graph approval: all included Requirements and Acceptance Criteria have explicit coverage, every Acceptance Criterion has one Verification Owner, IDs are unique, dependencies refer to graph Tasks, and dependencies form a directed acyclic graph of true blockers.
- Add immutable Task Graph Metadata to generated Task Briefs. It includes a stable Task ID, source Effort and Spec Record, source revision, owned Requirement and Acceptance Criterion IDs, Verification Owner responsibilities, and Task ID dependencies. Implementation notes and Completion Evidence remain mutable execution records.
- Extend only generated Task behavior in `task-implement`. Before code changes, resolve direct dependency Task IDs across active and archive locations and require completion; resolve the latest confirmed Task Graph and require Task Compatibility. Leave legacy Brief selection and execution unchanged when no Task Graph Metadata is present.
- Before archiving a completed generated Task, append Completion Evidence with date, validations and outcomes, and satisfied source IDs. A Verification Owner records final evidence for its owned Acceptance Criterion.
- When no accepted Task Graph represents the current Spec revision, re-derive and display the candidate from the latest Spec and existing generated Tasks before accepting a new graph confirmation; a past conversational display is never itself an approval target.
- A confirmed Task Graph is a recoverable all-or-nothing transaction: stage the next Spec Record and Briefs only for new or materially changed Tasks, validate final destinations, then promote them while tracking only paths created by the current invocation. Compatible retained Task IDs stay in the accepted graph but their existing active or archived Briefs are never staged, rewritten, moved, or deleted. On failure, remove only promoted Briefs, restore the prior Spec Record, clean staging output, and report any unresolved paths.
- A material Spec change is first a Spec Proposal revision. After confirmation, update the same Spec Record, create an Impact Report, and produce a candidate Task Graph. Compatible Tasks retain IDs; new or materially changed Tasks receive new IDs. Existing potentially incompatible Briefs are preserved and blocked rather than edited, deleted, or archived automatically.
- Effort closure stays explicit and non-destructive. It may occur while generated Tasks remain active; a later Spec change requires an explicit reopen that returns the record to `open` and records the reason.
- Extend initialization, refresh, doctor, and bilingual documentation for the specification directory and new managed Skill while preserving workspace-context routing.

## Testing Decisions

- Test only through the existing command-level initialization, refresh, and doctor seam. A good test observes generated workspace directories and provider Skill contracts, not implementation constants or template assembly.
- Extend the existing workspace tests to prove that initialization and context setup create the tracked specification directory, while active Efforts remain ignored and specifications remain eligible for Git tracking.
- Assert that both provider installations contain `effort-spec` and the confirmed boundaries: ready-Effort selection, resumable Spec Proposal, explicit Spec and Task Graph confirmation, no exposed decomposition Skill, coverage and dependency validation, in-place revisions, Impact Reports, and no automatic commits.
- Assert generated `task-implement` guidance only gates Task Briefs with Task Graph Metadata; it resolves Task IDs in active and archive locations, blocks incomplete or incompatible Tasks, and persists Completion Evidence before archive.
- Preserve existing direct-completion, Task, Bug, cancellation, workspace-context, refresh, doctor, and provider-parity coverage as regression tests. Run focused workspace tests during development and the complete Node test suite before completion.

## Out of Scope

- A user-invocable `decompose` or `task-decompose` Skill.
- Automatic implementation after Task Brief creation.
- Automatic Git staging, commits, issue creation, or issue-tracker synchronization.
- Automatic modification, deletion, cancellation, or archival of existing Task Briefs after a Spec revision.
- New persisted Effort states beyond `open` and `closed`.
- Dependency enforcement for legacy Task Briefs without Task Graph Metadata.
- Multi-Effort composite Specs, cross-Spec Task Graphs, and multi-agent orchestration.

## Further Notes

- The workflow uses natural-language requests to resume, inspect, confirm, revise, close, and reopen work, but confirmation and ambiguity boundaries remain explicit.
- Existing task-cli tests already expose the highest useful seam: a real `task init` writes the provider artifacts consumed by users.
- The local repository has no configured issue-tracker workflow or GitHub CLI. This file is the ready-for-agent specification in place of remote publication.
