import chalk from 'chalk';
import { execFileSync } from 'node:child_process';

const TASK_ACTIVE_DIR = '.ai/tasks/active';
const TASK_ARCHIVE_DIR = '.ai/tasks/archive';
const BUG_ACTIVE_DIR = '.ai/bugs/active';
const BUG_ARCHIVE_DIR = '.ai/bugs/archive';
const DECISIONS_FILE = '.ai/decisions/decisions.md';
const WORKSPACE_FILE = 'workspace.yaml';
const WORKSPACE_LOCAL_FILE = 'workspace.local.yaml';
const WORKSPACE_VERSION = 1;
const CLAUDE_SKILLS_DIR = '.claude/skills';
const CODEX_SKILLS_DIR = '.codex/skills';
const GITIGNORE_BLOCK = [
  '# task workflow',
  '.ai/tasks/active/*.md',
  '.ai/bugs/active/*.md',
  WORKSPACE_LOCAL_FILE,
].join('\n');

const WORKSPACE_CONTEXT_GUIDANCE = `Workspace Context

Before reading or writing any .ai path, determine the workflow state root. Managed skills are discovered from the launch root, but a launch-root workspace.yaml may declare context_repository. When it does:

1. Resolve that repository ID from the launch-root workspace.yaml, honoring launch-root workspace.local.yaml when present.
2. Verify that its resolved directory exists and is a Git repository root. If it is missing or invalid, stop and report the configuration error; never fall back to a launch-root .ai directory.
3. Treat the selected repository as the workflow state root. Read its workspace.yaml and workspace.local.yaml for the business repository map, and resolve every .ai path in this skill from that directory.

Without context_repository, the launch root remains the workflow state root and its workspace manifest is the repository map.

Retain the resulting absolute canonical directory as \`workflowStateRoot\`. Every .ai read, write, move, or delete must use an absolute path below \`<workflowStateRoot>/.ai\`. Never use a relative \`.ai/...\` path, infer the state root from the current command directory, or choose an existing .ai directory in a nested or registered repository.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Treat repositories whose resolved disabled flag is true as unavailable for routine development in the current cycle. Do not select, inspect, index, or include them in a working set unless the user explicitly asks about that repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Changing the command directory never changes \`workflowStateRoot\`. Do not assume a workflow-state-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.`;

const GRILLING_GUIDANCE = `Grilling

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.`;

const DECISIONS_READ_GUIDANCE = `Decision Intake

Before finalizing the brief, inspect \`<workflowStateRoot>/.ai/decisions/decisions.md\` if it exists and contains real entries beyond the title.

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

const BRIEF_METADATA_GUIDANCE = `Brief Metadata

Before saving a new brief, identify evidence-backed values for areas, relevant active decisions, and the working set. When one or more values exist, YAML frontmatter MUST appear before the first content heading. Do not omit frontmatter merely because some fields have no value:

---
areas: [auth]
decisions: [DEC-20260716-token-storage]
working_set: [src/auth, tests/auth]
---

* areas use the same stable project-area vocabulary as decision Scope
* decisions lists only relevant active decision identifiers
* for work that spans workspace repositories, working_set must list repository-ID-prefixed paths, for example frontend/src/auth or api/tests/auth; legacy unprefixed paths remain valid
* working_set is an evidence-based starting scope for reading and modification, never a hard boundary; expand it when facts require and record why in the brief body or Revisions
* omit fields that have no value; do not add empty placeholders
* omit frontmatter only when none of these fields has an evidence-backed value; legacy briefs without frontmatter remain valid`;

const CURRENT_DECISION_CHECK_GUIDANCE = `Current Decision Check

Before planning or changing code, inspect \`<workflowStateRoot>/.ai/decisions/decisions.md\` when it contains real entries:

* revalidate every decision identifier named in brief metadata
* extract only active decisions whose Scope and Applies when fields materially constrain the current work; use legacy entries without metadata under the same narrow relevance test
* if a referenced decision is inactive, missing, or contradicted by a newly relevant active decision, surface the conflict and do not choose a winner without user confirmation`;

const TASK_BRIEF_SELECTION_RULE = 'Identify the intended brief in .ai/tasks/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.';
const BUG_BRIEF_SELECTION_RULE = 'Identify the intended brief in .ai/bugs/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.';

const TASK_EXECUTION_CONSTRAINT_GUIDANCE = `Implementation Constraints

* Follow the acceptance criteria strictly.
* Prefer minimal changes and respect existing project conventions.
* Avoid unrelated refactoring.
* State assumptions explicitly.
* Define the validation required before work can be reported complete.`;

const BUG_FIX_CONSTRAINT_GUIDANCE = `Fix Constraints

* Follow the Expected Behavior and Acceptance Criteria strictly.
* Minimize changes and preserve existing behavior.
* Avoid unrelated refactoring.
* State assumptions explicitly.
* Explain material reasoning.
* Define the validation required before the fix can be reported complete.`;

const TASK_BRIEF_SUFFICIENCY_GUIDANCE = `Brief Sufficiency

Before planning or changing code, and whenever planning or implementation reveals an ambiguity, determine whether the selected brief remains executable against the current project state.

* Investigate facts available from the repository or environment instead of asking the user.
* Treat the brief as the confirmed desired contract and current code, tests, configuration, and direct observations as the source of current behavior. A difference between current behavior and the brief's Goal or Acceptance Criteria is normally the work to implement; surface a conflict only when current facts contradict the brief's recorded Context or Constraints.
* Use optional working_set metadata as an initial investigation scope, not a whitelist. Expand it when evidence requires.
* For a local, reversible implementation choice that does not materially affect behavior, scope, compatibility, security, data, or acceptance, follow existing conventions and choose the simplest option.
* Do not infer an unresolved user decision that materially affects those concerns. Ask one focused question at a time, include a recommended answer, and wait.
* If relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation.
* If clarification materially changes the Goal, accepted scope, or Acceptance Criteria, or the unresolved decisions collectively require material contract revision, stop and require renewed task-explore. Do not continue against an outdated brief.
* If current project state materially contradicts the brief's context, surface the conflict and resolve it under the same rules.`;

const TASK_IMPLEMENTATION_RECORD_GUIDANCE = `When implementation expands the working set, record the reason in the selected active brief's Context or Revisions. After explicit confirmation of a narrow clarification, record its date, exact change, and reason under Revisions in the selected active brief before continuing implementation.`;

const TASK_IMPLEMENTATION_DECISION_GUIDANCE = `When making implementation decisions

* Reuse existing helpers, patterns, and APIs before introducing new ones.
* Before introducing a new abstraction, confirm that extending existing code would not satisfy the requirement.
* Choose the simplest implementation that satisfies the acceptance criteria.
* Introduce a new dependency or abstraction only when no in-project option exists, and state why.
* Do not optimize for hypothetical future reuse.`;

