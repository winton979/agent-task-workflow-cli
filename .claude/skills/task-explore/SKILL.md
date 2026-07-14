---
name: task-explore
description: Grill the user relentlessly about a requirement; generate an execution brief only after shared understanding, without implementing.
user-invocable: true
---

Purpose

Clarify requirements and leave behind a ready-to-execute brief.

Workflow

1. Grill the requirement using the Grilling section below.
2. Do not write code or create implementation details.
3. Before writing the brief, inspect .ai/decisions/decisions.md if it exists and has entries. Pull in only decisions that materially constrain this task.
4. For this workflow, "act on it" means creating the brief.
5. Generate a concise task brief and save it to:

.ai/tasks/active/YYYY-MM-DD-task-name.md

6. Show the saved brief and stop.

Grilling

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.

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
* No architecture design
* Stay implementation-agnostic; describe constraints, not solutions
* Only information required for execution

When complete output:

TASK_READY
