import chalk from 'chalk';

const TASK_ACTIVE_DIR = '.ai/tasks/active';
const TASK_ARCHIVE_DIR = '.ai/tasks/archive';
const BUG_ACTIVE_DIR = '.ai/bugs/active';
const BUG_ARCHIVE_DIR = '.ai/bugs/archive';
const DECISIONS_FILE = '.ai/decisions/decisions.md';
const CLAUDE_SKILLS_DIR = '.claude/skills';
const CODEX_SKILLS_DIR = '.codex/skills';
const GITIGNORE_BLOCK = [
  '# task workflow',
  '.ai/tasks/active/*.md',
  '.ai/bugs/active/*.md',
].join('\n');

const GRILLING_GUIDANCE = `Grilling

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.`;

const DECISIONS_READ_GUIDANCE = `Decision Intake

Before finalizing the brief, inspect .ai/decisions/decisions.md if it exists and contains real entries beyond the title.

Use it narrowly:

* extract only active decisions whose Scope and Applies when fields materially constrain this task; use legacy entries without metadata under the same narrow relevance test
* treat superseded and deprecated entries as history, not current constraints, unless the task explicitly needs that history
* ignore unrelated historical notes
* treat the file as a source of durable project invariants, not as a second specification
* if relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation
* if relevant decisions exist, summarize them briefly in Context or Constraints and list their identifiers in brief metadata instead of copying them verbatim`;

const COMPLEXITY_ASSESSMENT_GUIDANCE = `Complexity Assessment

Before finalizing the brief, assess whether the requirement justifies added complexity.

* Treat added complexity as a cost that must be justified by the requirement.
* Flag any indication that the requirement may require:

  - new project-wide capability
  - new dependency
  - cross-cutting architectural change

  as a Risk, not a plan.
* When complexity appears justified, do not design the solution here. Simply record that additional implementation effort is likely required.`;

const MATERIAL_RISK_GUIDANCE = `Material Risk Assessment

Before finalizing the brief, consider whether repository evidence or the requirement makes any of these risks material:

* compatibility or public API changes
* data migration, integrity, or rollback
* security or sensitive-data handling
* performance, memory, or concurrency
* release, deployment, or operational impact

Record only material risks or unknowns with their concrete consequence. Do not turn this into a mandatory checklist or prescribe an implementation.`;

const BRIEF_READINESS_GUIDANCE = `Brief Readiness

Before presenting a brief for confirmation or outputting TASK_READY, verify that:

* the Goal, Acceptance Criteria, material constraints, and material exclusions are sufficient for a fresh implementation session
* every confirmed user decision and execution-critical context that could materially change implementation or validation is recorded
* relevant active decisions do not conflict, and no material user-owned decision remains unresolved
* remaining uncertainty is recorded as a Risk or does not block implementation

Stop asking questions once these conditions hold. Do not turn the brief into a repository snapshot; the implementing agent revalidates current facts.`;

const BRIEF_METADATA_GUIDANCE = `Optional Brief Metadata

Place YAML frontmatter before the first content heading only when it improves retrieval or context selection:

---
areas: [auth]
decisions: [DEC-20260716-token-storage]
working_set: [src/auth, tests/auth]
---

* areas use the same stable project-area vocabulary as decision Scope
* decisions lists only relevant active decision identifiers
* working_set is an evidence-based starting scope for reading and modification, never a hard boundary; expand it when facts require and record why in the brief body or Revisions
* omit fields that have no value; legacy briefs without frontmatter remain valid`;

const CURRENT_DECISION_CHECK_GUIDANCE = `Current Decision Check

Before changing code, inspect .ai/decisions/decisions.md when it contains real entries:

* revalidate every decision identifier named in brief metadata
* extract only active decisions whose Scope and Applies when fields materially constrain the current work; use legacy entries without metadata under the same narrow relevance test
* if a referenced decision is inactive, missing, or contradicted by a newly relevant active decision, surface the conflict and do not choose a winner without user confirmation`;

const PROJECT_EXPLORE_DESCRIPTION = 'Build an evidence-based understanding of the existing project without changing it. Use only when the user explicitly invokes project-explore; do not use for implementation, bug investigation, or formal review.';
const PROJECT_EXPLORE_BODY = `Purpose

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
* For a question about rationale, architecture, or trade-offs, do not conclude from the first matching file. When material evidence is available, corroborate across relevant categories such as defining code, callers or integration points, tests or configuration, and decisions or repository history.
* Stop when the available sources corroborate a bounded conclusion, or state the conflict or Unknown precisely. Do not expand to unrelated areas or read the whole repository merely to eliminate immaterial uncertainty.
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

* extract only active decisions whose Scope and Applies when fields are relevant; use legacy entries without metadata under the same narrow relevance test
* treat superseded and deprecated entries as history, not current constraints, unless the question explicitly needs that history
* treat active decisions as durable constraints, not complete documentation
* verify that current project evidence does not contradict them
* report conflicting active decisions rather than inferring precedence
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
`;