const BUG_FIX_SUFFICIENCY_GUIDANCE = `Fix Sufficiency

Before planning or changing code, determine whether the selected brief remains executable against the current project state.

* Investigate facts available from the repository or environment instead of asking the user.
* Treat the brief's Expected Behavior and Acceptance Criteria as the confirmed desired contract. Current code, tests, configuration, and direct observations describe current behavior.
* Correct a confirmed root cause rather than a symptom. When the brief has only hypotheses, do not report one as confirmed; validate the behavioral correction and state the remaining uncertainty.
* For a local, reversible fix choice that does not materially affect expected behavior, scope, compatibility, security, data, or acceptance, follow existing conventions and choose the smallest correction.
* Do not infer an unresolved user decision that materially affects those concerns. Ask one focused question at a time, include a recommended answer, and wait.
* If relevant active decisions conflict, surface the conflict and do not choose a winner without user confirmation.
* If a choice materially changes Expected Behavior, accepted scope, or Acceptance Criteria, stop and require renewed bug-explore. Do not continue against an outdated brief.
* If current project state materially contradicts the brief's evidence or constraints, surface the conflict and resolve it under the same rules.`;

const BUG_FIX_DECISION_GUIDANCE = `When making fix decisions

* Extend existing behavior before introducing new abstractions.
* Prefer the smallest behavioral correction that resolves the confirmed root cause or, when no cause is confirmed, the accepted behavioral failure.
* Introduce new dependencies only when existing project capabilities cannot reasonably solve the problem.`;

const DECISION_THRESHOLD_GUIDANCE = `Decision Threshold

Ask for confirmation only when the unresolved decision can materially change:

* system behavior
* architecture or system boundaries
* compatibility or public contracts
* long-term maintenance
* risk profile

Do not ask for confirmation for routine local implementation or fix details when existing conventions are sufficient.`;

const TASK_EXECUTION_MODE_GUIDANCE = `Execution Mode

Task-implement supports two execution modes. Default to Direct Execution.

## Direct Execution

Use when:

* the change scope is clear
* the required change is explicit from the brief
* existing project conventions determine the implementation approach
* no meaningful architectural or design choice is introduced

Inspect the brief and relevant context, apply the smallest correct change, and verify the result. Do not introduce planning or confirmation steps unless required by implementation uncertainty.

## Decision-Gated Execution

Use only when implementation choices materially affect the outcome, architecture or compatibility is involved, or user input is required under the Decision Threshold.

Implementation Proposal

Before modifying files, determine whether the implementation requires user confirmation.

Create an Implementation Proposal only when:

* multiple reasonable implementation approaches exist
* the change affects system boundaries
* the change introduces a durable design decision
* the implementation requires assumptions that materially affect the outcome
* the risk of choosing incorrectly is significant

Do not create a proposal when:

* the required change is explicit
* the modification is localized
* an existing project pattern clearly determines the implementation
* the change is routine and low-risk

An Implementation Proposal is a concise modification report, not a request for the user to design the implementation. It should contain only:

## Recommended Action

The concrete implementation direction the agent intends to take.

## Affected Areas

Files, modules, or boundaries likely involved.

## Material Decisions

Only user-owned decisions that materially affect implementation. Omit this section when there is no such decision.

## Risks

Important uncertainties or possible side effects.

## Next Step

State the recommended action and request approval to execute it only because the proposal gate was required. Do not ask the user to choose routine implementation details.

After presenting an Implementation Proposal:

* Wait for user confirmation before modifying files.
* Do not create task artifacts.
* Do not repeat broad discovery after confirmation.
* Use the confirmed proposal as implementation context.`;

const BUG_FIX_STRATEGY_GUIDANCE = `Fix Strategy

Bug-fix defaults to fixing directly when evidence is sufficient and the correction is localized.

Do not delay fixes for immaterial uncertainty. If the root cause is sufficiently supported by evidence and the fix is localized, proceed.

Fix Strategy Proposal

Before modifying files, determine whether the fix strategy requires confirmation.

Request confirmation only when:

* the root cause is uncertain
* multiple fixes have materially different trade-offs
* the fix changes behavior beyond the reported issue
* the fix affects system boundaries or compatibility
* the regression risk is significant

A Fix Strategy Proposal is a concise fix report, not a request for the user to design the repair. It should contain only:

## Root Cause

Observed cause supported by evidence, or the unresolved cause uncertainty.

## Fix Approach

The intended correction.

## Impact

Affected behavior or components.

## Regression Risk

What should be verified.

## Next Step

State the recommended fix strategy and request approval to execute it only because the proposal gate was required. Do not ask the user to choose routine repair details.

After presenting a Fix Strategy Proposal:

* Wait for user confirmation before modifying files.
* Do not create bug artifacts.
* Do not repeat broad discovery after confirmation.
* Use the confirmed proposal as fix context.`;

const PROJECT_EXPLORE_DESCRIPTION = 'Build an evidence-based understanding of the existing project without changing it. Use only when the user explicitly invokes project-explore; do not use for implementation, bug investigation, or formal review.';
const PROJECT_EXPLORE_BODY = `Purpose

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

${WORKSPACE_CONTEXT_GUIDANCE}

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
    description: 'Fast path for obvious small changes or fixes. Create a concise execution brief, implement directly, verify, and archive automatically.',
    content: `---
name: task-fast
description: Fast path for obvious small changes or fixes. Create a concise execution brief, implement directly, verify, and archive automatically.
user-invocable: true
---

Purpose

Handle an obvious small change or fix in one continuous workflow with minimal ceremony.

Use this only when the intended outcome is clear, the likely change is localized, existing project conventions determine the approach, and no material user-owned decision is expected. User invocation of task-fast is authorization to execute directly under those conditions.

If investigation shows the work is not obvious, not localized, or has material uncertainty around behavior, compatibility, data, security, architecture, or risk, stop and recommend task-explore for changed behavior or bug-explore for a non-obvious defect.

${WORKSPACE_CONTEXT_GUIDANCE}

Workflow

