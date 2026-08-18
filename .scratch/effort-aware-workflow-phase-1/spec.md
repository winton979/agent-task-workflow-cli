# Phase 1: Natural-Language Effort Workflow

Status: ready-for-agent

## Problem Statement

task-cli currently persists only bounded Task and Bug work. A large or uncertain request must either be compressed into a Task Brief before its material decisions are settled or be managed outside the workflow, making it difficult to resume safely in a later session.

The product needs a durable Effort record for discovery work without adding a separate command for every lifecycle action, changing the existing Task and Bug flows, or treating a longer Task Brief as a substitute for unresolved decisions.

## Solution

Add one explicit, user-invocable `effort-explore` managed Skill. It manages an Effort through natural-language requests to create, continue, update, report on, or close the record.

An Effort has a single durable Markdown record. Its only persisted lifecycle marker is `open` or `closed`; whether it is actively exploring, externally blocked, or ready for a later Spec is derived from its confirmed decisions, current frontier, and open unknowns. An open record may be left untouched and resumed later. Closing is the only archival operation and requires explicit confirmation.

## User Stories

1. As an AI-assisted developer, I want to start an Effort for a large or uncertain request, so that unresolved decisions have a durable home outside a Task Brief.
2. As an AI-assisted developer, I want to describe my intent in natural language, so that I do not need separate commands to continue, inspect, pause, or close an Effort.
3. As an AI-assisted developer, I want an Effort to preserve its Destination, so that a later session understands what the exploration is trying to achieve.
4. As an AI-assisted developer, I want confirmed decisions to be recorded separately from open questions, so that the Skill does not treat exploratory findings as accepted commitments.
5. As an AI-assisted developer, I want to resume an open Effort by naming it, so that the Skill can load only the relevant durable context.
6. As an AI-assisted developer, I want the Skill to ask me to identify an Effort when the request matches more than one open record, so that it never silently selects work based on recency.
7. As an AI-assisted developer, I want to ask for an Effort's status, so that I can see its current frontier, remaining unknowns, and any external blocker in plain language.
8. As an AI-assisted developer, I want readiness for a future Spec to be derived from the record, so that no separate ready state can become stale.
9. As an AI-assisted developer, I want to pause by ending the conversation, so that temporary inactivity does not create another lifecycle command or mutate the record unnecessarily.
10. As an AI-assisted developer, I want closure to require confirmation, so that an Effort cannot be accidentally removed from the active set.
11. As an AI-assisted developer, I want a closed Effort and its closure reason archived, so that its context remains available without appearing as resumable work.
12. As an AI-assisted developer, I want closure never to delete code, Task artifacts, Bug artifacts, or unrelated changes, so that workflow management cannot destroy implementation work.
13. As an AI-assisted developer using a workspace context repository, I want Efforts resolved from that workflow state root, so that they follow the same cross-repository rules as Tasks and Bugs.
14. As a task-cli user, I want existing Task and Bug workflows to remain unchanged, so that adopting Efforts does not alter routine work.
15. As a maintainer, I want both Claude and Codex installations to expose the same Effort behavior, so that workflow semantics do not depend on the provider.

## Implementation Decisions

- Add `effort-explore` as the sole Phase 1 Effort managed Skill. Do not add new `task` CLI subcommands or separate status, pause, and abandon Skills.
- Initialize and validate active and archived Effort directories with the existing workflow state. Active Effort records follow the existing ignored-active-artifact convention; closed records belong in the archive.
- An open Effort record is a date-and-slug Markdown document with a machine-readable `state: open` marker and sections for Destination, Context, Confirmed Decisions, Current Frontier, Known Constraints, Open Unknowns, Out of Scope, and Session History. On confirmed closure, change the marker to `closed`, add a closure reason, and move the document into the archive.
- Interpret natural language into four intents: create, continue or update, report status, and close. A request that does not identify an Effort may use the only unambiguous open record; multiple plausible records require a focused selection question.
- Status reporting derives its conclusion from the record. A current frontier with unresolved work means exploration can continue; an external prerequisite with no agent-actionable frontier is blocked; no material frontier or unknowns means ready for a future Spec. These labels are reports, not persisted states.
- Do not create a Spec, decompose Tasks, automatically route Task requests into an Effort, synchronize an issue tracker, or orchestrate multiple agents in this release.
- Apply existing workspace-context validation and non-destructive artifact handling to every read, write, move, and archive operation described by the Skill.

## Testing Decisions

- Test through the existing command-level workspace initialization, refresh, and doctor seam rather than introducing a new CLI surface.
- Verify that a newly initialized workspace has the Effort state directories, ignores active Effort records, and recognizes their presence in health checks.
- Verify that refresh installs current `effort-explore` guidance for both providers and removes stale managed versions without affecting unrelated custom Skills.
- Assert the generated Skill contract, including workflow-state-root resolution, one open-or-closed persisted marker, unambiguous-record selection, derived status reporting, explicit close confirmation, archive preservation, and non-deletion of code or existing Task and Bug artifacts.
- Preserve the existing Task, Bug, workspace-context, and provider-parity tests as regression coverage.

## Out of Scope

- A product `effort-spec` capability or automatic Spec generation.
- Spec decomposition, requirement coverage matrices, Task dependency graphs, or `task-decompose`.
- Automatic escalation from `task-fast` or `task-explore` into an Effort.
- GitHub, Linear, or other issue tracker synchronization.
- Multi-agent orchestration and parallel Effort execution.
- New `task` CLI subcommands.

## Further Notes

- This is the implementation Spec for Phase 1, not the future product-level Spec produced from a ready Effort.
- The existing `Task` term remains the execution leaf. Refer to the new capability as an Effort and to its single interface as the `effort-explore` Skill.
- The natural-language interaction details recorded here are intentionally conservative: selection ambiguity and closure are the two cases that require confirmation rather than inference.