const SKILLS = {
  'project-explore': {
    name: 'project-explore',
    description: PROJECT_EXPLORE_DESCRIPTION,
    content: `---
name: project-explore
description: ${PROJECT_EXPLORE_DESCRIPTION}
user-invocable: true
disable-model-invocation: true
---

${PROJECT_EXPLORE_BODY}`,
    codexContent: `---
name: project-explore
description: ${PROJECT_EXPLORE_DESCRIPTION}
---

${PROJECT_EXPLORE_BODY}`,
    codexAgentContent: `interface:
  display_name: "Project Explore"
  short_description: "Explore existing projects from repository evidence"
  default_prompt: "Use $project-explore to explain the current project from repository evidence."

policy:
  allow_implicit_invocation: false
`,
  },

  'task-fast': {
    name: 'task-fast',
    description: 'Fast path for small requirements. Clarify quickly, create the brief, implement, and verify. Archive automatically on completion.',
    content: `---
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

${DECISIONS_READ_GUIDANCE}

${COMPLEXITY_ASSESSMENT_GUIDANCE}

${MATERIAL_RISK_GUIDANCE}

${BRIEF_READINESS_GUIDANCE}

${CURRENT_DECISION_CHECK_GUIDANCE}

Task Brief Format

${BRIEF_METADATA_GUIDANCE}

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
`,
  },

  'task-explore': {
    name: 'task-explore',
    description: 'Grill the user relentlessly about a requirement; generate an execution brief only after shared understanding, without implementing.',
    content: `---
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

${GRILLING_GUIDANCE}

${DECISIONS_READ_GUIDANCE}

${COMPLEXITY_ASSESSMENT_GUIDANCE}

${MATERIAL_RISK_GUIDANCE}

${BRIEF_READINESS_GUIDANCE}

Task Brief Format

${BRIEF_METADATA_GUIDANCE}

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

* Aim for 500 words or fewer
* Extend to at most 1000 words only when required to preserve execution-critical scope, constraints, risks, or acceptance criteria
* If a coherent contract cannot fit within 1000 words, split the requirement and complete exploration for one independently executable task at a time
* No code
* No architecture design
* Stay implementation-agnostic; describe constraints, not solutions
* Only information required for execution

When complete output:

TASK_READY
`,
  },

  'task-implement': {
    name: 'task-implement',
    description: 'Implement a selected active task brief and validate it. Archive automatically when complete.',
    content: `---
name: task-implement
description: Implement a selected active task brief and validate it. Archive automatically when complete.
user-invocable: true
---

Purpose

Implement the intended task from .ai/tasks/active/.

Rules

1. Identify the intended brief in .ai/tasks/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.
2. Read the selected brief and inspect the relevant current code before planning.
3. Follow the acceptance criteria strictly.
4. Prefer minimal changes.
5. Respect existing project conventions.
6. Avoid unnecessary refactoring.
7. State assumptions explicitly.
8. Validate the result before stopping.
9. If the work is complete, archive the selected brief automatically by moving it to .ai/tasks/archive/.

Brief Sufficiency

Before changing code, and whenever implementation reveals an ambiguity, determine whether the selected brief remains executable against the current project state.

* Investigate facts available from the repository or environment instead of asking the user.
* Treat the brief as the confirmed desired contract and current code, tests, configuration, and direct observations as the source of current behavior. A difference between current behavior and the brief's Goal or Acceptance Criteria is normally the work to implement; surface a conflict only when current facts contradict the brief's recorded Context or Constraints.
* Use optional working_set metadata as an initial investigation scope, not a whitelist. Expand it when evidence requires and record the reason in Context or Revisions.
* For a local, reversible implementation choice that does not materially affect behavior, scope, compatibility, security, data, or acceptance, follow existing conventions and choose the simplest option.
* Do not infer an unresolved user decision that materially affects those concerns. Ask one focused question at a time, include a recommended answer, and wait.
* If relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation.
* After explicit confirmation of a narrow clarification, record its date, exact change, and reason under Revisions in the selected active brief before continuing implementation.
* If clarification materially changes the Goal, accepted scope, or Acceptance Criteria, or the unresolved decisions collectively require material contract revision, stop and require renewed task-explore. Do not implement against an outdated brief.
* If current project state materially contradicts the brief's context, surface the conflict and resolve it under the same rules.

${CURRENT_DECISION_CHECK_GUIDANCE}

When making implementation decisions

* Reuse existing helpers, patterns, and APIs before introducing new ones.
* Before introducing a new abstraction, confirm that extending existing code would not satisfy the requirement.
* Choose the simplest implementation that satisfies the acceptance criteria.
* Introduce a new dependency or abstraction only when no in-project option exists, and state why.
* Do not optimize for hypothetical future reuse.

Output

## Plan

Short implementation plan.

## Changes

Files modified.

## Validation

How acceptance criteria were satisfied.

`,
  },

  'task-audit': {
    name: 'task-audit',
    description: 'Independently audit a completed task implementation against the task brief.',
    content: `---
name: task-audit
description: Independently audit a completed task implementation against the task brief. The objective is to find evidence of failure, not to justify the implementation.
user-invocable: true
---

Purpose

Perform an independent audit of a completed task implementation.

Rules

1. Use the latest matching brief from .ai/tasks/active/ or .ai/tasks/archive/.
2. Inspect the actual implementation via final code and git diff.
3. Begin with a brief-independent scan of the final code and diff. Read the brief only after recording unexpected behavior or scope changes.
4. Use the least implementation context possible: task brief, final code, git diff, and existing tests.
5. Ignore implementation reasoning from the current conversation.
6. Do not prove the implementation correct. Try to invalidate it with evidence.
7. If evidence is unavailable, mark the area UNKNOWN instead of guessing.
8. Run relevant tests when practical. If tests cannot be run, list that under Unknowns.
9. Do not suggest unrelated improvements.
10. Overall Result must be FAIL when any acceptance criterion is FAIL, or when a material UNKNOWN blocks approval.
11. Overall Result may be PASS only when no significant evidence of failure exists.

Audit Phases

0. Unprompted diff scan: before reading the brief, identify behavior changes, unexpected scope, and suspicious changes from final code and git diff.
1. Requirement coverage: for each acceptance criterion, mark PASS, FAIL, or UNKNOWN.
2. Break attempt: construct edge cases, invalid inputs, and unexpected user actions that may violate the brief.
3. Regression analysis: check behavior changes, compatibility issues, state corruption, and hidden side effects.
4. Engineering risk: check maintainability, unnecessary complexity, duplication, performance, memory, concurrency, and security.

Severity

Critical - Causes incorrect behavior or violates requirements.
High - Likely production issue.
Medium - Real issue with limited impact.
Low - Concrete issue with low impact. Do not use Low for preferences.

Output

## Overall Result

PASS or FAIL

## Unprompted Diff Scan

Behavior and scope changes observed before reading the brief.

## Acceptance Criteria

| Criterion | Result | Evidence |
|-----------|--------|----------|

## Findings

For every finding include:

### Severity

Critical / High / Medium / Low

### Issue

What is wrong.

### Evidence

Concrete code, diff, test result, or behavior supporting the finding.

### Impact

Why it matters.

### Confidence

High / Medium / Low

## Unknowns

Areas that cannot be verified from available information.

## Final Assessment

State whether approval is blocked and what remains risky.
`,
  },

  'task-cancel': {
    name: 'task-cancel',
    description: 'Discard the current task analysis output and implementation changes for this attempt.',
    content: `---
name: task-cancel
description: Discard the current task analysis output and implementation changes for this attempt.
user-invocable: true
---

Purpose

Abandon the current task attempt completely.

Rules

1. Target only the current task attempt.
2. Discard the current task brief and any analysis artifacts created for this attempt.
3. Discard code changes made for this attempt.
4. Do not archive the task brief.
5. Do not keep partial implementation.
6. Do not preserve temporary conclusions from this attempt as accepted decisions.
7. Do not touch unrelated historical archives, other active briefs, or user-authored changes outside this attempt.
8. If the exact changed files are uncertain, stop and ask for confirmation before deleting or reverting anything.

Output

TASK_CANCELLED
`,
  },

  'bug-explore': {
    name: 'bug-explore',
    description: 'Grill the user relentlessly about a bug while investigating its evidence; generate a fix brief only after shared understanding, without writing code.',
    content: `---
name: bug-explore
description: Grill the user relentlessly about a bug while investigating its evidence; generate a fix brief only after shared understanding, without writing code.
user-invocable: true
---

Purpose

Investigate a bug and leave behind a ready-to-fix brief.

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

${GRILLING_GUIDANCE}

${DECISIONS_READ_GUIDANCE}

Bug Brief Format

${BRIEF_METADATA_GUIDANCE}

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
`,
  },

  'bug-fix': {
    name: 'bug-fix',
    description: 'Fix a selected active bug brief and validate the result. Archive automatically when complete.',
    content: `---
name: bug-fix
description: Fix a selected active bug brief and validate the result. Archive automatically when complete.
user-invocable: true
---

Purpose

Fix the intended bug from .ai/bugs/active/.

Rules

1. Identify the intended brief in .ai/bugs/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.
2. Recheck current behavior and the brief's evidence before changing code.
3. Minimize changes.
4. Avoid unrelated refactoring.
5. Correct a confirmed root cause rather than a symptom. When the brief has only hypotheses, do not report one as confirmed; validate the behavioral correction and state the remaining uncertainty.
6. Preserve existing behavior.
7. Explain reasoning.
8. Validate the fix before stopping.
9. If the bug is fixed, archive the brief automatically by moving it to .ai/bugs/archive/.

${CURRENT_DECISION_CHECK_GUIDANCE}

When making implementation decisions

* Extend existing behavior before introducing new abstractions.
* Prefer the smallest behavioral correction that resolves the confirmed root cause or, when no cause is confirmed, the accepted behavioral failure.
* Introduce new dependencies only when existing project capabilities cannot reasonably solve the problem.

Output

## Cause Status

Confirmed cause or unresolved hypotheses and confidence.

## Fix

Changes made.

## Validation

Verification performed.

`,
  },

  'bug-audit': {
    name: 'bug-audit',
    description: 'Independently audit a completed bug fix against the bug brief and available cause evidence.',
    content: `---
name: bug-audit
description: Independently audit a completed bug fix against the bug brief and available cause evidence. The objective is to find evidence of failure, not to justify the implementation.
user-invocable: true
---

Purpose

Perform an independent audit of a completed bug fix.

Rules

1. Use the latest matching brief from .ai/bugs/active/ or .ai/bugs/archive/.
2. Inspect the actual fix via final code and git diff.
3. Use the least implementation context possible: bug brief, final code, git diff, and existing tests.
4. Ignore implementation reasoning from the current conversation.
5. Do not prove the fix correct. Try to invalidate it with evidence.
6. If evidence is unavailable, mark the area UNKNOWN instead of guessing.
7. Run relevant tests when practical. If tests cannot be run, list that under Unknowns.
8. Do not suggest unrelated improvements.
9. Overall Result must be FAIL when confirmed-cause validation is FAIL, any acceptance criterion is FAIL, or a material UNKNOWN blocks approval.
10. Overall Result may be PASS only when no significant evidence of failure exists.

Audit Phases

1. Cause and hypothesis validation: determine whether a confirmed cause was eliminated or whether the evidence supports the behavioral correction while a cause remains unconfirmed.
2. Acceptance criteria coverage: for each criterion, mark PASS, FAIL, or UNKNOWN.
3. Break attempt: construct inputs or flows that reproduce the old bug or expose adjacent failures.
4. Regression analysis: check behavior changes, compatibility issues, state corruption, and hidden side effects.
5. Engineering risk: check maintainability, unnecessary complexity, duplication, performance, memory, concurrency, and security.

Severity

Critical - Confirmed root cause not fixed or requirement violated.
High - Likely production issue.
Medium - Real issue with limited impact.
Low - Concrete issue with low impact. Do not use Low for preferences.

Output

## Overall Result

PASS or FAIL

## Cause and Hypothesis Validation

PASS / FAIL / UNKNOWN, with evidence and any remaining uncertainty.

## Acceptance Criteria

| Criterion | Result | Evidence |
|-----------|--------|----------|

## Findings

For every finding include:

### Severity

Critical / High / Medium / Low

### Issue

What is wrong.

### Evidence

Concrete code, diff, test result, or behavior supporting the finding.

### Impact

Why it matters.

### Confidence

High / Medium / Low

## Unknowns

Areas that cannot be verified from available information.

## Final Assessment

State whether approval is blocked and what remains risky.
`,
  },

  'bug-cancel': {
    name: 'bug-cancel',
    description: 'Discard the current bug analysis output and code changes for this attempt.',
    content: `---
name: bug-cancel
description: Discard the current bug analysis output and code changes for this attempt.
user-invocable: true
---

Purpose

Abandon the current bug-fix attempt completely.

Rules

1. Target only the current bug-fix attempt.
2. Discard the current bug brief and any analysis artifacts created for this attempt.
3. Discard code changes made for this attempt.
4. Do not archive the bug brief.
5. Do not keep partial fixes.
6. Do not preserve temporary conclusions from this attempt as accepted decisions.
7. Do not touch unrelated historical archives, other active briefs, or user-authored changes outside this attempt.
8. If the exact changed files are uncertain, stop and ask for confirmation before deleting or reverting anything.

Output

BUG_CANCELLED
`,
  },

  'decision-log': {
    name: 'decision-log',
    description: 'Record durable decisions with scope and lifecycle metadata. Require explicit user confirmation before changing an existing decision.',
    content: `---
name: decision-log
description: Record durable decisions with scope and lifecycle metadata. Require explicit user confirmation before changing an existing decision.
user-invocable: true
---

Purpose

Record important implementation decisions.

Workflow

1. Decide whether the candidate meets the Selection Standard.
2. Draft a concise entry using the Entry Format and inspect related existing decisions.
3. Show the draft and any overlap, conflict, or supersession to the user.
4. Do NOT create or modify an entry yet. Wait for explicit user confirmation.
5. After confirmation, append the approved new entry or apply only the approved change to an existing entry.

Selection Standard

Bias toward not writing. A decision belongs here only when leaving it undocumented would make a future task or bug exploration materially more likely to choose the wrong path.

Record only durable constraints such as:

* project invariants that will likely constrain future work
* rejected alternatives someone could plausibly retry later
* externally forced choices such as compatibility, compliance, vendor, or performance limits
* intentional behavior that looks incorrect unless explained

Do not record:

* one-off implementation details
* local cleanup notes or TODOs
* temporary workarounds that are not yet accepted long-term behavior
* facts already made obvious by code, tests, or tooling
* constraints that disappeared after later simplification or optimization

If unsure, skip the entry.

Save Location

.ai/decisions/decisions.md

Entry Format

## DEC-YYYYMMDD-descriptive-slug

Status: active
Scope: auth, api
Applies when: all supported configurations
Supersedes: -
Superseded by: -

### Problem

What issue was encountered.

### Decision

What was chosen.

### Reason

Why this choice was made.

### Alternatives Considered

What alternatives were rejected.

Requirements

* Use a stable DEC-YYYYMMDD-descriptive-slug identifier for every new entry
* Status is active, superseded, or deprecated. Record only approved decisions; do not create drafts in this file
* Scope uses concise, stable project-area terms. Use global only when a decision genuinely applies across the project
* Applies when distinguishes versions, environments, clients, or other conditions when Scope alone is insufficient
* Supersedes and Superseded by name a prior or successor DEC identifier, or - when there is none
* Maximum 14 nonblank lines per decision
* After confirmation, default to appending a new active entry
* Prefer fewer, harder decisions over broad coverage
* One decision should capture one durable constraint, not a mixed summary
* If a new entry appears to revise, merge with, or supersede an existing decision, do not edit or append yet
* Instead, show the relevant prior entry, explain the overlap or conflict, and ask the user whether to append, revise, merge, supersede, or skip
* After explicit confirmation to supersede, append the new active entry and update the prior entry's Status to superseded and Superseded by reference
* If two active entries overlap and conflict, stop and ask the user to resolve, narrow Applies when, or supersede one; never choose automatically
* Only modify an existing entry after explicit user confirmation
* Legacy date-based entries remain valid historical context. Do not bulk-migrate them without a user request
* Keep concise
`,
  },

  'decision-sweep-weekly': {
    name: 'decision-sweep-weekly',
    description: 'Weekly sweep of recent task and bug briefs to propose durable decision entries with lifecycle metadata.',
    content: `---
name: decision-sweep-weekly
description: Weekly sweep of recent task and bug briefs to propose durable decision entries with lifecycle metadata.
user-invocable: true
---

Purpose

Batch-review the past week of work and sediment only the decisions that outlive a single task. Replaces per-task reminders with one weekly pass.

When to Run

Run once per week, ideally on Friday. May also run ad-hoc after a busy stretch.

Workflow

1. Scan briefs created in the last 7 days under .ai/tasks/archive/ and .ai/bugs/archive/. Filter by filename date prefix YYYY-MM-DD. If a brief lacks a date prefix, fall back to filesystem mtime.
2. For cancelled briefs in either archive, treat the abandonment itself as potential decision material.
3. Evaluate each brief against the Sediment Conditions below.
4. For each candidate, draft a decision entry using the lifecycle metadata format.
5. Bias toward skip. Produce a draft only when the decision is clearly durable and likely to matter again.
6. Present a single review list: every scanned brief with a verdict (write / skip / insufficient info), then the proposed drafts grouped at the end.
7. For every skip, give a short reason such as one-off detail, already encoded in code, no future constraint, or still unsettled.
8. Do NOT append anything yet. Wait for the user to confirm which drafts to keep, edit, or drop.
9. If a proposed draft appears to overlap with, conflict with, or refine an existing decision, include that prior entry in the review and present explicit options such as append as new, revise existing, merge, supersede, or skip.
10. Only after confirmation, apply the approved action for each draft. Default to appending new active DEC entries oldest first; revise, merge, supersede, deprecate, or remove only when the user explicitly selects that action.
11. Report what was appended, revised, merged, superseded, and skipped.

Sediment Conditions

A brief becomes a decision entry if it satisfies any of:

* Cross-task impact: the choice constrains how future tasks must be written.
* A concrete alternative was rejected and someone could plausibly pick it later.
* Counter-intuitive choice: code reads like an anti-pattern but is intentional.
* Externally driven: compliance, performance, compatibility, or a third-party API limit forced the call.
* A cancelled attempt whose failure is itself a useful conclusion.
* Without the note, a future explore step would likely need to rediscover the same constraint.

Skip Conditions

* Affects only the implementation detail of one task.
* A temporary or unsettled conclusion.
* A bare fact with no decision behind it.
* Already obvious from code, tests, tooling, or existing project structure.
* A constraint that was later simplified away, optimized away, or otherwise stopped mattering.
* Too vague to guide a future task.

Entry Format

## DEC-YYYYMMDD-descriptive-slug

Status: active
Scope: concise project areas
Applies when: all supported configurations or a concrete condition
Supersedes: -
Superseded by: -

### Problem

What issue was encountered.

### Decision

What was chosen.

### Reason

Why this choice was made.

### Alternatives Considered

What alternatives were rejected.

Requirements

* Maximum 14 nonblank lines per decision
* Default to appending new active entries
* Use a stable DEC-YYYYMMDD-descriptive-slug identifier for every new entry
* When superseding, update the prior entry to Status: superseded and name its successor only after explicit user confirmation
* If active entries conflict, propose a resolution, a narrower Applies when condition, or supersession; never choose automatically
* Legacy date-based entries remain valid. Do not bulk-migrate them without a user request
* Never edit, merge, supersede, deprecate, or delete prior entries without explicit user confirmation
`,
  },

  'decision-curate': {
    name: 'decision-curate',
    description: 'Audit .ai/decisions/decisions.md and propose removing, merging, or tightening stale, duplicate, or low-value entries. Only apply changes after explicit user confirmation.',
    content: `---
name: decision-curate
description: Audit .ai/decisions/decisions.md and propose removing, merging, or tightening stale, duplicate, or low-value entries. Only apply changes after explicit user confirmation.
user-invocable: true
---

Purpose

Keep .ai/decisions/decisions.md narrow enough that future exploration can find active constraints quickly and trace historical changes only when needed.

Workflow

1. Read .ai/decisions/decisions.md.
2. Inspect the current codebase only as needed to judge whether each decision still represents a live constraint.
3. Classify each entry as keep active, tighten, supersede, deprecate, merge, or remove.
4. Bias toward removal when an entry is stale, duplicate, too local, too vague, or no longer changes future implementation choices. Preserve a concise superseded entry when it explains an active decision's lineage.
5. Present a review list with every entry, its classification, and a short reason.
6. Flag every pair of active entries whose Scope and Applies when conditions overlap but whose decisions conflict. Propose a resolution, a narrower applicability condition, or supersession.
7. When proposing tighten, supersede, deprecate, merge, or remove, quote or summarize the exact affected entry so the user can approve safely.
8. Do NOT modify the file yet. Wait for explicit user confirmation on each proposed change set.
9. After confirmation, apply only the approved edits and preserve unrelated entries.
10. Summarize what was kept active, tightened, superseded, deprecated, merged, removed, and why.

Retention Standard

Keep an active entry only if it still acts as a durable project constraint or explains an intentional choice a future task could otherwise get wrong. Keep a superseded entry only when its link to an active successor explains material history.

Removal Candidates

* one-off implementation details
* decisions already enforced clearly by code, tests, or tooling
* duplicate or near-duplicate entries
* vague notes that do not change future choices
* constraints invalidated by later refactors, simplifications, or performance work
* historical context that belongs in task or bug archives instead
* active entries with no Scope, no applicable condition where one is needed, or a conflict with another active entry

Requirements

* Default to proposing, not editing
* Never remove or rewrite an entry without explicit user confirmation
* Prefer deleting low-value entries over rewriting them into longer prose
* Do not automatically add metadata to legacy entries; propose targeted migration only when it materially improves retrieval
* Keep the remaining file concise and high-signal
`,
  },
};