1. Read the project code and conventions needed to avoid obvious conflicts.
2. If a fact can be found by exploring the environment, look it up rather than asking the user.
3. Ask only questions whose answers can materially change the implementation or acceptance criteria. Ask them one at a time, waiting for feedback on each before continuing. For each question, provide your recommended answer.
4. Read \`<workflowStateRoot>/.ai/decisions/decisions.md\` if it exists and has entries. Pull in only decisions that materially constrain this work.
5. Create a concise task brief and save it to:

\`<workflowStateRoot>/.ai/tasks/active/YYYY-MM-DD-task-name.md\`

6. Implement the smallest correct change immediately.
7. If implementation needs a narrow confirmed clarification, record it under Revisions. If it materially changes the Goal, accepted scope, or Acceptance Criteria, stop and require task-explore or bug-explore.
8. Verify the result against the acceptance criteria.
9. Archive the brief automatically by moving it to:

\`<workflowStateRoot>/.ai/tasks/archive/YYYY-MM-DD-task-name.md\`

10. Summarize the outcome and any follow-up risks.

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

Relevant project background. For an obvious small bug, include the observed failure and expected behavior briefly.

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

* Maximum 350 words
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

${WORKSPACE_CONTEXT_GUIDANCE}

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

Implement the intended task from .ai/tasks/active/ while deciding when implementation choices require confirmation.

${WORKSPACE_CONTEXT_GUIDANCE}

Rules

1. ${TASK_BRIEF_SELECTION_RULE}
2. Prepare with Brief Sufficiency and Current Decision Check before changing code.
3. Use Execution Mode below to choose direct execution or an Implementation Proposal.
4. Validate the result before reporting the work complete.
5. If the work is complete, archive the selected brief automatically by moving it to .ai/tasks/archive/.

${TASK_BRIEF_SUFFICIENCY_GUIDANCE}

${CURRENT_DECISION_CHECK_GUIDANCE}

${TASK_IMPLEMENTATION_RECORD_GUIDANCE}

${TASK_EXECUTION_CONSTRAINT_GUIDANCE}

${TASK_IMPLEMENTATION_DECISION_GUIDANCE}

${DECISION_THRESHOLD_GUIDANCE}

${TASK_EXECUTION_MODE_GUIDANCE}

Output

If an Implementation Proposal is required, output only the proposal sections from Execution Mode and wait for confirmation. Do not modify files.

After direct execution or confirmed proposal execution, output:

## Plan

Short summary of the implementation path actually used. Do not invent a pre-approval plan for routine work.

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

${WORKSPACE_CONTEXT_GUIDANCE}

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

${WORKSPACE_CONTEXT_GUIDANCE}

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

${WORKSPACE_CONTEXT_GUIDANCE}

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

${WORKSPACE_CONTEXT_GUIDANCE}

Rules

1. ${BUG_BRIEF_SELECTION_RULE}
2. Prepare with Fix Sufficiency and Current Decision Check before changing code.
3. Use Fix Strategy below to choose direct fixing or a Fix Strategy Proposal.
4. Validate the fix before reporting it complete.
5. If the bug is fixed, archive the brief automatically by moving it to .ai/bugs/archive/.

${BUG_FIX_SUFFICIENCY_GUIDANCE}

${CURRENT_DECISION_CHECK_GUIDANCE}

${BUG_FIX_CONSTRAINT_GUIDANCE}

${BUG_FIX_DECISION_GUIDANCE}

${DECISION_THRESHOLD_GUIDANCE}

${BUG_FIX_STRATEGY_GUIDANCE}

Output

If a Fix Strategy Proposal is required, output only the proposal sections from Fix Strategy and wait for confirmation. Do not modify files.

After direct fixing or confirmed proposal execution, output:

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

${WORKSPACE_CONTEXT_GUIDANCE}

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

${WORKSPACE_CONTEXT_GUIDANCE}

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

Record approved stable project constraints. This is not a project knowledge base: task and bug archives retain work history, while code, tests, tooling, configuration, and project documentation retain engineering knowledge. Do not record bug lessons, personal learning, or per-task implementation history.

${WORKSPACE_CONTEXT_GUIDANCE}

Workflow

1. Decide whether the candidate meets the Selection Standard. Reject it if it is only a bug lesson, common engineering practice, or one-task implementation detail.
2. Draft a concise entry using the Entry Format and inspect related existing decisions.
3. Show the draft and any overlap, conflict, or supersession to the user.
4. Do NOT create or modify an entry yet. Wait for explicit user confirmation.
5. After confirmation, append the approved new entry or apply only the approved change to an existing entry.

Selection Standard

Bias toward not writing. A decision belongs here only when it is a stable constraint and leaving it undocumented would make a future task or bug exploration materially more likely to choose the wrong path. Potential usefulness, historical interest, or "might help someday" is insufficient.

Future-choice test: before drafting, name the specific future implementation, exploration, compatibility, or boundary choice this entry would change. If no concrete future choice can be named, skip the entry.

Artifact test: before drafting, check whether current code, tests, tooling, configuration, or project documentation already makes the constraint unambiguous. If it does, skip the decision; add one only for a non-obvious durable rationale or a constraint those artifacts cannot preserve.

Bug count, task count, or review pain is not a selection criterion. A bug may be evidence for a decision, but the bug lesson itself is not the decision. Repeated bugs should usually produce tests, lint rules, code simplification, or one consolidated constraint; they must not produce entries proportional to incident count.

Record only durable constraints such as:

* project invariants that will likely constrain future work
* rejected alternatives someone could plausibly retry later
* externally forced choices such as compatibility, compliance, vendor, or performance limits
* intentional behavior that looks incorrect unless explained

Do not record:

* bug lessons, postmortem notes, or reminders to be more careful
* one-off implementation details
* local cleanup notes or TODOs
* common engineering practices already implied by the codebase, tests, or toolchain
* temporary workarounds that are not yet accepted long-term behavior
* facts already made obvious by code, tests, or tooling
* entries kept only because they may be useful someday
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
* Do not create separate entries for repeated symptoms when one underlying constraint covers them
* A zero-entry outcome is acceptable when no candidate passes the Selection Standard
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
    description: 'On-demand curation of recent task and bug briefs to propose only durable decision entries.',
    content: `---
name: decision-sweep-weekly
description: On-demand curation of recent task and bug briefs to propose only durable decision entries.
user-invocable: true
---

Purpose

Review a bounded recent period and sediment only stable constraints that outlive a single task. This is a curation pass, not a recurring production target: task and bug volume must not create a decision obligation. A sweep that proposes no new decisions is a valid successful outcome.

${WORKSPACE_CONTEXT_GUIDANCE}

When to Run

Run only when the user explicitly requests a curation pass, such as after a busy stretch, while reviewing decision-log quality, or before revisiting a known trade-off. It is not a scheduled weekly requirement and must not be run merely to produce decisions.

Workflow

