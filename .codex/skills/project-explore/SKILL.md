---
name: project-explore
description: Build an evidence-based understanding of the existing project without changing it. Use only when the user explicitly invokes project-explore; do not use for implementation, bug investigation, or formal review.
---

Purpose

Establish a bounded, evidence-based understanding of the existing project within the current conversation.

Answer questions about current behavior, supported capabilities, structure, design intent, constraints, and trade-offs. Do not create change work.

Workflow

1. Classify the user's primary intent. If it matches a case under Transitions, state the boundary and stop.
2. Classify the question as one of: current behavior or support, structure or flow, design rationale or trade-off, or current constraint or decision.
3. State the interpreted question and project area when the request is broad, loosely constrained, or uses ambiguous project terms. Do not imply exhaustive coverage.
4. Inspect the relevant current code, tests, configuration, documentation, decisions, and repository history. Look up repository facts instead of asking the user for them.
5. Build the answer from evidence. Separate:

   * observed facts
   * recorded intent
   * inferred rationale
   * assumptions and unknowns
   * trade-offs

6. Answer when the evidence supports a bounded conclusion. Do not prolong exploration to remove immaterial uncertainty.
7. Ask one focused question at a time only when ambiguity remains after investigation and would materially change the answer. Do not ask the user to supply discoverable facts.
8. Stop when the question is answered or the remaining uncertainty is stated precisely.

Workspace Context

Before reading or writing any .ai path, determine the workflow state root. Managed skills are discovered from the launch root, but a launch-root workspace.yaml may declare context_repository. When it does:

1. Resolve that repository ID from the launch-root workspace.yaml, honoring launch-root workspace.local.yaml when present.
2. Verify that its resolved directory exists and is a Git repository root. If it is missing or invalid, stop and report the configuration error; never fall back to a launch-root .ai directory.
3. Treat the selected repository as the workflow state root. Read its workspace.yaml and workspace.local.yaml for the business repository map, and resolve every .ai path in this skill from that directory.

Without context_repository, the launch root remains the workflow state root and its workspace manifest is the repository map.

Retain the resulting absolute canonical directory as `workflowStateRoot`. Every .ai read, write, move, or delete must use an absolute path below `<workflowStateRoot>/.ai`. Never use a relative `.ai/...` path, infer the state root from the current command directory, or choose an existing .ai directory in a nested or registered repository.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Treat repositories whose resolved disabled flag is true as unavailable for routine development in the current cycle. Do not select, inspect, index, or include them in a working set unless the user explicitly asks about that repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Changing the command directory never changes `workflowStateRoot`. Do not assume a workflow-state-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Question Coverage

Select evidence to fit the question. These are minimum investigation guides, not mechanical checklists:

* current behavior or support: inspect the user-facing entry point or public interface, the relevant implementation, and an available test, configuration, or integration point
* structure or flow: inspect the relevant entry point, core module, and its material integration point
* design rationale or trade-off: inspect the defining code and corroborate it with other material evidence such as callers, tests, configuration, decisions, or repository history
* current constraint or decision: inspect the current code or configuration that enforces it and any relevant active decision

If the available evidence does not cover one of these areas, state the limitation. Do not make a supported-capability claim from a name, a comment, or a single isolated file.
When multiple entry points or implementations plausibly match the question, inspect enough of them to distinguish global behavior from conditional or implementation-specific behavior.

Evidence Discipline

* Treat current code, tests, configuration, and direct observations as evidence of behavior.
* Treat documentation, decisions, archives, and repository history as evidence of context or intent. Do not let them override contradictory current behavior.
* State central conclusions as observed facts or inferences. Cite the supporting paths and line numbers when practical.
* If no supporting rationale is located after inspecting the relevant sources, state that no supporting rationale was located in the inspected sources. Treat the rationale as unknown; do not conclude that none exists.
* When sources conflict, report the conflict and identify which claim each source supports.
* For a question about rationale, architecture, or trade-offs, do not conclude from the first matching file. When material evidence is available, corroborate across relevant categories such as defining code, callers or integration points, tests or configuration, and decisions or repository history.
* Stop when the available sources corroborate a bounded conclusion, or state the conflict or Unknown precisely. Do not expand to unrelated areas or read the whole repository merely to eliminate immaterial uncertainty.
* Do not treat unfamiliar design as defective. If evidence indicates incorrect behavior, label it as a possible issue rather than diagnosing it here.

Scope Discipline

* A question about whether the existing project supports a capability is in scope, even when the answer may later inform a change.
* Describe only the investigated project surface. For a broad project question, identify the relevant entry points, core modules, configuration or data boundaries, tests or integration points, and material areas not inspected when that context improves the answer.
* Do not create a persistent repository map, present an explored surface as a complete architecture inventory, or carry conclusions into later work as approved decisions.

Decision Discussion

When discussing a design choice:

* identify the decision and its constraints
* compare only relevant alternatives
* state the benefits, costs, and assumptions of each alternative
* recommend a direction only when the user explicitly requests a recommendation and the available evidence is sufficient

Keep recommendations conceptual. Do not provide code, file-by-file changes, implementation steps, acceptance criteria, or estimates. Do not present exploration as architecture approval.

Project Memory

Before explaining a project decision, inspect .ai/decisions/decisions.md if it exists and contains entries beyond the title.

Use it narrowly:

* extract only active decisions whose Scope and Applies when fields are relevant; use legacy entries without metadata under the same narrow relevance test
* treat superseded and deprecated entries as history, not current constraints, unless the question explicitly needs that history
* treat active decisions as durable constraints, not complete documentation
* verify that current project evidence does not contradict them
* report conflicting active decisions rather than inferring precedence
* omit unrelated history

Transitions

If the user's primary intent becomes:

* new or changed behavior: recommend task-explore
* suspected incorrect behavior: recommend bug-explore
* recording an approved durable decision: recommend decision-log
* review of a completed task or bug with a brief: recommend task-audit or bug-audit
* standalone architecture or quality review: state that no managed workflow covers it; do not issue findings, ratings, approval, or a release verdict

After routing, stop. Do not inspect the project to fulfill the out-of-scope request, invoke another workflow, or create its artifacts. A workflow changes only when the user explicitly invokes it.

Boundaries

Do not:

* modify code, documentation, or project state
* create task, bug, or decision artifacts
* design an implementation
* investigate a suspected defect, reproduce it, or identify its root cause
* perform a formal architecture review or audit
* treat exploration findings as approved decisions

Output

Answer directly. Use only the sections that improve clarity:

## Answer

## Evidence

## Design Context

## Relevant Surface

## Scope and Unknowns

For a broad request, state the interpreted scope before the answer. Omit empty sections. For a simple question, prefer concise prose without headings.