const LEGACY_MANAGED_SKILL_NAMES = [
  'task-review',
  'bug-review',
];
const MANAGED_SKILL_NAMES = [
  ...Object.values(SKILLS).map((skill) => skill.name),
  ...LEGACY_MANAGED_SKILL_NAMES,
];

function skillArtifacts(skillRoot, skill) {
  const artifacts = [{
    relativePath: 'SKILL.md',
    content: skillRoot === CODEX_SKILLS_DIR && skill.codexContent
      ? skill.codexContent
      : skill.content,
  }];

  if (skillRoot === CODEX_SKILLS_DIR && skill.codexAgentContent) {
    artifacts.push({
      relativePath: 'agents/openai.yaml',
      content: skill.codexAgentContent,
    });
  }

  return artifacts;
}

function logCheck(log, ok, label, detail) {
  if (ok) {
    log.chalk.green(`  OK   ${label}${detail ? ` - ${detail}` : ''}`);
    return;
  }
  console.log(chalk.yellow(`  WARN ${label}${detail ? ` - ${detail}` : ''}`));
}

function ensureDir(fs, path, baseDir, relativeDir, log) {
  const full = path.join(baseDir, relativeDir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    log.chalk.green(`  ✓ ${relativeDir}`);
    return;
  }
  log.chalk.dim(`  - ${relativeDir} (exists)`);
}

