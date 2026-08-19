import chalk from 'chalk';
import { execFileSync } from 'node:child_process';
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
  EFFORT_ACTIVE_DIR,
  EFFORT_ARCHIVE_DIR,
  SPECS_DIR,
  DECISIONS_FILE,
  WORKSPACE_FILE,
  WORKSPACE_LOCAL_FILE,
} = WORKSPACE_CONSTANTS;

const CLAUDE_SKILLS_DIR = '.claude/skills';
const CODEX_SKILLS_DIR = '.codex/skills';
const GITIGNORE_BLOCK = [
  '# task workflow',
  '.ai/tasks/active/*.md',
  '.ai/bugs/active/*.md',
  '.ai/efforts/active/*.md',
  WORKSPACE_LOCAL_FILE,
].join('\n');

const WORKSPACE_CONTEXT_GUIDANCE = `Workspace Context

Before reading or writing any .ai path, determine the workflow state root. Managed skills are discovered from the launch root, but a launch-root workspace.yaml may declare context_repository. When it does:

1. Resolve that repository ID from the launch-root workspace.yaml, honoring launch-root workspace.local.yaml when present.
2. Verify that its resolved directory exists and is a Git repository root. If it is missing or invalid, stop and report the configuration error; never fall back to a launch-root .ai directory.
3. Treat the selected repository as the workflow state root. Read its workspace.yaml and workspace.local.yaml for the business repository map, and resolve every .ai path in this skill from that directory.

Without context_repository, the launch root remains the workflow state root and its workspace manifest is the repository map.

Retain the resulting absolute canonical directory as \`workflowStateRoot\`. Every .ai read, write, move, or delete must use an absolute path below \`<workflowStateRoot>/.ai\`. Never use a relative \`.ai/...\` path, infer the state root from the current command directory, or choose an existing .ai directory in a nested or registered repository.

Optional Project Glossary

\`<workflowStateRoot>/CONTEXT.md\` is an optional, single glossary of canonical project-specific terms. Do not infer \`CONTEXT-MAP.md\` support or search registered repositories for separate glossaries.

* When this file exists and terms relevant to the current work are in question, read it with the relevant project artifacts.
* A glossary entry defines what one project-specific concept is in one or two sentences and may name avoided synonyms. It is not a Spec, decision log, Evidence Ledger, or implementation diary.
* \`task init\` and \`task refresh\` never create this file. Only effort-explore may propose an explicit glossary edit.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Treat repositories whose resolved disabled flag is true as unavailable for routine development in the current cycle. Do not select, inspect, index, or include them in a working set unless the user explicitly asks about that repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Changing the command directory never changes \`workflowStateRoot\`. Do not assume a workflow-state-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.`;

const GRILLING_GUIDANCE = `Grilling

Interview the user relentlessly until you reach a shared understanding. Model the subject as a design tree: every decision branches into the decisions that depend on it.

Work the design tree in rounds. The frontier is every decision whose prerequisites are settled: the questions that can be asked now without guessing at unanswered decisions. Ask the full frontier in one round, number each question, and give a recommended answer. Wait for the user's answers before the next round.

Format each question as:

\`\`\`
Q1 - **Question title**: Question body.

Recommended: Recommended answer.
\`\`\`

Recompute the frontier after every round. A question that depends on another question still open in the current round belongs in a later round.

Find facts in the repository and environment instead of asking the user. Keep questions downstream of pending fact-finding for a later round; ask the remaining independent frontier now. Decisions belong to the user: ask for them and wait.

The session is complete only when the frontier is empty and the user confirms the understanding is shared. Do not act on the result before that confirmation.`;

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

