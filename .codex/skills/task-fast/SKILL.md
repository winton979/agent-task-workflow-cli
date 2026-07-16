---
name: task-fast
description: Fast path for small requirements. Clarify quickly, create the brief, implement, and verify. Archive automatically on completion.
user-invocable: true
---

Purpose

Handle a small requirement in one continuous workflow with minimal ceremony.

Workflow

1. Read the project code and conventions needed to avoid obvious conflicts.
2. If a fact can be found by exploring the environment, look it up rather than asking the user.
3. Ask only questions whose answers can change the implementation or acceptance criteria. Ask them one at a time, waiting for feedback on each before continuing. For each question, provide your recommended answer.
4. Put unresolved decisions to the user; do not make them on the user's behalf.
5. Read .ai/decisions/decisions.md if it exists and has entries. Pull in only decisions that materially constrain this task.
6. Before finalizing the brief, perform a Complexity Assessment.
7. Before asking for confirmation, perform a Brief Readiness check.
8. Create a concise task brief and save it to:

.ai/tasks/active/YYYY-MM-DD-task-name.md

9. Show the brief as the fast-path summary of shared understanding, ask the user to confirm it, and stop. Do not code until the user confirms.
10. Once the user confirms the brief, perform a Current Decision Check before changing code, then implement immediately.
11. If implementation needs a narrow confirmed clarification, record it under Revisions. If it materially changes the Goal, accepted scope, or Acceptance Criteria, stop and require task-explore.
12. Verify the result against the acceptance criteria.
13. Archive the brief automatically by moving it to:

.ai/tasks/archive/YYYY-MM-DD-task-name.md

14. Summarize the outcome and any follow-up risks.

Decision Intake

Before finalizing the brief, inspect .ai/decisions/decisions.md if it exists and contains real entries beyond the title.

Use it narrowly:

* extract only active decisions whose Scope and Applies when fields materially constrain this task; use legacy entries without metadata under the same narrow relevance test
* treat superseded and deprecated entries as history, not current constraints, unless the task explicitly needs that history
* ignore unrelated historical notes
* treat the file as a source of durable project invariants, not as a second specification
* if relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation
* if relevant decisions exist, summarize them briefly in Context or Constraints and list their identifiers in brief metadata instead of copying them verbatim

Complexity Assessment

Before finalizing the brief, assess whether the requirement justifies added complexity.

* Treat added complexity as a cost that must be justified by the requirement.
* Flag any indication that the requirement may require:

  - new project-wide capability
  - new dependency
  - cross-cutting architectural change

  as a Risk, not a plan.
* When complexity appears justified, do not design the solution here. Simply record that additional implementation effort is likely required.

Material Risk Assessment

Before finalizing the brief, consider whether repository evidence or the requirement makes any of these risks material:

* compatibility or public API changes
* data migration, integrity, or rollback
* security or sensitive-data handling
* performance, memory, or concurrency
* release, deployment, or operational impact

Record only material risks or unknowns with their concrete consequence. Do not turn this into a mandatory checklist or prescribe an implementation.

Brief Readiness

Before presenting a brief for confirmation or outputting TASK_READY, verify that:

* the Goal, Acceptance Criteria, material constraints, and material exclusions are sufficient for a fresh implementation session
* every confirmed user decision and execution-critical context that could materially change implementation or validation is recorded
* relevant active decisions do not conflict, and no material user-owned decision remains unresolved
* remaining uncertainty is recorded as a Risk or does not block implementation

Stop asking questions once these conditions hold. Do not turn the brief into a repository snapshot; the implementing agent revalidates current facts.

Current Decision Check

Before changing code, inspect .ai/decisions/decisions.md when it contains real entries:

* revalidate every decision identifier named in brief metadata
* extract only active decisions whose Scope and Applies when fields materially constrain the current work; use legacy entries without metadata under the same narrow relevance test
* if a referenced decision is inactive, missing, or contradicted by a newly relevant active decision, surface the conflict and do not choose a winner without user confirmation

Task Brief Format

Optional Brief Metadata

Place YAML frontmatter before the first content heading only when it improves retrieval or context selection:

---
areas: [auth]
decisions: [DEC-20260716-token-storage]
working_set: [src/auth, tests/auth]
---

* areas use the same stable project-area vocabulary as decision Scope
* decisions lists only relevant active decision identifiers
* working_set is an evidence-based starting scope for reading and modification, never a hard boundary; expand it when facts require and record why in the brief body or Revisions
* omit fields that have no value; legacy briefs without frontmatter remain valid

# Goal

What should be achieved.

# Context

Relevant project background.

# Constraints

Business or technical limitations. When materially supported by the exploration, record complexity expectations such as:

- A new dependency does not currently appear necessary.
- Existing project boundaries likely remain sufficient.
- Cross-cutting changes do not currently appear justified.

# Risks

Potential pitfalls.

# Acceptance Criteria

Clear success conditions.

# Revisions

Add only for an explicitly confirmed narrow clarification. Record the date, exact change, and why it does not materially revise the contract.

Requirements

* Maximum 500 words
* No code
* No architecture digression
* Only information required for execution

Output

TASK_DONE
