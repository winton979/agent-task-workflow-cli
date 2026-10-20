import chalk from 'chalk';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import {
  WORKSPACE_CONSTANTS,
  logCheck,
  ensureDir,
  ensureWorkflowState,
  workflowIsInitialized,
  workflowStateRoot,
  doctorWorkspace,
  localWorkspaceGitignoreStatus,
  hasGitignoreBlock,
  ensureLocalWorkspaceIgnored,
  getConfigRepository,
  addRepo as workspaceAddRepo,
  useContext as workspaceUseContext,
  bindRepo as workspaceBindRepo,
  setRepoDisabled as workspaceSetRepoDisabled,
  listRepos as workspaceListRepos,
} from './workspace.js';

const {
  TASK_ACTIVE_DIR,
  TASK_ARCHIVE_DIR,
  BUG_ACTIVE_DIR,
  BUG_ARCHIVE_DIR,
  DECISIONS_FILE,
  WORKSPACE_FILE,
  WORKSPACE_LOCAL_FILE,
} = WORKSPACE_CONSTANTS;

const SKILL_TARGETS = {
  agents: '.agents/skills',
  claude: '.claude/skills',
  codex: '.codex/skills',
};
const GLOBAL_CONFIG_FILE = '.task-cli/config.json';
const LEGACY_LOCAL_SKILL_ROOTS = ['.claude/skills', '.codex/skills'];
const GITIGNORE_BLOCK = [
  '# task workflow',
  '.ai/tasks/active/*.md',
  '.ai/bugs/active/*.md',
  WORKSPACE_LOCAL_FILE,
].join('\n');

const WORKSPACE_CONTEXT_GUIDANCE = `Workspace Context

Before reading or writing any .ai path, determine the workflow state root from the launch root. A launch-root workspace.yaml may declare context_repository. When it does:

1. Resolve that repository ID from the launch-root workspace.yaml, honoring launch-root workspace.local.yaml when present.
2. Verify that its resolved directory exists and is a Git repository root. If it is missing or invalid, stop and report the configuration error; never fall back to a launch-root .ai directory.
3. Treat the selected repository as the workflow state root. Read its workspace.yaml and workspace.local.yaml for the business repository map, and resolve every .ai path in this skill from that directory.

Without context_repository, the launch root remains the workflow state root and its workspace manifest is the repository map.

Retain the resulting absolute canonical directory as \`workflowStateRoot\`. Every .ai read, write, move, or delete must use an absolute path below \`<workflowStateRoot>/.ai\`. Never use a relative \`.ai/...\` path, infer the state root from the current command directory, or choose an existing .ai directory in a nested or registered repository.

Optional Project Glossary

Use \`<workflowStateRoot>/GLOSSARY.md\` as the optional, single glossary of canonical project-specific terms. If it does not exist, use \`<workflowStateRoot>/CONTEXT.md\` for compatibility. Do not merge the two files or rename an existing glossary automatically. Do not infer \`GLOSSARY-MAP.md\` or \`CONTEXT-MAP.md\` support or search registered repositories for separate glossaries.

* When this file exists and terms relevant to the current work are in question, read it with the relevant project artifacts.
* A glossary entry defines what one project-specific concept is in one or two sentences and may name avoided synonyms. It is not a decision log, Evidence Ledger, or implementation diary.
* \`task init\` and \`task refresh\` never create either file. Do not create or edit either file as part of a task or bug workflow.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Treat repositories whose resolved disabled flag is true as unavailable for routine development in the current cycle. Do not select, inspect, index, or include them in a working set unless the user explicitly asks about that repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Changing the command directory never changes \`workflowStateRoot\`. Do not assume a workflow-state-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.`;

const GRILLING_GUIDANCE = `Grilling

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

\`\`\`
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
\`\`\`

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.`;

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