const EFFORT_EXPLORATION_GUIDANCE = `Purpose

Manage a durable Effort for a large or uncertain request through natural-language conversation. An Effort holds unresolved material decisions; it is not a Task and does not implement code. A ready Effort can be handed to effort-spec, but effort-explore does not create a Spec Record or decompose Tasks itself.

${WORKSPACE_CONTEXT_GUIDANCE}

Effort Records

Resolve every Effort path from \`workflowStateRoot\`:

* open records: \`<workflowStateRoot>/.ai/efforts/active/\`
* closed records: \`<workflowStateRoot>/.ai/efforts/archive/\`

Create each open record as \`YYYY-MM-DD-effort-name.md\` with this durable structure:

\`\`\`markdown
---
state: open
---

# Destination

# Context

# Evidence Ledger

## Observed Facts

## Inferred Rationale

## Evidence Conflicts

# Confirmed Decisions

# Current Frontier

# Known Constraints

# Risks

# Open Unknowns

# Out of Scope

# Session History

# Spec Proposal

# Closure
\`\`\`

The only persisted lifecycle marker is \`state: open\` or \`state: closed\`. Do not persist paused, blocked, exploring, or ready as states.

Natural-Language Workflow

Interpret the user's natural-language request as one of: create an Effort, continue or update an Effort, report its status, close it, or reopen it.

1. For a new Effort, establish its Destination and record only confirmed context, decisions, constraints, current frontier, unknowns, and scope boundaries. Apply Evidence Discipline before recording material content. Use the Grilling protocol for material user decisions. Do not treat a hypothesis or an exploration finding as a Confirmed Decision.
2. For every request about an existing Effort, use a user-specified name or path. Without one, proceed only when exactly one open record is an unambiguous match. When there are multiple plausible Efforts, list the candidates and ask the user to select one; never choose by recency.
3. When asked for status, read the entire record selected under the previous rule and report its Destination, Current Frontier, Open Unknowns, confirmed decisions relevant to the next action, and the derived condition:
   * ready when no current frontier item or open unknown can still materially alter the Destination, scope, constraints, Requirements, Acceptance Criteria, or Verification Boundaries; residual uncertainty is allowed only when it does not affect that contract or is a recorded non-blocking Risk that needs no decision before implementation
   * blocked when every current frontier item is an external prerequisite the agent cannot advance
   * exploring otherwise
   When the Effort has a confirmed Spec Record, also report its revision, any pending Spec Proposal, and generated active Tasks grouped as ready, dependency-blocked, or requiring resolution by the latest Task Graph. These are natural-language conclusions, not persisted states. Leaving the conversation pauses an open Effort without changing its record.
4. When the user clearly asks to close an Effort, ask for a closure reason when the request does not provide one. If linked generated Tasks remain active, list them before the confirmation request. First state that the record will be marked \`state: closed\`, record the closure reason under \`# Closure\`, and move to the archive. Wait for explicit confirmation before changing or moving it. After confirmation, make those changes and report the archived path and closure reason. Do not delete code, Task artifacts, Bug artifacts, or unrelated user changes.
5. When the user clearly asks to reopen a closed Effort, use a named or uniquely matching archived record. State that it will return to \`state: open\`, ask for a reopening reason when absent, and wait for explicit confirmation. After confirmation, move it to the active directory, record the reopening reason in Session History, and continue from its current context. Never reopen automatically.

Rules

Evidence Discipline

Before adding or changing a material Context entry, Known Constraint, Confirmed Decision, Current Frontier item, or Open Unknown:

1. Inspect the relevant code, tests, configuration, documentation, active decisions, and repository history when those sources can establish or constrain the point. Look up repository facts instead of asking the user for them.
2. Record repository-observable facts under # Evidence Ledger / ## Observed Facts with concise source references. Record an evidence-backed explanation only under ## Inferred Rationale and label it as an inference. Record material conflicting evidence under ## Evidence Conflicts.
3. Treat an unresolved material conflict or unsupported assumption as a Current Frontier item or Open Unknown. Never convert an inference, hypothesis, or observed fact into a Confirmed Decision.
4. Put a material user-owned choice in # Confirmed Decisions only after the user explicitly confirms it. Include the relevant evidence or decision context concisely so later sessions can distinguish the outcome from its basis.

Readiness

Do not keep an Effort exploring merely because uncertainty remains. An unresolved item is material when settling it could alter the Destination, scope, constraints, Requirements, Acceptance Criteria, or Verification Boundaries of the eventual Spec. A remaining item that is not material may stay documented. A remaining material risk may be recorded under # Risks only when its impact is explicit and no decision about it is required before implementation; otherwise it remains a Current Frontier item or Open Unknown.

Glossary Check

Apply this check when an Effort relies on a material domain or workflow term:

1. Read \`<workflowStateRoot>/CONTEXT.md\` when it exists. When a user term conflicts with its canonical language, is ambiguous, or is overloaded, state the conflict and ask which meaning applies. Do not choose a meaning silently.
2. Cross-check a stated term or relationship against relevant code and evidence. Treat a material mismatch as an Evidence Conflict and a Current Frontier item until it is resolved.
3. When a newly settled term is project-specific and will repeatedly affect scope, boundaries, names, or behavior across later work, propose the exact concise glossary edit, including any avoided synonym. Do not create a glossary or change it just because a word appeared.
4. Wait until the user explicitly confirms the exact proposed edit before creating or modifying \`<workflowStateRoot>/CONTEXT.md\`. Keep the Effort's # Confirmed Decisions, Spec, and Evidence Ledger as their own records; refer to canonical terms rather than duplicating their definitions there.

* Read \`.ai/decisions/decisions.md\` when relevant active decisions may constrain the Effort. Preserve them as context; do not duplicate them as new durable decisions.
* Maintain the Current Frontier as the independent material questions or external prerequisites that can be acted on next. Keep dependent questions out of the frontier until their prerequisites are settled.
* A ready Effort may be handed to effort-spec, but this Skill must not create a Spec Record or Task Brief automatically.
* Keep Session History concise: retain decisions, scope changes, and externally relevant facts rather than a transcript of every conversation.
* Do not modify existing Task or Bug records unless the user explicitly invoked their separate workflow.

Output

For status or continuation, answer directly with the relevant Effort context and the next frontier. For a new or updated record, show the saved path and a concise summary. For closure or reopening, output only the confirmation request until the user confirms; after confirmation, report the resulting path and reason.`;