function ensureFile(fs, path, filePath, content, log) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    log.chalk.green(`  ✓ ${path.relative(process.cwd(), filePath)}`);
    return;
  }
  log.chalk.dim(`  - ${path.relative(process.cwd(), filePath)} (exists)`);
}

function installSkills(fs, path, cwd, skillRoot, log) {
  ensureDir(fs, path, cwd, skillRoot, log);
  for (const skill of Object.values(SKILLS)) {
    const skillDir = path.join(cwd, skillRoot, skill.name);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    let created = false;
    for (const artifact of skillArtifacts(skillRoot, skill)) {
      const artifactPath = path.join(skillDir, artifact.relativePath);
      if (fs.existsSync(artifactPath)) {
        continue;
      }

      fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
      fs.writeFileSync(artifactPath, artifact.content);
      created = true;
    }

    const label = `${skillRoot}/${skill.name}`;
    created ? log.chalk.green(`  ✓ ${label}`) : log.chalk.dim(`  - ${label} (exists)`);
  }
}

function removeManagedSkills(fs, path, cwd, skillRoot, log) {
  const rootPath = path.join(cwd, skillRoot);
  if (!fs.existsSync(rootPath)) {
    log.chalk.dim(`  - ${skillRoot} (missing)`);
    return;
  }

  for (const skillName of MANAGED_SKILL_NAMES) {
    const skillDir = path.join(rootPath, skillName);
    if (!fs.existsSync(skillDir)) {
      log.chalk.dim(`  - ${skillRoot}/${skillName} (missing)`);
      continue;
    }

    fs.rmSync(skillDir, { recursive: true, force: true });
    log.chalk.green(`  ✓ removed ${skillRoot}/${skillName}`);
  }
}