const DIRECT_COMPLETION_GUIDANCE = `Direct Completion Check

Before grilling, creating an artifact, or changing code, make a bounded inspection of the relevant repository paths, conventions, tests, and active decisions that clearly apply to the changed area. A user's claim that work is simple is a lead, not sufficient evidence.

Use Direct Completion only when all of these are true:

* the requested or expected behavior is explicit and can be validated
* repository evidence bounds the change to a trivial, narrow patch, not merely a local or single-module implementation
* existing code and conventions determine the implementation approach
* no unresolved decision affects behavior, scope, compatibility, security, data, architecture, or long-term maintenance
* a focused validation can demonstrate the result
* for a reported defect, evidence identifies the faulty behavior and the local correction

Direct Completion is a proof obligation, not a confidence score. Establish the absence of material ambiguity from the request, repository evidence, and applicable decisions. Any ambiguity that cannot be ruled out is an unresolved decision; do not use Direct Completion based on an unverified assumption.

For Direct Completion, apply the smallest correct change, run focused validation, and report the outcome in the current response. Reading a relevant existing decision does not require an artifact. Do not create, update, or require a task, bug, or decision artifact.`;

const TASK_EXPLORATION_WORKFLOW_GUIDANCE = `Full Task Exploration

Use this when Direct Completion does not qualify. Continue in the current invocation:

1. Grill the requirement using the Grilling section below.
2. Do not write code or create implementation details before shared understanding is confirmed.
3. Before writing the brief, inspect \`<workflowStateRoot>/.ai/decisions/decisions.md\` if it exists and has entries. Pull in only decisions that materially constrain this task.
4. Create a concise task brief at \`<workflowStateRoot>/.ai/tasks/active/YYYY-MM-DD-task-name.md\`.
5. Show the saved brief and stop.

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

Business or technical limitations.

# Risks

Potential pitfalls.

# Acceptance Criteria

Clear success conditions.

Requirements

* Aim for 500 words or fewer.
* Extend to at most 1000 words only when required to preserve execution-critical scope, constraints, risks, or acceptance criteria.
* If a coherent contract cannot fit within 1000 words, split the requirement and complete exploration for one independently executable task at a time.
* No code or architecture design.
* Include only information required for execution.

When complete output:

TASK_READY`;

const BUG_DIAGNOSTIC_LOOP_GUIDANCE = `Diagnostic Loop

For a non-direct Bug, establish a tight feedback loop before confirming a root cause or outputting BUG_READY. The loop is a named command, test, script, replay, or harness that has already run and can go red on the user's exact symptom and green after its correction.

1. Build the narrowest practical loop from an existing test seam, a focused service or CLI invocation, a browser check, a captured replay, or a throwaway harness. Make it fast, deterministic, and unattended where possible. For an intermittent failure, record and improve its reproduction rate rather than claiming determinism.
2. Redact credentials, tokens, personal data, and authorization headers from commands, output, logs, and captured artifacts before recording or showing them.
3. Reproduce the reported symptom through the loop, then minimize the scenario until the remaining inputs, configuration, and steps are load-bearing. Do not substitute a nearby failure.
4. When material root-cause alternatives remain, record ranked, falsifiable hypotheses. Each one must name the predicted observation and its discriminating check. Change one variable per probe; do not turn an untested hypothesis into a Confirmed Root Cause.
5. When no suitable loop can be established, state what was tried and request the missing environment access, redacted artifact, or permission for temporary instrumentation. Do not output BUG_READY or claim a confirmed root cause until evidence becomes sufficient.`;