const EFFORT_SPEC_GUIDANCE = `Purpose

Turn a ready Effort into one confirmed, version-controlled Spec Record and, after explicit review, a complete Task Graph. Decomposition is an internal phase of this Skill; do not expose or require another Skill for it. This Skill never implements code, stages files, or creates Git commits.

${WORKSPACE_CONTEXT_GUIDANCE}

Locations

Resolve every path from workflowStateRoot:

* open Efforts: <workflowStateRoot>/.ai/efforts/active/
* closed Efforts: <workflowStateRoot>/.ai/efforts/archive/
* confirmed Spec Records: <workflowStateRoot>/.ai/specs/
* generated Task Briefs: <workflowStateRoot>/.ai/tasks/active/ and <workflowStateRoot>/.ai/tasks/archive/

Selection and Entry

1. Select only a ready, open Effort. Use a user-specified name or path when provided. Without one, continue only when exactly one open Effort is an unambiguous match; otherwise list candidates and ask the user to choose. Never select by recency.
2. A closed Effort must be explicitly reopened through effort-explore before this Skill can create or revise its Spec.
3. An Effort has at most one Spec Record. A materially different Destination requires a new Effort rather than a parallel Spec.
4. Read the selected Effort, its linked Spec Record when present, relevant active decisions, and existing generated Task Briefs before proposing a change. Preserve existing Task and Bug artifacts.

Spec Proposal and Spec Record

1. For a ready Effort without a Spec Record, derive a Spec Proposal and retain it under # Spec Proposal in the open Effort. Show it and stop. A Spec Proposal is resumable but cannot drive a Task Graph.
2. For an existing Spec Record, any material change to Destination, Context, Constraints, Confirmed Decisions, Requirements, Acceptance Criteria, Verification Boundaries, Out of Scope, or Risks is a next Spec Proposal retained in the open Effort. The current confirmed Spec remains the only source contract until confirmation.
3. A Spec Proposal must contain Destination, Context, Constraints, Confirmed Decisions, Out of Scope, Risks, a source Effort path, stable Requirement IDs, stable Acceptance Criterion IDs, and Verification Boundaries. Requirements describe observable capability; Acceptance Criteria describe observable evidence. Verification Boundaries must map every Acceptance Criterion ID to one boundary: the highest observable seam at which its outcome can be shown without asserting implementation details.
4. Confirming a Spec Proposal requires clear user intent. On confirmation, write or update exactly one Markdown Spec Record in .ai/specs/. Use YAML frontmatter with its source Effort path and integer revision. Keep concise # Revisions history in the same file; Git history preserves prior text. Remove the confirmed proposal from the Effort and append a concise Session History entry.
5. The Spec Record includes # Destination, # Context, # Constraints, # Confirmed Decisions, # Requirements, # Acceptance Criteria, # Verification Boundaries, # Out of Scope, # Risks, # Revisions, # Current Task Graph, and # Impact Reports. The sections through # Risks are the Spec contract. # Revisions, # Current Task Graph, and # Impact Reports are co-located workflow management state; they must not redefine the confirmed contract.
6. Write files only after the user confirms. Do not automatically stage or commit them. Stop after displaying an unconfirmed Spec Proposal; do not infer confirmation from a vague request to continue.

Internal Decomposition and Task Graph

After a Spec Proposal is confirmed, internally derive a Task Graph, the confirmed Spec's execution projection, and show it before creating Task Briefs. For every proposed Task show:

* an immutable Task ID and concise goal
* owned Requirement ID and Acceptance Criterion ID lists
* the one Verification Owner for every owned Acceptance Criterion
* the Acceptance Criterion ID -> Verification Boundary mapping for every owned Acceptance Criterion
* validation evidence it will produce
* depends_on Task IDs only where work or validation is truly blocked

Before showing a Task Graph, validate that it is complete and coherent:

* every included Requirement ID and Acceptance Criterion ID has explicit Task coverage
* every Acceptance Criterion ID has exactly one Verification Owner
* every Acceptance Criterion ID has one explicit Verification Boundary mapping at its highest practical observable seam
* Task IDs are unique, and every depends_on reference resolves within the graph
* dependencies are true blockers, not preferred order, and form no cycle
* each Task is independently executable once its direct dependencies complete

Task Graph Review Feedback

Feedback about Task grouping, ownership allocation, Verification Owner assignment, or true dependencies is Task Graph feedback. Re-derive and show the complete candidate graph again; Task Graph confirmation never modifies the confirmed Spec.

Feedback that changes Destination, Context, Constraints, Confirmed Decisions, Requirements, Acceptance Criteria, Verification Boundaries, Out of Scope, or Risks is Spec feedback. Retain it as the next Spec Proposal and do not confirm or create a Task Graph until that proposal is explicitly confirmed.

Task Slice Rules

Each Task normally delivers one independently observable end-to-end behavior, not a horizontal implementation layer. A Task that cannot name what becomes demonstrably true when it completes must be merged, split, or re-derived.

The only exception is a wide mechanical refactor whose blast radius makes an independently green vertical slice impossible. Declare it explicitly as one expand-migrate-contract sequence: expand keeps old and new forms valid, each migrate Task moves a bounded caller batch after expand, and contract removes the old form only after every migrate Task completes. Do not use this exception for ordinary feature decomposition.

An accepted Current Task Graph must record the Spec revision it represents. When the selected Spec has no accepted graph for its current revision, re-derive the candidate from the latest Spec and existing generated Task Briefs, display the complete graph, and stop for a new explicit confirmation. Never accept graph approval solely from a previous conversation display.

Require a second explicit confirmation for the complete Task Graph. A confirmed graph creates all required new Task Briefs all-or-nothing. Prepare a staged copy of the Spec Record with the accepted graph under # Current Task Graph and every generated Task ID marked Task Compatible, plus Briefs only for new or materially changed Task IDs, in a unique staging directory below .ai. Retained compatible Task IDs are recorded in the accepted graph but never staged, overwritten, moved, or otherwise changed. Validate ID, coverage, dependency, and final filename collisions before promotion. Then write the staged Spec Record and promote the staged Briefs while tracking only the final paths created by this invocation. If any promotion fails, remove only those promoted Briefs, restore the prior Spec Record from its snapshot, clean the staging directory, and report the failure without claiming graph confirmation. If cleanup or restoration fails, report the exact inconsistent paths and stop. Do not automatically implement any generated Task.

Generated Task Brief Contract

Create each generated Brief with normal execution sections plus immutable # Task Graph Metadata containing:

* Task ID
* source Effort path, source Spec Record path, and source Spec revision
* owned Requirement IDs and Acceptance Criterion IDs
* Verification Owner Acceptance Criterion IDs
* Acceptance Criterion ID -> Verification Boundary mappings for owned Acceptance Criterion IDs
* depends_on Task IDs

The metadata cannot be changed during task implementation. Task-specific Context or Revisions may capture narrow execution clarification, while any change to goal, source conditions, ownership, constraints, or dependencies returns to a Spec Proposal and this Skill.

Spec Revisions and Task Compatibility

When confirming a later Spec revision, first create an Impact Report and candidate Task Graph. Compare existing generated Task IDs to the candidate graph:

* Task ID is an execution-semantic identity, not a file-content identity; editorial wording and equivalent validation-command improvements alone do not require a new ID
* retain a compatible Task ID only when its goal, owned Requirement and Acceptance Criterion IDs, Verification Owner responsibility, Acceptance Criterion ID -> Verification Boundary mappings, source constraints, and true blockers still match
* allocate a new Task ID when any of those execution semantics changes
* preserve an incompatible Task Brief without editing, deleting, cancelling, archiving, or automatically replacing it

Record the accepted graph and compatibility result in the Spec Record. A later task-implement invocation may run only a generated Task ID that remains compatible with this latest graph. Show incompatible active Tasks as requiring resolution in Effort status.

Output

For a Spec Proposal, show the proposal and its Effort path, then stop. For a confirmed Spec, show the Spec Record path, revision, and candidate Task Graph, then stop. For a confirmed graph, report the full set of created Task Brief paths and the next unblocked Tasks. Use clear user intent for every confirmation boundary.`;

