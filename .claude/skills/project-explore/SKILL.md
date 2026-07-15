---
name: project-explore
description: Build an evidence-based understanding of the existing project without changing it. Use only when the user explicitly invokes project-explore; do not use for implementation, bug investigation, or formal review.
user-invocable: true
disable-model-invocation: true
---

Purpose

Establish a shared, evidence-based understanding of the existing project within the current conversation.

Explain behavior, structure, design intent, constraints, and trade-offs. Do not create change work.

Workflow

1. Classify the user's primary intent. If it matches a case under Transitions, state the boundary and stop.
2. Identify the question or project area to understand.
3. Inspect the relevant code, tests, configuration, documentation, decisions, and repository history. Look up repository facts instead of asking the user for them.
4. Build the answer from evidence. Separate:

   * observed facts
   * recorded intent
   * inferred rationale
   * assumptions and unknowns
   * trade-offs

5. Answer when the evidence supports a bounded conclusion. Do not prolong exploration to remove immaterial uncertainty.
6. Ask one focused question at a time only when ambiguity would materially change the answer. Recommend an answer only for a user-owned choice.
7. Stop when the question is answered or the remaining uncertainty is stated precisely.

Evidence Discipline

* Treat current code, tests, configuration, and direct observations as evidence of behavior.
* Treat documentation, decisions, archives, and repository history as evidence of context or intent. Do not let them override contradictory current behavior.
* Cite file paths and line numbers when practical.
* Treat missing rationale as unknown. Do not infer that no rationale existed.
* When sources conflict, report the conflict and identify which claim each source supports.
* Do not treat unfamiliar design as defective. If evidence indicates incorrect behavior, label it as a possible issue rather than diagnosing it here.

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

* extract only decisions relevant to the question
* treat them as durable constraints, not complete documentation
* verify that current project evidence does not contradict them
* omit unrelated history

Transitions

If the user's primary intent becomes:

* new or changed behavior: recommend task-fast or task-explore
* suspected incorrect behavior: recommend bug-explore
* recording an approved durable decision: recommend decision-log
* review of a completed task or bug with a brief: recommend task-audit or bug-audit
* standalone architecture or quality review: state that no managed workflow covers it; do not issue findings, ratings, approval, or a release verdict

After routing, stop. Do not inspect the project to fulfill the out-of-scope request. Do not invoke another workflow or create its artifacts unless the user explicitly requests it.

Boundaries

Do not:

* modify code, documentation, or project state
* create task, bug, or decision artifacts
* design an implementation
* perform a formal architecture review or audit
* treat exploration findings as approved decisions

Output

Answer directly. Use only the sections that improve clarity:

## Understanding

## Evidence

## Intent and Uncertainty

## Trade-offs

## Open Questions

Omit empty sections. For a simple question, prefer concise prose without headings.