const BUG_EXPLORATION_WORKFLOW_GUIDANCE = `Full Bug Exploration

Use this when Direct Completion does not qualify. Continue in the current invocation:

1. Grill the bug using the Grilling section below.
2. Investigate the bug and gather reproducible evidence. Do not write code or suggest fixes before enough evidence exists.
3. Identify falsifiable root-cause hypotheses. Do not call a cause confirmed without evidence that distinguishes it from alternatives.
4. Separate observed behavior, expected behavior, assumptions, and hypotheses.
5. Before writing the brief, inspect \`<workflowStateRoot>/.ai/decisions/decisions.md\` if it exists and has entries. Pull in only decisions that materially constrain the observed behavior, expected behavior, or likely root cause.
6. Create a concise bug brief at \`<workflowStateRoot>/.ai/bugs/active/YYYY-MM-DD-bug-name.md\`.
7. Show the saved brief and stop.

${GRILLING_GUIDANCE}

${DECISIONS_READ_GUIDANCE}

${BUG_DIAGNOSTIC_LOOP_GUIDANCE}

Bug Brief Format

${BRIEF_METADATA_GUIDANCE}

# Problem

Observed issue.

# Expected Behavior

Expected result.

# Evidence

Supporting observations, including what remains unknown.

For a non-direct bug, also record the diagnostic loop command or script, the exact red-capable symptom it asserts, its relevant environment or fixture, and the observed determinism or reproduction rate. Keep only redacted command output and captured artifacts. When minimization is possible, record the smallest reproducing scenario and its load-bearing inputs.

# Root Cause Hypotheses

For each hypothesis, record supporting or contradicting evidence, Confidence (High / Medium / Low), and a discriminating check.

# Confirmed Root Cause

Include only when evidence distinguishes the cause from material alternatives. Otherwise state that no cause is confirmed.

# Constraints

Technical limitations.

# Acceptance Criteria

Conditions proving the bug is fixed.

When sufficient evidence exists output:

BUG_READY`;

const TASK_FAST_ESCALATION_GUIDANCE = `Automatic Escalation

When Direct Completion does not qualify, classify the request once:

* a suspected incorrect behavior uses the Bug route
* every other request uses the Task route

Select exactly one escalation route. Apply only the selected route, and do not create or update an artifact for the unselected route.

## Task route

${TASK_EXPLORATION_WORKFLOW_GUIDANCE}

## Bug route

${BUG_EXPLORATION_WORKFLOW_GUIDANCE}`;

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

const BUG_REGRESSION_LOOP_GUIDANCE = `Regression Loop

For a Bug Brief that records a diagnostic loop:

1. Re-run the recorded loop before changing code to confirm the reported symptom still goes red. If the current evidence no longer reproduces it, surface that contradiction instead of claiming a fix.
2. When a correct test seam can exercise the minimized real bug pattern, turn that scenario into a failing regression test before the fix, observe it fail, then observe it pass after the correction. A shallow test that cannot exercise the real pattern is not acceptable evidence; state when no correct seam exists.
   If the red is forced by mutating code or a fixture, diff against a pristine copy to prove the mutation landed before trusting the failure. Restore the temporary mutation before validating the actual fix.
3. Re-run the original diagnostic loop after the correction. Preserve the redacted evidence and result under # Fix Evidence in the Bug Brief.
4. Tag any temporary diagnostic logging or instrumentation with one unique prefix. Before archiving, search for that prefix and remove all temporary instrumentation; do not leave debugging scaffolding in the completed fix.`;

