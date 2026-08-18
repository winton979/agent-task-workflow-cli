# task-cli Workflow

The workflow concepts that distinguish long-running discovery from an executable change in task-cli.

## Language

**Effort**:
A durable exploration record for a large or uncertain request whose material decisions are not yet settled. It is not an implementation unit.
_Avoid_: large task, epic, project

**Task**:
A bounded, independently verifiable execution contract for implementing an already-settled change. It is the leaf unit of the workflow.
_Avoid_: effort, project

**Spec**:
A settled contract that describes the desired behavior, scope, constraints, and acceptance conditions of an Effort before it is decomposed into Tasks.
_Avoid_: task brief, plan

**Task Brief**:
The persisted execution contract used by the existing Task workflow. It is not a substitute for an Effort or a Spec.
_Avoid_: spec

**Effort Record State**:
The only persisted lifecycle marker of an Effort: `open` while it can be resumed and `closed` once the user has explicitly ended it. Readiness, blocking, and pause are derived from the record's current content rather than stored states.
_Avoid_: task status, execution status