1. Scan the user-requested time range under .ai/tasks/archive/ and .ai/bugs/archive/. When no range is specified, default to the last 7 days. Filter by filename date prefix YYYY-MM-DD. If a brief lacks a date prefix, fall back to filesystem mtime.
2. For cancelled briefs in either archive, treat the abandonment itself as potential decision material.
3. Group related briefs by the underlying constraint or trade-off before drafting. Repeated symptoms are evidence, not separate decisions.
4. Evaluate each brief or group against the Sediment Conditions below.
5. For each candidate, draft a decision entry using the lifecycle metadata format.
6. Bias toward skip. Produce a draft only when the decision is clearly durable and likely to change a concrete future choice.
7. Present a single review list: every scanned brief with a verdict (write / skip / insufficient info), then the proposed drafts grouped at the end.
8. For every skip, give a short reason such as bug lesson, common practice, one-off detail, already encoded in code, no future constraint, or still unsettled.
9. Do NOT append anything yet. Wait for the user to confirm which drafts to keep, edit, or drop.
10. If a proposed draft appears to overlap with, conflict with, or refine an existing decision, include that prior entry in the review and present explicit options such as append as new, revise existing, merge, supersede, or skip.
11. Only after confirmation, apply the approved action for each draft. Default to appending new active DEC entries oldest first; revise, merge, supersede, deprecate, or remove only when the user explicitly selects that action.
12. Report what was appended, revised, merged, superseded, and skipped.

Sediment Conditions

A brief or related group becomes a decision entry only if it contains a stable constraint, passes the future-choice test, and satisfies any of:

* Cross-task impact: the choice constrains how future tasks must be written.
* A concrete alternative was rejected and someone could plausibly pick it later.
* Counter-intuitive choice: code reads like an anti-pattern but is intentional.
* Externally driven: compliance, performance, compatibility, or a third-party API limit forced the call.
* A cancelled attempt whose failure proves a reusable constraint, not merely that one approach was poorly executed.
* Without the note, a future explore step would likely need to rediscover the same constraint.

Skip Conditions

* Affects only the implementation detail of one task.
* Captures a bug lesson, postmortem reminder, or ordinary mistake instead of a project constraint.
* A temporary or unsettled conclusion.
* A bare fact with no decision behind it.
* Common engineering knowledge or standard practice.
* Already obvious from code, tests, tooling, or existing project structure.
* Kept only because it might be useful someday.
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
* Decision growth must be non-linear with task and bug volume; many related briefs should collapse to one durable constraint or be skipped
* The number of scanned briefs never implies a minimum draft count
* Prefer zero drafts over weak drafts
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

Keep .ai/decisions/decisions.md narrow enough that future exploration can find stable constraints quickly and trace historical changes only when needed. Prune assertively; the file is a curated constraint set, not a complete memory.

${WORKSPACE_CONTEXT_GUIDANCE}

Workflow

1. Read .ai/decisions/decisions.md.
2. Inspect the current codebase only as needed to judge whether each decision still represents a live constraint.
3. Classify each entry as keep active, tighten, supersede, deprecate, merge, or remove.
4. Bias toward removal or merge when an entry is stale, duplicate, too local, too vague, common knowledge, a bug lesson, kept for possible future value, or no longer changes future implementation choices. Preserve a concise superseded entry only when it explains an active decision's lineage.
5. When evidence does not show that an entry changes a concrete future choice, classify it as remove, merge, deprecate, or tighten; do not keep it by default.
6. Present a review list with every entry, its classification, and a short reason.
7. Flag every pair of active entries whose Scope and Applies when conditions overlap but whose decisions conflict. Propose a resolution, a narrower applicability condition, or supersession.
8. When proposing tighten, supersede, deprecate, merge, or remove, quote or summarize the exact affected entry so the user can approve safely.
9. Do NOT modify the file yet. Wait for explicit user confirmation on each proposed change set.
10. After confirmation, apply only the approved edits and preserve unrelated entries.
11. Summarize what was kept active, tightened, superseded, deprecated, merged, removed, and why.

Retention Standard

Keep an active entry only if it still acts as a durable project constraint or explains an intentional choice a future task could otherwise get wrong. It must change a future choice, not merely remind developers to avoid a past mistake. Possible future usefulness is not enough. Keep a superseded entry only when its link to an active successor explains material history.

Removal Candidates

* one-off implementation details
* bug lessons, postmortem notes, or reminders to be careful
* common engineering practices
* decisions already enforced clearly by code, tests, or tooling
* duplicate or near-duplicate entries
* vague notes that do not change future choices
* entries preserved for possible future usefulness rather than a concrete future choice
* constraints invalidated by later refactors, simplifications, or performance work
* historical context that belongs in task or bug archives instead
* active entries with no Scope, no applicable condition where one is needed, or a conflict with another active entry

Requirements

* Default to proposing, not editing
* Never remove or rewrite an entry without explicit user confirmation
* Prefer deleting or merging low-value entries over rewriting them into longer prose
* Do not keep an entry merely because removal feels risky; state the risk and propose the smallest removal, merge, or narrowing that preserves any real constraint
* Do not automatically add metadata to legacy entries; propose targeted migration only when it materially improves retrieval
* Keep the remaining file concise and high-signal
`,
  },
};

const LEGACY_MANAGED_SKILL_NAMES = [
  'task-plan',
  'bug-plan',
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

function reinstallManagedSkills(fs, path, cwd, log) {
  removeManagedSkills(fs, path, cwd, CLAUDE_SKILLS_DIR, log);
  removeManagedSkills(fs, path, cwd, CODEX_SKILLS_DIR, log);
  installSkills(fs, path, cwd, CLAUDE_SKILLS_DIR, log);
  installSkills(fs, path, cwd, CODEX_SKILLS_DIR, log);
}

function updateGitignore(fs, path, cwd, log) {
  const gitignorePath = path.join(cwd, '.gitignore');
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';

  const rules = GITIGNORE_BLOCK.split('\n');
  const missingRules = rules.filter((rule) => !existing.includes(rule));
  if (missingRules.length === 0) {
    log.chalk.dim('  - .gitignore (task workflow block exists)');
    return;
  }

  if (existing.includes('# task workflow')) {
    const prefix = existing.trimEnd();
    fs.writeFileSync(gitignorePath, `${prefix}\n${missingRules.join('\n')}\n`);
    log.chalk.green('  ✓ .gitignore updated');
    return;
  }

  const prefix = existing.trimEnd();
  const next = prefix ? `${prefix}\n\n${GITIGNORE_BLOCK}\n` : `${GITIGNORE_BLOCK}\n`;
  fs.writeFileSync(gitignorePath, next);
  log.chalk.green('  ✓ .gitignore updated');
}

function ensureWorkflowState(fs, path, cwd, log) {
  const dirs = [
    '.ai',
    TASK_ACTIVE_DIR,
    TASK_ARCHIVE_DIR,
    BUG_ACTIVE_DIR,
    BUG_ARCHIVE_DIR,
    '.ai/decisions',
  ];

  for (const dir of dirs) {
    ensureDir(fs, path, cwd, dir, log);
  }

  ensureFile(fs, path, path.join(cwd, DECISIONS_FILE), '# Decisions Log\n\n', log);
}

function hasGitignoreRules(gitignore) {
  return GITIGNORE_BLOCK.split('\n').every((rule) => gitignore.includes(rule));
}

function gitCommandSucceeds(args) {
  try {
    execFileSync('git', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function localWorkspaceIsTracked(path, cwd) {
  return gitCommandSucceeds(['-C', cwd, 'ls-files', '--error-unmatch', '--', WORKSPACE_LOCAL_FILE]);
}

function localWorkspaceIsIgnored(path, cwd) {
  if (!gitRootForDirectory(path, cwd)) {
    return true;
  }
  return gitCommandSucceeds(['-C', cwd, 'check-ignore', '--no-index', '--quiet', '--', WORKSPACE_LOCAL_FILE]);
}

function assertLocalWorkspaceIsWritable(path, cwd) {
  if (localWorkspaceIsTracked(path, cwd)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} is tracked. Remove it from the Git index before changing local workspace settings.`);
  }
  if (!localWorkspaceIsIgnored(path, cwd)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} is not ignored. Run \`task refresh\`, then remove any later negating rule before changing local workspace settings.`);
  }
}