const AUDIT_STANDARDS_GUIDANCE = `Repository Standards

Search the relevant repositories for every file that documents how the changed code should be written, including applicable AGENTS.md or CLAUDE.md instructions. When CODING_STANDARDS.md or CONTRIBUTING.md exists, include it among the standards sources. Apply each source only within its scope. Cite the applicable rule and concrete evidence for a standards finding; do not turn personal preferences into requirements.

For a mechanical violation, inspect the existing lint, typecheck, test, and CI commands before recommending a new rule. Prefer a deterministic check over more prose when it can catch the violation. Report missing or unwired checks only when they materially affect this change; do not add hooks or CI during the audit.`;

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
* recording an approved durable decision: state that no managed workflow covers it
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
    description: 'Adaptively complete a small change or fix, or automatically enter full exploration when repository evidence shows it is not direct work.',
    content: `---
name: task-fast
description: Adaptively complete a small change or fix, or automatically enter full exploration when repository evidence shows it is not direct work.
user-invocable: true
---

Purpose

Handle a requested change or fix in one invocation: complete verified direct work with minimal ceremony, or automatically enter the appropriate full exploration when it is not direct work.

${WORKSPACE_CONTEXT_GUIDANCE}

${DIRECT_COMPLETION_GUIDANCE}

If Direct Completion qualifies, implement and validate it now, then output TASK_DONE. Do not create an artifact.

If it does not qualify, do not ask the user to choose another skill or rerun the request. Continue in this invocation with Automatic Escalation.

${TASK_FAST_ESCALATION_GUIDANCE}
`,
  },

  'task-explore': {
    name: 'task-explore',
    description: 'Complete a verified trivial task directly, or grill and record a non-trivial requirement for later implementation.',
    content: `---
name: task-explore
description: Complete a verified trivial task directly, or grill and record a non-trivial requirement for later implementation.
user-invocable: true
---

Purpose

Complete trivial, unambiguous tasks directly. For work that needs a user decision or broader exploration, leave behind a ready-to-execute brief.

${WORKSPACE_CONTEXT_GUIDANCE}

${DIRECT_COMPLETION_GUIDANCE}

If Direct Completion qualifies, implement and validate it now, then output TASK_DONE. Do not create an artifact.

${TASK_EXPLORATION_WORKFLOW_GUIDANCE}
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

${AUDIT_STANDARDS_GUIDANCE}

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
    description: 'Fix a verified trivial bug directly, or investigate and record a non-trivial bug for later repair.',
    content: `---
name: bug-explore
description: Fix a verified trivial bug directly, or investigate and record a non-trivial bug for later repair.
user-invocable: true
---

Purpose

Fix a verified, local bug directly. For a bug that needs broader evidence or a user decision, leave behind a ready-to-fix brief.

${WORKSPACE_CONTEXT_GUIDANCE}

${DIRECT_COMPLETION_GUIDANCE}

If Direct Completion qualifies, fix and validate it now, then output BUG_DONE. Do not create an artifact.

${BUG_EXPLORATION_WORKFLOW_GUIDANCE}
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
5. If the bug is fixed, append # Fix Evidence to the active brief before archiving: record the completion date, validation results, the diagnostic-loop result when one exists, and the confirmed cause or remaining uncertainty. Then move it to .ai/bugs/archive/.

${BUG_FIX_SUFFICIENCY_GUIDANCE}

${CURRENT_DECISION_CHECK_GUIDANCE}

${BUG_FIX_CONSTRAINT_GUIDANCE}

${BUG_REGRESSION_LOOP_GUIDANCE}

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

${AUDIT_STANDARDS_GUIDANCE}

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


};

const LEGACY_MANAGED_SKILL_NAMES = [
  'task-plan',
  'bug-plan',
  'task-review',
  'bug-review',
  'effort-explore',
  'effort-spec',
  'effort-implement',
  'decision-log',
  'decision-sweep-weekly',
  'decision-curate',
];
const MANAGED_SKILL_NAMES = [
  ...Object.values(SKILLS).map((skill) => skill.name),
  ...LEGACY_MANAGED_SKILL_NAMES,
];

function skillArtifacts(target, skill) {
  const artifacts = [{
    relativePath: 'SKILL.md',
    content: target !== 'claude' && skill.codexContent
      ? skill.codexContent
      : skill.content,
  }];


  if (target === 'codex' && skill.codexAgentContent) {
    artifacts.push({
      relativePath: 'agents/openai.yaml',
      content: skill.codexAgentContent,
    });
  }

  return artifacts;
}

function resolveSkillTarget(targetName) {
  const normalized = typeof targetName === 'string' && targetName.startsWith('.')
    ? targetName.slice(1)
    : targetName;
  if (!Object.prototype.hasOwnProperty.call(SKILL_TARGETS, normalized)) {
    throw new Error(`Unknown skill target "${targetName}". Expected one of: ${Object.keys(SKILL_TARGETS).join(', ')}.`);
  }
  return normalized;
}

function globalConfigPath(path) {
  return path.join(os.homedir(), GLOBAL_CONFIG_FILE);
}

function readSkillTargetsConfig(fs, path) {
  const configPath = globalConfigPath(path);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return [];
  }
  const targets = Array.isArray(parsed.skillTargets) ? parsed.skillTargets : [];
  return targets.filter((t) => Object.prototype.hasOwnProperty.call(SKILL_TARGETS, t));
}