const EFFORT_EXPLORE_DESCRIPTION = 'Manage a durable Effort through natural-language exploration, status reporting, continuation, confirmed closure, and explicit reopening.';
const EFFORT_SPEC_DESCRIPTION = 'Turn a ready Effort into a confirmed Spec Record and a reviewed Task Graph through explicit natural-language confirmations.';

const TASK_BRIEF_SELECTION_RULE = 'Identify the intended brief in .ai/tasks/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.';
const BUG_BRIEF_SELECTION_RULE = 'Identify the intended brief in .ai/bugs/active/. Use a user-specified name or path when provided. Without one, proceed only when a single brief is the clear match. Ask the user when multiple briefs are plausible; do not choose by recency alone.';

const TASK_GRAPH_EXECUTION_GUIDANCE = `Generated Task Gate and Task Compatibility

Apply this section only when the selected Task Brief has # Task Graph Metadata with a Task ID. Legacy Task Briefs without Task Graph Metadata keep the existing selection, implementation, and archive behavior.

Before making code changes for a generated Task:

1. Read the Task ID, source Spec Record path and revision, owned Requirement IDs and Acceptance Criterion IDs, Verification Owner IDs, Acceptance Criterion ID -> Verification Boundary mappings, and depends_on Task IDs. Treat this Task Graph Metadata as immutable.
2. Resolve every direct depends_on Task ID across .ai/tasks/active/ and .ai/tasks/archive/. A dependency is complete only when exactly one matching Brief is in the archive. If a dependency is active, missing, duplicated, or otherwise unresolved, list every blocker and stop. Do not modify code, move a Brief, or select another Task automatically.
3. Read the latest confirmed Current Task Graph from the source Spec Record. The selected Task ID must be recorded as Task Compatible. If it is incompatible, superseded, missing, or requires resolution, stop and direct the user to effort-spec; do not implement an obsolete contract.
4. Follow the selected Brief's owned conditions only. Validate each owned Acceptance Criterion at its recorded Acceptance Criterion ID -> Verification Boundary mapping whenever practical; do not substitute a lower-level implementation test when that boundary can be exercised. A material change to its goal, source conditions, ownership, constraints, dependencies, or Verification Boundary mappings requires a Spec Proposal and re-decomposition, not a local Brief rewrite.

Before archiving a completed generated Task, append # Completion Evidence to the active Brief. Record the completion date, validations run and their results, and the Requirement IDs and Acceptance Criterion IDs satisfied. A Verification Owner must record final evidence for every Acceptance Criterion it owns. Only then move the Brief to .ai/tasks/archive/.
`;

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
3. Re-run the original diagnostic loop after the correction. Preserve the redacted evidence and result under # Fix Evidence in the Bug Brief.
4. Tag any temporary diagnostic logging or instrumentation with one unique prefix. Before archiving, search for that prefix and remove all temporary instrumentation; do not leave debugging scaffolding in the completed fix.`;

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

  'effort-explore': {
    name: 'effort-explore',
    description: EFFORT_EXPLORE_DESCRIPTION,
    content: `---