function workflowIsInitialized(fs, path, cwd) {
  try {
    return fs.existsSync(path.join(workflowStateRoot(fs, path, cwd), DECISIONS_FILE));
  } catch {
    return fs.existsSync(path.join(cwd, DECISIONS_FILE));
  }
}

function workspacePath(path, cwd) {
  return path.join(cwd, WORKSPACE_FILE);
}

function localWorkspacePath(path, cwd) {
  return path.join(cwd, WORKSPACE_LOCAL_FILE);
}

function normalizeRepositoryId(id) {
  return typeof id === 'string' ? id.trim() : '';
}

function derivedRepositoryId(path, repositoryRoot) {
  const name = path.basename(repositoryRoot).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(name) ? name : `repo-${name || 'workspace'}`;
}

function validateWorkspace(workspace, path) {
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) {
    throw new Error(`${WORKSPACE_FILE} must contain an object.`);
  }
  if (workspace.version !== WORKSPACE_VERSION) {
    throw new Error(`${WORKSPACE_FILE} must declare version ${WORKSPACE_VERSION}.`);
  }
  if (!Array.isArray(workspace.repositories) || workspace.repositories.length === 0) {
    throw new Error(`${WORKSPACE_FILE} must contain at least one repository.`);
  }

  const repositoryIds = new Set();
  const repositoryPaths = new Set();
  for (const repository of workspace.repositories) {
    const id = normalizeRepositoryId(repository?.id);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) {
      throw new Error(`${WORKSPACE_FILE} repository IDs must use lowercase letters, numbers, and hyphens.`);
    }
    if (repositoryIds.has(id)) {
      throw new Error(`${WORKSPACE_FILE} contains the repository ID "${id}" more than once.`);
    }
    repositoryIds.add(id);

    if (typeof repository.path !== 'string' || !repository.path.trim() || path.isAbsolute(repository.path)) {
      throw new Error(`${WORKSPACE_FILE} repository paths must be non-empty relative paths.`);
    }
    const normalizedPath = path.normalize(repository.path);
    if (repositoryPaths.has(normalizedPath)) {
      throw new Error(`${WORKSPACE_FILE} contains the repository path "${repository.path}" more than once.`);
    }
    repositoryPaths.add(normalizedPath);

    if (repository.description !== undefined
      && (typeof repository.description !== 'string' || !repository.description.trim())) {
      throw new Error(`${WORKSPACE_FILE} repository descriptions must be non-empty strings when provided.`);
    }
    if (repository.disabled !== undefined && typeof repository.disabled !== 'boolean') {
      throw new Error(`${WORKSPACE_FILE} repository disabled flags must be booleans when provided.`);
    }
  }

  if (workspace.context_repository !== undefined) {
    const contextRepositoryId = normalizeRepositoryId(workspace.context_repository);
    if (!/^[a-z][a-z0-9-]*$/.test(contextRepositoryId)) {
      throw new Error(`${WORKSPACE_FILE} context_repository must use a registered repository ID.`);
    }
    if (!repositoryIds.has(contextRepositoryId)) {
      throw new Error(`${WORKSPACE_FILE} context_repository must reference a registered repository ID.`);
    }
  }

  return workspace;
}

function readWorkspace(fs, path, cwd) {
  const manifestPath = workspacePath(path, cwd);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  let workspace;
  try {
    workspace = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    throw new Error(`${WORKSPACE_FILE} must use JSON-compatible YAML: ${error.message}`);
  }

  return validateWorkspace(workspace, path);
}

function writeWorkspace(fs, path, cwd, workspace) {
  validateWorkspace(workspace, path);
  fs.writeFileSync(workspacePath(path, cwd), `${JSON.stringify(workspace, null, 2)}\n`);
}

