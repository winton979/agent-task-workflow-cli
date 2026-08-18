# Define the Effort Record Contract

Type: grilling
Status: resolved
Blocked by: None

## Question

What is the smallest durable Markdown record and set of path, status, and transition invariants that can represent a resumable Phase 1 Effort while preserving the established task-cli workspace-root and active/archive conventions?

## Answer

Persist each open Effort as one Markdown file under `<workflowStateRoot>/.ai/efforts/active/`, named with the existing date-and-slug convention. Move a closed Effort unchanged to `.ai/efforts/archive/` after explicit user confirmation.

The record has one machine-readable lifecycle marker, `state: open` or `state: closed`, and durable sections for Destination, Context, Confirmed Decisions, Current Frontier, Known Constraints, Open Unknowns, Out of Scope, and Session History. The `Current Frontier` and `Open Unknowns` determine whether the natural-language status is ready, blocked, or still exploring; no separate lifecycle state is written for those conditions. A user may simply stop interacting with an open Effort to pause it.

`effort-explore` is the sole Phase 1 user-facing Skill. It handles creation, continuation, status reporting, and closure from natural-language intent. Before closure it must describe the archive action and receive explicit confirmation. Closure preserves the record and a reason, and never deletes implementation code, task artifacts, bug artifacts, or unrelated user changes.
