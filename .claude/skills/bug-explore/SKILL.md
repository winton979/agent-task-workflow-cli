---
name: bug-explore
description: Grill the user relentlessly about a bug while investigating its evidence; generate a fix brief only after shared understanding, without writing code.
user-invocable: true
---

Purpose

Investigate a bug and leave behind a ready-to-fix brief.

Rules

1. Grill the bug using the Grilling section below.
2. Investigate the bug and gather reproducible evidence. Do not write code or suggest fixes before enough evidence exists.
3. Identify root cause candidates.
4. Separate:

   * observed behavior
   * expected behavior
   * assumptions

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

* extract only decisions that materially constrain this task
* ignore unrelated historical notes
* treat the file as a source of durable project invariants, not as a second specification
* if relevant decisions exist, summarize them briefly in Context or Constraints instead of copying them verbatim

Bug Brief Format

# Problem

Observed issue.

# Expected Behavior

Expected result.

# Suspected Root Cause

Most likely cause.

# Evidence

Supporting observations.

# Constraints

Technical limitations.

# Acceptance Criteria

Conditions proving the bug is fixed.

When sufficient evidence exists output:

BUG_READY