function validateLocalWorkspace(localWorkspace, workspace) {
  if (!localWorkspace || typeof localWorkspace !== 'object' || Array.isArray(localWorkspace)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must contain an object.`);
  }
  if (localWorkspace.version !== WORKSPACE_VERSION) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must declare version ${WORKSPACE_VERSION}.`);
  }
  if (!localWorkspace.repositories || typeof localWorkspace.repositories !== 'object'
    || Array.isArray(localWorkspace.repositories)) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must contain a repositories object.`);
  }

  const repositoryIds = new Set(workspace.repositories.map((repository) => repository.id));
  for (const [id, repositoryOverride] of Object.entries(localWorkspace.repositories)) {
    if (!repositoryIds.has(id)) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} contains an unknown repository ID "${id}".`);
    }
    if (typeof repositoryOverride === 'string') {
      if (!repositoryOverride.trim()) {
        throw new Error(`${WORKSPACE_LOCAL_FILE} repository paths must be non-empty strings.`);
      }
      continue;
    }
    if (!repositoryOverride || typeof repositoryOverride !== 'object' || Array.isArray(repositoryOverride)) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository overrides must be paths or objects.`);
    }
    if (repositoryOverride.path === undefined && repositoryOverride.disabled === undefined) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository overrides must specify a path or disabled state.`);
    }
    if (repositoryOverride.path !== undefined
      && (typeof repositoryOverride.path !== 'string' || !repositoryOverride.path.trim())) {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository paths must be non-empty strings.`);
    }
    if (repositoryOverride.disabled !== undefined && typeof repositoryOverride.disabled !== 'boolean') {
      throw new Error(`${WORKSPACE_LOCAL_FILE} repository disabled flags must be booleans when provided.`);
    }
  }

  return localWorkspace;
}

function readLocalWorkspace(fs, path, cwd, workspace) {
  const manifestPath = localWorkspacePath(path, cwd);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  let localWorkspace;
  try {
    localWorkspace = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    throw new Error(`${WORKSPACE_LOCAL_FILE} must use JSON-compatible YAML: ${error.message}`);
  }

  return validateLocalWorkspace(localWorkspace, workspace);
}

function writeLocalWorkspace(fs, path, cwd, workspace, localWorkspace) {
  validateLocalWorkspace(localWorkspace, workspace);
  fs.writeFileSync(localWorkspacePath(path, cwd), `${JSON.stringify(localWorkspace, null, 2)}\n`);
}

function resolvedWorkspaceRepositories(workspace, localWorkspace) {
  return workspace.repositories.map((repository) => {
    const localRepository = localWorkspace?.repositories[repository.id];
    const override = typeof localRepository === 'string'
      ? { path: localRepository }
      : localRepository;
    return {
      ...repository,
      path: override?.path ?? repository.path,
      disabled: override?.disabled ?? repository.disabled ?? false,
    };
  });
}

function configuredContextRepository(fs, path, cwd) {
  const workspace = readWorkspace(fs, path, cwd);
  if (!workspace?.context_repository) {
    return null;
  }

  const localWorkspace = readLocalWorkspace(fs, path, cwd, workspace);
  const repository = resolvedWorkspaceRepositories(workspace, localWorkspace)
    .find((candidate) => candidate.id === workspace.context_repository);
  if (repository.disabled) {
    throw new Error(`Configured context repository "${repository.id}" is disabled.`);
  }
  const configuredPath = path.resolve(cwd, repository.path);

  let contextRoot;
  try {
    contextRoot = resolveGitRepository(fs, path, configuredPath);
  } catch (error) {
    throw new Error(`Configured context repository "${repository.id}" is invalid: ${error.message}`);
  }

  if (canonicalPath(fs, path, configuredPath) !== contextRoot) {
    throw new Error(`Configured context repository "${repository.id}" must point to a Git repository root.`);
  }

  return { id: repository.id, root: contextRoot };
}

function workflowStateRoot(fs, path, cwd) {
  return configuredContextRepository(fs, path, cwd)?.root || cwd;
}

function canonicalPath(fs, path, targetPath) {
  return path.resolve(fs.realpathSync(targetPath));
}

function gitRootForDirectory(path, directory) {
  try {
    const output = execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return path.resolve(output.trim());
  } catch {
    return null;
  }
}

function resolveGitRepository(fs, path, candidatePath) {
  if (!fs.existsSync(candidatePath)) {
    throw new Error(`Repository path does not exist: ${candidatePath}`);
  }
  if (!fs.statSync(candidatePath).isDirectory()) {
    throw new Error(`Repository path is not a directory: ${candidatePath}`);
  }

  const gitRoot = gitRootForDirectory(path, candidatePath);
  if (!gitRoot) {
    throw new Error(`Repository path is not inside a Git worktree: ${candidatePath}`);
  }

  return canonicalPath(fs, path, gitRoot);
}

function relativeRepositoryPath(path, workflowRoot, repositoryRoot) {
  const relativePath = path.relative(workflowRoot, repositoryRoot) || '.';
  if (path.isAbsolute(relativePath)) {
    throw new Error('Repository must be on the same volume as the workflow root so it can use a portable relative path.');
  }
  return relativePath.split(path.sep).join('/');
}

function workspaceRepository(path, workflowRoot, repositoryRoot, id, description) {
  const repository = {
    id,
    path: relativeRepositoryPath(path, workflowRoot, repositoryRoot),
  };
  if (description) {
    repository.description = description;
  }
  return repository;
}

function hasRepositoryRoot(fs, path, cwd, repositories, repositoryRoot, excludedId) {
  return repositories.some((repository) => {
    if (repository.id === excludedId) {
      return false;
    }
    const configuredPath = path.resolve(cwd, repository.path);
    if (!fs.existsSync(configuredPath) || !fs.statSync(configuredPath).isDirectory()) {
      return configuredPath === repositoryRoot;
    }

    const configuredRoot = gitRootForDirectory(path, configuredPath);
    return configuredRoot && canonicalPath(fs, path, configuredRoot) === repositoryRoot;
  });
}

export function addRepo(cwd, repositoryPath, options, { fs, path, log }) {
  if (!workflowIsInitialized(fs, path, cwd)) {
    throw new Error('Task workflow is not initialized here. Run `task init` first.');
  }

  const workflowRoot = canonicalPath(fs, path, cwd);
  const repositoryRoot = resolveGitRepository(fs, path, path.resolve(workflowRoot, repositoryPath));
  const existingWorkspace = readWorkspace(fs, path, workflowRoot);
  const isWorkspacePromotion = !existingWorkspace;
  const workspace = existingWorkspace || {
    version: WORKSPACE_VERSION,
    repositories: [],
  };

  if (!existingWorkspace) {
    const currentRepositoryRoot = gitRootForDirectory(path, workflowRoot);
    if (currentRepositoryRoot && canonicalPath(fs, path, currentRepositoryRoot) === workflowRoot
      && repositoryRoot !== workflowRoot) {
      const rootId = derivedRepositoryId(path, workflowRoot);
      workspace.repositories.push(workspaceRepository(path, workflowRoot, workflowRoot, rootId));
    }
  }

  const localWorkspace = existingWorkspace
    ? readLocalWorkspace(fs, path, workflowRoot, existingWorkspace)
    : null;
  const repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  if (hasRepositoryRoot(fs, path, workflowRoot, repositories, repositoryRoot)) {
    throw new Error(`Repository is already registered: ${repositoryRoot}`);
  }

  const id = normalizeRepositoryId(options.id || derivedRepositoryId(path, repositoryRoot));
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error('Repository ID must use lowercase letters, numbers, and hyphens, starting with a letter.');
  }
  if (workspace.repositories.some((repository) => repository.id === id)) {
    throw new Error(`Repository ID is already registered: ${id}`);
  }

  const description = options.description?.trim();
  if (options.description !== undefined && !description) {
    throw new Error('Repository description cannot be empty.');
  }

  workspace.repositories.push(workspaceRepository(path, workflowRoot, repositoryRoot, id, description));
  writeWorkspace(fs, path, workflowRoot, workspace);
  log.chalk.green(`  ✓ ${WORKSPACE_FILE}`);
  log.info(`Added repository ${id}: ${relativeRepositoryPath(path, workflowRoot, repositoryRoot)}`);

  if (isWorkspacePromotion) {
    log.info('\nRefreshing managed workflow skills for workspace context...');
    reinstallManagedSkills(fs, path, workflowRoot, log);
  }
}

export function useContext(cwd, id, { fs, path, log }) {
  if (!workflowIsInitialized(fs, path, cwd)) {
    throw new Error('Task workflow is not initialized here. Run `task init` first.');
  }

  const workflowRoot = canonicalPath(fs, path, cwd);
  const workspace = readWorkspace(fs, path, workflowRoot);
  if (!workspace) {
    throw new Error(`No ${WORKSPACE_FILE} found. Run \`task add-repo\` before selecting a context repository.`);
  }

  const repositoryId = normalizeRepositoryId(id);
  const localWorkspace = readLocalWorkspace(fs, path, workflowRoot, workspace);
  const repository = resolvedWorkspaceRepositories(workspace, localWorkspace)
    .find((candidate) => candidate.id === repositoryId);
  if (!repository) {
    throw new Error(`Unknown workspace repository ID: ${id}`);
  }
  if (repository.disabled) {
    throw new Error(`Cannot select disabled workspace repository as context: ${repositoryId}`);
  }

  const configuredPath = path.resolve(workflowRoot, repository.path);
  const contextRoot = resolveGitRepository(fs, path, configuredPath);
  if (canonicalPath(fs, path, configuredPath) !== contextRoot) {
    throw new Error('Context repository path must point to a Git repository root.');
  }

  workspace.context_repository = repositoryId;
  writeWorkspace(fs, path, workflowRoot, workspace);
  log.chalk.green(`  ✓ ${WORKSPACE_FILE}`);
  log.info(`Selected context repository ${repositoryId}: ${repository.path}`);

  log.info('\nEnsuring context workflow state...');
  ensureWorkflowState(fs, path, contextRoot, log);

  log.info('\nRefreshing managed workflow skills for context routing...');
  reinstallManagedSkills(fs, path, workflowRoot, log);

  log.info('\nUpdating ignore rules...');
  updateGitignore(fs, path, workflowRoot, log);
  if (contextRoot !== workflowRoot) {
    updateGitignore(fs, path, contextRoot, log);
  }
}