function writeSkillTargetsConfig(fs, path, skillTargets) {
  const configPath = globalConfigPath(path);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify({ skillTargets }, null, 2)}\n`);
}

function installSkills(fs, path, baseDir, target, log, labelPrefix = '') {
  const skillRoot = SKILL_TARGETS[target];
  ensureDir(fs, path, baseDir, skillRoot, log);
  for (const skill of Object.values(SKILLS)) {
    const skillDir = path.join(baseDir, skillRoot, skill.name);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    let created = false;
    for (const artifact of skillArtifacts(target, skill)) {
      const artifactPath = path.join(skillDir, artifact.relativePath);
      if (fs.existsSync(artifactPath)) {
        continue;
      }

      fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
      fs.writeFileSync(artifactPath, artifact.content);
      created = true;
    }

    const label = `${labelPrefix}${skillRoot}/${skill.name}`;
    created ? log.chalk.green(`  ✓ ${label}`) : log.chalk.dim(`  - ${label} (exists)`);
  }
}

function removeManagedSkills(fs, path, baseDir, skillRoot, log, labelPrefix = '') {
  const rootPath = path.join(baseDir, skillRoot);
  if (!fs.existsSync(rootPath)) {
    log.chalk.dim(`  - ${labelPrefix}${skillRoot} (missing)`);
    return;
  }

  for (const skillName of MANAGED_SKILL_NAMES) {
    const skillDir = path.join(rootPath, skillName);
    if (!fs.existsSync(skillDir)) {
      continue;
    }

    fs.rmSync(skillDir, { recursive: true, force: true });
    log.chalk.green(`  ✓ removed ${labelPrefix}${skillRoot}/${skillName}`);
  }
}

function reinstallGlobalSkills(fs, path, target, log) {
  const homeDir = os.homedir();
  removeManagedSkills(fs, path, homeDir, SKILL_TARGETS[target], log, '~/');
  installSkills(fs, path, homeDir, target, log, '~/');
}

function removeLegacyLocalSkills(fs, path, cwd, log) {
  for (const skillRoot of LEGACY_LOCAL_SKILL_ROOTS) {
    removeManagedSkills(fs, path, cwd, skillRoot, log);
  }
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

function assertWorkflowInitialized(fs, path, cwd) {
  if (!workflowIsInitialized(fs, path, cwd)) {
    throw new Error('Task workflow is not initialized here. Run `task init` first.');
  }
}

export function addRepo(cwd, repositoryPath, options, { fs, path, log }) {
  assertWorkflowInitialized(fs, path, cwd);
  return workspaceAddRepo(cwd, repositoryPath, options, { fs, path, log });
}

export function useContext(cwd, id, { fs, path, log }) {
  assertWorkflowInitialized(fs, path, cwd);
  return workspaceUseContext(cwd, id, {
    fs, path, log,
    onContextSelected: ({ fs, path, workflowRoot, contextRoot, log }) => {
      log.info('\nUpdating ignore rules...');
      updateGitignore(fs, path, workflowRoot, log);
      if (contextRoot !== workflowRoot) {
        updateGitignore(fs, path, contextRoot, log);
      }
    },
  });
}

export function bindRepo(cwd, id, repositoryPath, { fs, path, log }) {
  assertWorkflowInitialized(fs, path, cwd);
  return workspaceBindRepo(cwd, id, repositoryPath, { fs, path, log });
}

export function setRepoDisabled(cwd, id, disabled, { local, fs, path, log }) {
  assertWorkflowInitialized(fs, path, cwd);
  return workspaceSetRepoDisabled(cwd, id, disabled, { local, fs, path, log });
}

export function listRepos(cwd, { fs, path, log }) {
  return workspaceListRepos(cwd, { fs, path, log });
}

function resolveSkillTargets(fs, path, targetNames) {
  const explicit = targetNames.map((name) => resolveSkillTarget(name));
  if (explicit.length > 0) {
    return explicit;
  }
  const configured = readSkillTargetsConfig(fs, path);
  if (configured.length === 0) {
    throw new Error('No skill targets configured. Run `task skill install <agents|claude|codex>` first.');
  }
  return configured;
}

export function installGlobalSkills(targetName, { fs, path, log }) {
  const target = resolveSkillTarget(targetName);
  log.info(`Installing workflow skills into ~/${SKILL_TARGETS[target]}...`);
  reinstallGlobalSkills(fs, path, target, log);

  const skillTargets = readSkillTargetsConfig(fs, path);
  if (!skillTargets.includes(target)) {
    writeSkillTargetsConfig(fs, path, [...skillTargets, target]);
    log.chalk.green(`  ✓ recorded skill target "${target}" in ~/${GLOBAL_CONFIG_FILE}`);
  }

  log.info('\nGlobal skills installed. Keep them current with `task skill update`.');
}

export function updateGlobalSkills(targetNames, { fs, path, log }) {
  const targets = resolveSkillTargets(fs, path, targetNames);

  for (const target of targets) {
    log.info(`\nUpdating workflow skills in ~/${SKILL_TARGETS[target]}...`);
    reinstallGlobalSkills(fs, path, target, log);
  }

  log.info('\nGlobal skills updated.');
}

export function removeGlobalSkills(targetNames, { fs, path, log }) {
  const targets = resolveSkillTargets(fs, path, targetNames);

  const homeDir = os.homedir();
  for (const target of targets) {
    log.info(`\nRemoving workflow skills from ~/${SKILL_TARGETS[target]}...`);
    removeManagedSkills(fs, path, homeDir, SKILL_TARGETS[target], log, '~/');
  }

  const configPath = globalConfigPath(path);
  if (fs.existsSync(configPath)) {
    const current = readSkillTargetsConfig(fs, path);
    const removed = current.filter((target) => targets.includes(target));
    if (removed.length > 0) {
      const remaining = current.filter((target) => !targets.includes(target));
      if (remaining.length > 0) {
        writeSkillTargetsConfig(fs, path, remaining);
      } else {
        fs.rmSync(configPath);
      }
      log.chalk.green(`  ✓ removed skill target${removed.length > 1 ? 's' : ''} "${removed.join('", "')}" from ~/${GLOBAL_CONFIG_FILE}`);
    }
  }

  log.info('\nGlobal skills removed. Reinstall later with `task skill install <agents|claude|codex>`.');
}

export function init(cwd, { fs, path, log }) {
  const stateRoot = workflowStateRoot(fs, path, cwd);

  log.info('Creating directory structure...');
  ensureWorkflowState(fs, path, stateRoot, log);

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

Skills are installed globally per machine:
  task skill install <agents|claude|codex>`);
}

