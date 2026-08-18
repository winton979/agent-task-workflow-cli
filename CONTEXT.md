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

**Spec Proposal**:
A resumable candidate for a Spec retained within an open Effort until the user confirms it. It is not yet a Spec Record or a source contract for Tasks.
_Avoid_: draft task, unconfirmed spec record

**Spec Record**:
A version-controlled, confirmed materialization of a ready Effort that becomes the source contract for later Task decomposition. It is not an active Task artifact.
_Avoid_: task brief, draft task

**Spec Revision**:
A numbered update to one Spec Record that preserves its identity and source Effort. It clarifies or changes the same destination rather than creating a new outcome.
_Avoid_: replacement spec, parallel spec

**Requirement**:
A stable-identified, observable behavior or capability required by a Spec.
_Avoid_: implementation step, task

**Acceptance Criterion**:
A stable-identified, observable condition that demonstrates a Requirement or Spec outcome has been satisfied.
_Avoid_: test implementation detail

**Decomposition**:
The internal phase that derives proposed Task Briefs, their requirement coverage, and their true blocking dependencies from a confirmed Spec. It is not an initial user-facing Skill.
_Avoid_: task planning command, independent task workflow

**Task Graph**:
The complete set of proposed Tasks produced by a Decomposition, including their owned Spec conditions and true blocking dependencies. It is reviewed as one coherent proposal before Task Briefs are created.
_Avoid_: task list, implementation order

**Task ID**:
An immutable identifier assigned to a generated Task Brief and used to resolve Task Graph relationships across active and archived locations. It is distinct from the Brief's mutable filename and is retained when a later Decomposition still matches that Task.
_Avoid_: task filename, task title

**Execution Gate**:
The rule that prevents a generated Task from starting until each of its true blocking dependencies is complete. It does not apply to Task Briefs without Task Graph metadata.
_Avoid_: suggested ordering, task queue

**Task Compatibility**:
A derived assessment of whether an existing generated Task still conforms to the latest confirmed Task Graph after a Spec Revision. An incompatible Task remains preserved but cannot be executed.
_Avoid_: automatic task update, hidden task state

**Task Graph Metadata**:
The immutable source, ownership, identity, and dependency information that links a generated Task Brief to its Task Graph. It is distinct from execution notes and Completion Evidence.
_Avoid_: editable task context, implementation notes

**Verification Owner**:
The one Task accountable for producing final evidence that an Acceptance Criterion is satisfied. Other Tasks may contribute to that condition.
_Avoid_: shared verifier, implicit test owner

**Completion Evidence**:
The concise, persisted record of a generated Task's completed validation and the Spec conditions it satisfied. It is retained with the archived Task Brief.
_Avoid_: chat-only result, implementation diary

**Impact Report**:
A comparison between the latest Spec Revision and its existing Task Briefs that identifies potentially affected downstream work. It does not alter those Briefs.
_Avoid_: automatic migration, task rewrite

**Task Brief**:
The persisted execution contract used by the existing Task workflow. It is not a substitute for an Effort or a Spec.
_Avoid_: spec

**Effort Record State**:
The only persisted lifecycle marker of an Effort: `open` while it can be resumed and `closed` once the user has explicitly ended it. An explicit reopening returns a closed record to `open`; readiness, blocking, and pause are derived from the record's current content rather than stored states.
_Avoid_: task status, execution status

**Project Glossary**:
An optional `CONTEXT.md` at the workflow state root that defines canonical project-specific terms shared by managed workflows. It contains concise concept definitions and avoided synonyms, not Specs, decision entries, evidence, or session history.
_Avoid_: decision log, Spec, per-repository glossary

**Verification Boundary**:
The highest practical observable seam at which one Acceptance Criterion can be shown true without asserting implementation details. It is part of the confirmed Spec contract and guides the Task that owns final evidence.
_Avoid_: unit-test detail, implementation assertion, test file

**Diagnostic Loop**:
A named, red-capable command, test, script, replay, or harness that exercises a reported Bug's exact symptom and can be re-run as correction evidence. It is evidence, not a root-cause claim.
_Avoid_: vague reproduction steps, nearby failure, untested hypothesis