export function bindRepo(cwd, id, repositoryPath, { fs, path, log }) {
  if (!workflowIsInitialized(fs, path, cwd)) {
    throw new Error('Task workflow is not initialized here. Run `task init` first.');
  }

  const workflowRoot = canonicalPath(fs, path, cwd);
  const workspace = readWorkspace(fs, path, workflowRoot);
  if (!workspace) {
    throw new Error(`No ${WORKSPACE_FILE} found. Run \`task add-repo\` before binding a local repository path.`);
  }

  const repositoryId = normalizeRepositoryId(id);
  if (!workspace.repositories.some((repository) => repository.id === repositoryId)) {
    throw new Error(`Unknown workspace repository ID: ${id}`);
  }
  assertLocalWorkspaceIsWritable(path, workflowRoot);

  const repositoryRoot = resolveGitRepository(
    fs,
    path,
    path.resolve(workflowRoot, repositoryPath)
  );
  const localWorkspace = readLocalWorkspace(fs, path, workflowRoot, workspace) || {
    version: WORKSPACE_VERSION,
    repositories: {},
  };
  const localPath = path.isAbsolute(repositoryPath)
    ? repositoryRoot.split(path.sep).join('/')
    : (path.relative(workflowRoot, repositoryRoot) || '.').split(path.sep).join('/');
  const existingOverride = localWorkspace.repositories[repositoryId];
  if (existingOverride && typeof existingOverride === 'object') {
    existingOverride.path = localPath;
  } else {
    localWorkspace.repositories[repositoryId] = localPath;
  }

  const repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  if (hasRepositoryRoot(fs, path, workflowRoot, repositories, repositoryRoot, repositoryId)) {
    throw new Error(`Repository is already bound to another workspace repository: ${repositoryRoot}`);
  }

  writeLocalWorkspace(fs, path, workflowRoot, workspace, localWorkspace);
  log.chalk.green(`  ✓ ${WORKSPACE_LOCAL_FILE}`);
  log.info(`Bound repository ${repositoryId}: ${localPath}`);
}

export function setRepoDisabled(cwd, id, disabled, { local, fs, path, log }) {
  if (!workflowIsInitialized(fs, path, cwd)) {
    throw new Error('Task workflow is not initialized here. Run `task init` first.');
  }

  const workflowRoot = canonicalPath(fs, path, cwd);
  const workspace = readWorkspace(fs, path, workflowRoot);
  if (!workspace) {
    throw new Error(`No ${WORKSPACE_FILE} found. Run \`task add-repo\` before changing repository status.`);
  }

  const repositoryId = normalizeRepositoryId(id);
  const repository = workspace.repositories.find((candidate) => candidate.id === repositoryId);
  if (!repository) {
    throw new Error(`Unknown workspace repository ID: ${id}`);
  }
  if (disabled && workspace.context_repository === repositoryId) {
    throw new Error(`Cannot disable configured context repository: ${repositoryId}`);
  }

  if (local) {
    assertLocalWorkspaceIsWritable(path, workflowRoot);
    const localWorkspace = readLocalWorkspace(fs, path, workflowRoot, workspace) || {
      version: WORKSPACE_VERSION,
      repositories: {},
    };
    const existingOverride = localWorkspace.repositories[repositoryId];
    const localPath = typeof existingOverride === 'string'
      ? existingOverride
      : existingOverride?.path;
    localWorkspace.repositories[repositoryId] = {
      ...(localPath === undefined ? {} : { path: localPath }),
      disabled,
    };
    writeLocalWorkspace(fs, path, workflowRoot, workspace, localWorkspace);
    log.chalk.green(`  ✓ ${WORKSPACE_LOCAL_FILE}`);
    log.info(`${disabled ? 'Disabled' : 'Enabled'} repository ${repositoryId} locally.`);
    return;
  }

  if (disabled) {
    repository.disabled = true;
  } else {
    delete repository.disabled;
  }
  writeWorkspace(fs, path, workflowRoot, workspace);
  log.chalk.green(`  ✓ ${WORKSPACE_FILE}`);
  log.info(`${disabled ? 'Disabled' : 'Enabled'} repository ${repositoryId} in the workspace manifest.`);
}

export function listRepos(cwd, { fs, path, log }) {
  const workspace = readWorkspace(fs, path, cwd);
  if (!workspace) {
    log.info(`No ${WORKSPACE_FILE} found. This workflow uses the existing single-project mode.`);
    return [];
  }

  const localWorkspace = readLocalWorkspace(fs, path, cwd, workspace);
  const repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  log.info('Workspace repositories:');
  for (const repository of repositories) {
    const description = repository.description ? ` - ${repository.description}` : '';
    const status = repository.disabled ? 'disabled' : 'enabled';
    log.info(`  ${repository.id}\t${repository.path}${description} [${status}]`);
  }
  return repositories;
}

