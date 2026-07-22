---
name: bug-explore
description: Grill the user relentlessly about a bug while investigating its evidence; generate a fix brief only after shared understanding, without writing code.
user-invocable: true
---

Purpose

Investigate a bug and leave behind a ready-to-fix brief.

Workspace Context

When workspace.yaml exists at the workflow root, read its repository IDs, paths, and descriptions before investigating or changing code.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Do not assume a workflow-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Rules

1. Grill the bug using the Grilling section below.
2. Investigate the bug and gather reproducible evidence. Do not write code or suggest fixes before enough evidence exists.
3. Identify falsifiable root cause hypotheses. Do not call a cause confirmed without evidence that distinguishes it from alternatives.
4. Separate:

   * observed behavior
   * expected behavior
   * assumptions
   * hypotheses

5. Before writing the brief, inspect .ai/decisions/decisions.md if it exists and has entries. Pull in only decisions that materially constrain the observed behavior, expected behavior, or likely root cause.
6. For this workflow, "act on it" means creating the brief.
7. Generate a brief and save it to:

.ai/bugs/active/YYYY-MM-DD-bug-name.md

8. Show the saved brief and stop.

Grilling

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.

Decision Intake

Before finalizing the brief, inspect .ai/decisions/decisions.md if it exists and contains real entries beyond the title.

Use it narrowly:

* extract only active decisions whose Scope and Applies when fields materially constrain this task; use legacy entries without metadata under the same narrow relevance test
* treat superseded and deprecated entries as history, not current constraints, unless the task explicitly needs that history
* ignore unrelated historical notes
* treat the file as a source of durable project invariants, not as a second specification
* if relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation
* if relevant decisions exist, summarize them briefly in Context or Constraints and list their identifiers in brief metadata instead of copying them verbatim

Bug Brief Format

Optional Brief Metadata

Place YAML frontmatter before the first content heading only when it improves retrieval or context selection:

---
areas: [auth]
decisions: [DEC-20260716-token-storage]
working_set: [src/auth, tests/auth]
---

* areas use the same stable project-area vocabulary as decision Scope
* decisions lists only relevant active decision identifiers
* in a workspace, prefix working_set paths with a repository ID, for example frontend/src/auth or api/tests/auth; legacy unprefixed paths remain valid
* working_set is an evidence-based starting scope for reading and modification, never a hard boundary; expand it when facts require and record why in the brief body or Revisions
* omit fields that have no value; legacy briefs without frontmatter remain valid

# Problem

Observed issue.

# Expected Behavior

Expected result.

# Evidence

Supporting observations, including what remains unknown.

# Root Cause Hypotheses

For each hypothesis, record supporting or contradicting evidence, Confidence (High / Medium / Low), and a discriminating check.

# Confirmed Root Cause

Include only when evidence distinguishes the cause from material alternatives. Otherwise state that no cause is confirmed.

# Constraints

Technical limitations.

# Acceptance Criteria

Conditions proving the bug is fixed.

When sufficient evidence exists output:

BUG_READY