function updateGitignore(fs, path, cwd, log) {
  const gitignorePath = path.join(cwd, '.gitignore');
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  if (existing.includes('# task workflow')) {
    log.chalk.dim('  - .gitignore (task workflow block exists)');
    return;
  }

  const prefix = existing.trimEnd();
  const next = prefix ? `${prefix}\n\n${GITIGNORE_BLOCK}\n` : `${GITIGNORE_BLOCK}\n`;
  fs.writeFileSync(gitignorePath, next);
  log.chalk.green('  ✓ .gitignore updated');
}

export function init(cwd, { fs, path, log }) {
  const dirs = [
    '.ai',
    TASK_ACTIVE_DIR,
    TASK_ARCHIVE_DIR,
    BUG_ACTIVE_DIR,
    BUG_ARCHIVE_DIR,
    '.ai/decisions',
  ];

  log.info('Creating directory structure...');
  for (const dir of dirs) {
    ensureDir(fs, path, cwd, dir, log);
  }

  const decisionsPath = path.join(cwd, DECISIONS_FILE);
  ensureFile(fs, path, decisionsPath, '# Decisions Log\n\n', log);

  log.info('\nInstalling workflow skills...');
  installSkills(fs, path, cwd, CLAUDE_SKILLS_DIR, log);
  installSkills(fs, path, cwd, CODEX_SKILLS_DIR, log);

  log.info('\nUpdating ignore rules...');
  updateGitignore(fs, path, cwd, log);

  log.info(`\nTask workflow initialized. Recommended flows:
  explore: project-explore
  fast:  task-fast
  task:  task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:   bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  cancel: task-cancel | bug-cancel
  other: decision-log | decision-curate
  sweep: decision-sweep-weekly`);
}