function doctorWorkspace(fs, path, cwd, log) {
  const manifestPath = workspacePath(path, cwd);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  let workspace;
  let repositories;
  try {
    workspace = readWorkspace(fs, path, cwd);
    const localWorkspace = readLocalWorkspace(fs, path, cwd, workspace);
    repositories = resolvedWorkspaceRepositories(workspace, localWorkspace);
  } catch (error) {
    const label = error.message.startsWith(WORKSPACE_LOCAL_FILE)
      ? WORKSPACE_LOCAL_FILE
      : WORKSPACE_FILE;
    logCheck(log, false, label, error.message);
    return [false];
  }

  const checks = [true];
  logCheck(log, true, WORKSPACE_FILE, `version ${workspace.version}`);
  const registeredRoots = new Map();

  for (const repository of repositories) {
    const label = `workspace repository ${repository.id}`;
    if (repository.disabled) {
      checks.push(true);
      logCheck(log, true, label, 'disabled');
      continue;
    }
    const configuredPath = path.resolve(cwd, repository.path);
    if (!fs.existsSync(configuredPath) || !fs.statSync(configuredPath).isDirectory()) {
      checks.push(false);
      logCheck(log, false, label, `missing at ${repository.path}`);
      continue;
    }

    const gitRoot = gitRootForDirectory(path, configuredPath);
    if (!gitRoot) {
      checks.push(false);
      logCheck(log, false, label, `not a Git worktree at ${repository.path}`);
      continue;
    }

    const configuredRoot = canonicalPath(fs, path, configuredPath);
    const actualRoot = canonicalPath(fs, path, gitRoot);
    if (configuredRoot !== actualRoot) {
      checks.push(false);
      logCheck(log, false, label, `path must point to Git root (${repository.path})`);
      continue;
    }
    if (registeredRoots.has(actualRoot)) {
      checks.push(false);
      logCheck(log, false, label, `duplicates ${registeredRoots.get(actualRoot)}`);
      continue;
    }

    registeredRoots.set(actualRoot, repository.id);
    checks.push(true);
    logCheck(log, true, label, repository.path);
  }

  return checks;
}

export function init(cwd, { fs, path, log }) {
  const stateRoot = workflowStateRoot(fs, path, cwd);

  log.info('Creating directory structure...');
  ensureWorkflowState(fs, path, stateRoot, log);

  log.info('\nInstalling workflow skills...');
  installSkills(fs, path, cwd, CLAUDE_SKILLS_DIR, log);
  installSkills(fs, path, cwd, CODEX_SKILLS_DIR, log);

  log.info('\nUpdating ignore rules...');
  updateGitignore(fs, path, cwd, log);
  if (stateRoot !== cwd) {
    updateGitignore(fs, path, stateRoot, log);
  }

  log.info(`\nTask workflow initialized. Recommended flows:
  explore: project-explore
  fast:  task-fast
  task:  task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:   bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  cancel: task-cancel | bug-cancel
  other: decision-log | decision-curate
  sweep: decision-sweep-weekly (on demand)`);
}

export function refresh(cwd, { fs, path, log }) {
  const stateRoot = workflowStateRoot(fs, path, cwd);

  log.info('Ensuring directory structure...');
  ensureWorkflowState(fs, path, stateRoot, log);

  log.info('\nRefreshing managed workflow skills...');
  reinstallManagedSkills(fs, path, cwd, log);

  log.info('\nUpdating ignore rules...');
  updateGitignore(fs, path, cwd, log);
  if (stateRoot !== cwd) {
    updateGitignore(fs, path, stateRoot, log);
  }

  log.info(`\nTask workflow refreshed. Managed skills reinstalled:
  explore: project-explore
  fast:  task-fast
  task:  task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:   bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  cancel: task-cancel | bug-cancel
  other: decision-log | decision-curate
  sweep: decision-sweep-weekly (on demand)`);
}

export function doctor(cwd, { fs, path, log }) {
  const checks = [];
  let context = null;
  let stateRoot = cwd;
  let contextIsValid = true;
  try {
    context = configuredContextRepository(fs, path, cwd);
    if (context) {
      stateRoot = context.root;
      logCheck(log, true, 'context_repository', `${context.id}`);
    }
  } catch (error) {
    contextIsValid = false;
    stateRoot = null;
    checks.push(false);
    logCheck(log, false, 'context_repository', error.message);
  }

  const requiredStateDirs = [
    '.ai',
    TASK_ACTIVE_DIR,
    TASK_ARCHIVE_DIR,
    BUG_ACTIVE_DIR,
    BUG_ARCHIVE_DIR,
    '.ai/decisions',
  ];

  log.info('Checking task workflow setup...');

  if (contextIsValid) {
    for (const dir of requiredStateDirs) {
      const full = path.join(stateRoot, dir);
      const exists = fs.existsSync(full);
      checks.push(exists);
      const label = context ? `context/${dir}` : dir;
      logCheck(log, exists, label, exists ? 'present' : 'missing');
    }

    const decisionsPath = path.join(stateRoot, DECISIONS_FILE);
    const decisionsExists = fs.existsSync(decisionsPath);
    checks.push(decisionsExists);
    logCheck(log, decisionsExists, context ? `context/${DECISIONS_FILE}` : DECISIONS_FILE, decisionsExists ? 'present' : 'missing');
  }

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
  const hasGitignoreBlock = hasGitignoreRules(gitignore);
  const localWorkspaceIgnored = localWorkspaceIsIgnored(path, cwd);
  const localWorkspaceTracked = localWorkspaceIsTracked(path, cwd);
  const hasSafeLocalWorkspaceConfig = localWorkspaceIgnored && !localWorkspaceTracked;
  checks.push(hasGitignoreBlock && hasSafeLocalWorkspaceConfig);
  logCheck(
    log,
    hasGitignoreBlock && hasSafeLocalWorkspaceConfig,
    '.gitignore',
    hasGitignoreBlock && hasSafeLocalWorkspaceConfig
      ? 'task workflow rules present'
      : 'missing or ineffective task workflow rules'
  );

  checks.push(...doctorWorkspace(fs, path, cwd, log));
  if (contextIsValid && context && stateRoot !== cwd) {
    const contextGitignorePath = path.join(stateRoot, '.gitignore');
    const contextGitignore = fs.existsSync(contextGitignorePath)
      ? fs.readFileSync(contextGitignorePath, 'utf-8')
      : '';
    const contextHasGitignoreBlock = hasGitignoreRules(contextGitignore);
    const contextLocalWorkspaceIgnored = localWorkspaceIsIgnored(path, stateRoot);
    const contextLocalWorkspaceTracked = localWorkspaceIsTracked(path, stateRoot);
    const contextHasSafeLocalWorkspaceConfig = contextLocalWorkspaceIgnored && !contextLocalWorkspaceTracked;
    checks.push(contextHasGitignoreBlock && contextHasSafeLocalWorkspaceConfig);
    logCheck(
      log,
      contextHasGitignoreBlock && contextHasSafeLocalWorkspaceConfig,
      'context/.gitignore',
      contextHasGitignoreBlock && contextHasSafeLocalWorkspaceConfig
        ? 'task workflow rules present'
        : 'missing or ineffective task workflow rules'
    );
    checks.push(...doctorWorkspace(fs, path, stateRoot, log));
  }

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