name: effort-explore
description: ${EFFORT_EXPLORE_DESCRIPTION}
user-invocable: true
---

${EFFORT_EXPLORATION_GUIDANCE}`,
  },

  'effort-spec': {
    name: 'effort-spec',
    description: EFFORT_SPEC_DESCRIPTION,
    content: `---
name: effort-spec
description: ${EFFORT_SPEC_DESCRIPTION}
user-invocable: true
---

${EFFORT_SPEC_GUIDANCE}`,
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
    description: 'Implement a selected active task brief and validate it, enforcing Task Graph blockers for generated briefs. Archive automatically when complete.',
    content: `---
name: task-implement
description: Implement a selected active task brief and validate it, enforcing Task Graph blockers for generated briefs. Archive automatically when complete.
user-invocable: true
---

Purpose

Implement the intended task from .ai/tasks/active/ while deciding when implementation choices require confirmation.

${WORKSPACE_CONTEXT_GUIDANCE}

Rules

1. ${TASK_BRIEF_SELECTION_RULE}
2. Apply Generated Task Gate before changing code when Task Graph Metadata is present.
3. Prepare with Brief Sufficiency and Current Decision Check before changing code.
4. Use Execution Mode below to choose direct execution or an Implementation Proposal.
5. Validate the result before reporting the work complete.
6. If the work is complete, append Completion Evidence when required, then archive the selected brief automatically by moving it to .ai/tasks/archive/.