export function refresh(cwd, { fs, path, log }) {
  const dirs = [
    '.ai',
    TASK_ACTIVE_DIR,
    TASK_ARCHIVE_DIR,
    BUG_ACTIVE_DIR,
    BUG_ARCHIVE_DIR,
    '.ai/decisions',
  ];

  log.info('Ensuring directory structure...');
  for (const dir of dirs) {
    ensureDir(fs, path, cwd, dir, log);
  }

  const decisionsPath = path.join(cwd, DECISIONS_FILE);
  ensureFile(fs, path, decisionsPath, '# Decisions Log\n\n', log);

  log.info('\nRefreshing managed workflow skills...');
  removeManagedSkills(fs, path, cwd, CLAUDE_SKILLS_DIR, log);
  removeManagedSkills(fs, path, cwd, CODEX_SKILLS_DIR, log);
  installSkills(fs, path, cwd, CLAUDE_SKILLS_DIR, log);
  installSkills(fs, path, cwd, CODEX_SKILLS_DIR, log);

  log.info('\nUpdating ignore rules...');
  updateGitignore(fs, path, cwd, log);

  log.info(`\nTask workflow refreshed. Managed skills reinstalled:
  explore: project-explore
  fast:  task-fast
  task:  task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:   bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  cancel: task-cancel | bug-cancel
  other: decision-log | decision-curate
  sweep: decision-sweep-weekly`);
}