export function refresh(cwd, { fs, path, log }) {
  const stateRoot = workflowStateRoot(fs, path, cwd);

  log.info('Ensuring directory structure...');
  ensureWorkflowState(fs, path, stateRoot, log);

  log.info('\nRemoving project-local managed skills (skills are installed globally now)...');
  removeLegacyLocalSkills(fs, path, cwd, log);

  log.info('\nUpdating ignore rules...');
  updateGitignore(fs, path, cwd, log);
  if (stateRoot !== cwd) {
    updateGitignore(fs, path, stateRoot, log);
  }

  log.info(`\nTask workflow refreshed. Managed skill flows:
  explore: project-explore
  fast:  task-fast
  task:  task-explore -> task-implement -> task-audit (optional, risk-triggered)
  bug:   bug-explore -> bug-fix -> bug-audit (optional, risk-triggered)
  cancel: task-cancel | bug-cancel

Skills are installed globally per machine:
  task skill install <agents|claude|codex>`);
}

export function doctor(cwd, { fs, path, log }) {
  const checks = [];
  let context = null;
  let stateRoot = cwd;
  let contextIsValid = true;
  try {
    context = getConfigRepository(fs, path, cwd);
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

  let skillsNeedInstall = false;
  let skillsNeedUpdate = false;
  const skillTargets = readSkillTargetsConfig(fs, path);
  const homeDir = os.homedir();
  if (skillTargets.length === 0) {
    skillsNeedInstall = true;
    checks.push(false);
    logCheck(log, false, 'global skills', 'not installed, run `task skill install <agents|claude|codex>`');
  }

  for (const target of skillTargets) {
    const skillRoot = SKILL_TARGETS[target];
    for (const skill of Object.values(SKILLS)) {
      for (const artifact of skillArtifacts(target, skill)) {
        const artifactPath = path.join(homeDir, skillRoot, skill.name, artifact.relativePath);
        const label = artifact.relativePath === 'SKILL.md'
          ? `~/${skillRoot}/${skill.name}`
          : `~/${skillRoot}/${skill.name}/${artifact.relativePath}`;
        if (!fs.existsSync(artifactPath)) {
          skillsNeedInstall = true;
          checks.push(false);
          logCheck(log, false, label, 'missing, run `task skill install`');
          continue;
        }

        const content = fs.readFileSync(artifactPath, 'utf-8');
        const matches = content === artifact.content;
        checks.push(matches);
        if (!matches) {
          skillsNeedUpdate = true;
        }
        logCheck(
          log,
          matches,
          label,
          matches ? 'current' : 'outdated, run `task skill update`'
        );
      }
    }

    for (const skillName of LEGACY_MANAGED_SKILL_NAMES) {
      const legacySkillDir = path.join(homeDir, skillRoot, skillName);
      if (!fs.existsSync(legacySkillDir)) {
        continue;
      }

      skillsNeedUpdate = true;
      checks.push(false);
      logCheck(log, false, `~/${skillRoot}/${skillName}`, 'legacy managed skill, run `task skill update`');
    }
  }

  const gitignoreRules = GITIGNORE_BLOCK.split('\n');
  const gitignorePath = path.join(cwd, '.gitignore');
  const gitignore = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf-8')
    : '';
  const hasGitignoreRules = hasGitignoreBlock(gitignore, gitignoreRules);
  const localStatus = localWorkspaceGitignoreStatus(path, cwd);
  const hasSafeLocalWorkspaceConfig = localStatus.ignored && !localStatus.tracked;
  checks.push(hasGitignoreRules && hasSafeLocalWorkspaceConfig);
  logCheck(
    log,
    hasGitignoreRules && hasSafeLocalWorkspaceConfig,
    '.gitignore',
    hasGitignoreRules && hasSafeLocalWorkspaceConfig
      ? 'task workflow rules present'
      : 'missing or ineffective task workflow rules'
  );

  checks.push(...doctorWorkspace(fs, path, cwd, log));
  if (contextIsValid && context && stateRoot !== cwd) {
    const contextGitignorePath = path.join(stateRoot, '.gitignore');
    const contextGitignore = fs.existsSync(contextGitignorePath)
      ? fs.readFileSync(contextGitignorePath, 'utf-8')
      : '';
    const contextHasGitignoreRules = hasGitignoreBlock(contextGitignore, gitignoreRules);
    const contextLocalStatus = localWorkspaceGitignoreStatus(path, stateRoot);
    const contextHasSafeLocalWorkspaceConfig = contextLocalStatus.ignored && !contextLocalStatus.tracked;
    checks.push(contextHasGitignoreRules && contextHasSafeLocalWorkspaceConfig);
    logCheck(
      log,
      contextHasGitignoreRules && contextHasSafeLocalWorkspaceConfig,
      'context/.gitignore',
      contextHasGitignoreRules && contextHasSafeLocalWorkspaceConfig
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

  if (skillsNeedInstall) {
    console.log(chalk.yellow('Recommended next step: run `task skill install <agents|claude|codex>` to install workflow skills globally.'));
  } else if (skillsNeedUpdate) {
    console.log(chalk.yellow('Recommended next step: run `task skill update` to refresh global workflow skills.'));
  } else {
    console.log(chalk.yellow('Recommended next step: run `task refresh` to repair workflow setup.'));
  }
}
