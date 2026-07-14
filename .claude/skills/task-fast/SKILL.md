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
7. Create a concise task brief and save it to:

.ai/tasks/active/YYYY-MM-DD-task-name.md

8. Show the brief as the fast-path summary of shared understanding, ask the user to confirm it, and stop. Do not code until the user confirms.
9. Once the user confirms the brief, implement immediately.
10. Verify the result against the acceptance criteria.
11. Archive the brief automatically by moving it to:

.ai/tasks/archive/YYYY-MM-DD-task-name.md

12. Summarize the outcome and any follow-up risks.

Decision Intake

Before finalizing the brief, inspect .ai/decisions/decisions.md if it exists and contains real entries beyond the title.

Use it narrowly:

* extract only decisions that materially constrain this task
* ignore unrelated historical notes
* treat the file as a source of durable project invariants, not as a second specification
* if relevant decisions exist, summarize them briefly in Context or Constraints instead of copying them verbatim

Complexity Assessment

Before finalizing the brief, assess whether the requirement justifies added complexity.

* Treat added complexity as a cost that must be justified by the requirement.
* Flag any indication that the requirement may require:

  - new project-wide capability
  - new dependency
  - cross-cutting architectural change

  as a Risk, not a plan.
* When complexity appears justified, do not design the solution here. Simply record that additional implementation effort is likely required.

Task Brief Format

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

Requirements

* Maximum 500 words
* No code
* No architecture digression
* Only information required for execution

Output

TASK_DONE