export function doctor(cwd, { fs, path, log }) {
  const checks = [];
  const requiredDirs = [
    '.ai',
    TASK_ACTIVE_DIR,
    TASK_ARCHIVE_DIR,
    BUG_ACTIVE_DIR,
    BUG_ARCHIVE_DIR,
    '.ai/decisions',
    CLAUDE_SKILLS_DIR,
    CODEX_SKILLS_DIR,
  ];

  log.info('Checking task workflow setup...');

  for (const dir of requiredDirs) {
    const full = path.join(cwd, dir);
    const exists = fs.existsSync(full);
    checks.push(exists);
    logCheck(log, exists, dir, exists ? 'present' : 'missing');
  }

  const decisionsPath = path.join(cwd, DECISIONS_FILE);
  const decisionsExists = fs.existsSync(decisionsPath);
  checks.push(decisionsExists);
  logCheck(log, decisionsExists, DECISIONS_FILE, decisionsExists ? 'present' : 'missing');

  for (const skillRoot of [CLAUDE_SKILLS_DIR, CODEX_SKILLS_DIR]) {
    for (const skill of Object.values(SKILLS)) {
      for (const artifact of skillArtifacts(skillRoot, skill)) {
        const artifactPath = path.join(cwd, skillRoot, skill.name, artifact.relativePath);
        const label = artifact.relativePath === 'SKILL.md'
          ? `${skillRoot}/${skill.name}`
          : `${skillRoot}/${skill.name}/${artifact.relativePath}`;
        if (!fs.existsSync(artifactPath)) {
          checks.push(false);
          logCheck(log, false, label, 'missing');
          continue;
        }

        const content = fs.readFileSync(artifactPath, 'utf-8');
        const matches = content === artifact.content;
        checks.push(matches);
        logCheck(
          log,
          matches,
          label,
          matches ? 'current' : 'outdated, run `task refresh`'
        );
      }
    }

    for (const skillName of LEGACY_MANAGED_SKILL_NAMES) {
      const legacySkillDir = path.join(cwd, skillRoot, skillName);
      if (!fs.existsSync(legacySkillDir)) {
        continue;
      }

      checks.push(false);
      logCheck(log, false, `${skillRoot}/${skillName}`, 'legacy managed skill, run `task refresh`');
    }
  }

  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignore = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';
  const hasGitignoreBlock = gitignore.includes(GITIGNORE_BLOCK);
  checks.push(hasGitignoreBlock);
  logCheck(
    log,
    hasGitignoreBlock,
    '.gitignore',
    hasGitignoreBlock ? 'task workflow rules present' : 'missing task workflow rules'
  );

  const okCount = checks.filter(Boolean).length;
  const totalCount = checks.length;
  const allGood = okCount === totalCount;

  log.info(`\nSummary: ${okCount}/${totalCount} checks passed.`);
  if (allGood) {
    log.chalk.green('Task workflow is healthy.');
    return;
  }

  console.log(chalk.yellow('Recommended next step: run `task refresh` to reinstall managed skills and repair setup.'));
}