${TASK_GRAPH_EXECUTION_GUIDANCE}

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

function assertWorkflowInitialized(fs, path, cwd) {
  if (!workflowIsInitialized(fs, path, cwd)) {
    throw new Error('Task workflow is not initialized here. Run `task init` first.');
  }
}

export function addRepo(cwd, repositoryPath, options, { fs, path, log }) {
  assertWorkflowInitialized(fs, path, cwd);
  return workspaceAddRepo(cwd, repositoryPath, options, {
    fs, path, log,
    onWorkspacePromotion: (fs, path, workflowRoot, log) => {
      log.info('\nRefreshing managed workflow skills for workspace context...');
      reinstallManagedSkills(fs, path, workflowRoot, log);
    },
  });
}

export function useContext(cwd, id, { fs, path, log }) {
  assertWorkflowInitialized(fs, path, cwd);
  return workspaceUseContext(cwd, id, {
    fs, path, log,
    onContextSelected: ({ fs, path, workflowRoot, contextRoot, log }) => {
      log.info('\nRefreshing managed workflow skills for context routing...');
      reinstallManagedSkills(fs, path, workflowRoot, log);
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
  effort: effort-explore -> effort-spec (ready Effort to reviewed Tasks)
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
  effort: effort-explore -> effort-spec (ready Effort to reviewed Tasks)
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
    EFFORT_ACTIVE_DIR,
    EFFORT_ARCHIVE_DIR,
    SPECS_DIR,
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

  console.log(chalk.yellow('Recommended next step: run `task refresh` to reinstall managed skills and repair setup.'));
}
