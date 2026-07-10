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

const GRILL_ME_HINTS = [
  'grill-me',
  'skill-grill-me',
  'grill me',
];

const DECISIONS_READ_GUIDANCE = `Decision Intake

Before finalizing the brief, inspect .ai/decisions/decisions.md if it exists and contains real entries beyond the title.

Use it narrowly:

* extract only decisions that materially constrain this task
* ignore unrelated historical notes
* treat the file as a source of durable project invariants, not as a second specification
* if relevant decisions exist, summarize them briefly in Context or Constraints instead of copying them verbatim`;

const COMPLEXITY_ASSESSMENT_GUIDANCE = `Complexity Assessment

Before finalizing the brief, assess whether the requirement justifies added complexity.

* Treat added complexity as a cost that must be justified by the requirement.
* Flag any indication that the requirement may require:

  - new project-wide capability
  - new dependency
  - cross-cutting architectural change

  as a Risk, not a plan.
* When complexity appears justified, do not design the solution here. Simply record that additional implementation effort is likely required.`;

const SKILLS = {
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

1. If a Grill Me compatible skill is available in the current environment, use it for requirement clarification.
2. If no Grill Me compatible skill is available, clarify the requirement yourself with focused questions just far enough to remove ambiguity.
3. Read the project code and conventions needed to avoid obvious conflicts.
4. Read .ai/decisions/decisions.md if it exists and has entries. Pull in only decisions that materially constrain this task.
5. Before finalizing the brief, perform a Complexity Assessment.
6. Create a concise task brief and save it to:

.ai/tasks/active/YYYY-MM-DD-task-name.md

7. Show the brief before coding.
8. If the user does not object, implement immediately.
9. Verify the result against the acceptance criteria.
10. Archive the brief automatically by moving it to:

.ai/tasks/archive/YYYY-MM-DD-task-name.md

11. Summarize the outcome and any follow-up risks.

${DECISIONS_READ_GUIDANCE}

${COMPLEXITY_ASSESSMENT_GUIDANCE}

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
`,
  },

  'task-explore': {
    name: 'task-explore',
    description: 'Clarify a requirement and generate the execution brief in one step, without implementing.',
    content: `---
name: task-explore
description: Clarify a requirement and generate the execution brief in one step, without implementing.
user-invocable: true
---

Purpose

Clarify requirements and leave behind a ready-to-execute brief.

Workflow

1. If a Grill Me compatible skill is available in the current environment, use it for requirement exploration.
2. If no Grill Me compatible skill is available, explore the requirement yourself through focused questions.
3. Continue until the task is sufficiently understood.
4. Do not write code.
5. Do not create implementation details.
6. Before writing the brief, inspect .ai/decisions/decisions.md if it exists and has entries. Pull in only decisions that materially constrain this task.
7. Once the requirement is clear, generate a concise task brief and save it to:

.ai/tasks/active/YYYY-MM-DD-task-name.md

8. Show the saved brief and stop.

${DECISIONS_READ_GUIDANCE}

${COMPLEXITY_ASSESSMENT_GUIDANCE}

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
`,
  },

  'task-implement': {
    name: 'task-implement',
    description: 'Implement the latest active task brief and validate it. Archive automatically when complete.',
    content: `---
name: task-implement
description: Implement the latest active task brief and validate it. Archive automatically when complete.
user-invocable: true
---

Purpose

Implement a task from the latest file in .ai/tasks/active/.

Rules

1. Read the latest relevant brief from .ai/tasks/active/.
2. Follow the acceptance criteria strictly.
3. Prefer minimal changes.
4. Respect existing project conventions.
5. Avoid unnecessary refactoring.
6. State assumptions explicitly.
7. Validate the result before stopping.
8. If the work is complete, archive the brief automatically by moving it to .ai/tasks/archive/.

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
3. Use the least implementation context possible: task brief, final code, git diff, and existing tests.
4. Ignore implementation reasoning from the current conversation.
5. Do not prove the implementation correct. Try to invalidate it with evidence.
6. If evidence is unavailable, mark the area UNKNOWN instead of guessing.
7. Run relevant tests when practical. If tests cannot be run, list that under Unknowns.
8. Do not suggest unrelated improvements.
9. Overall Result must be FAIL when any acceptance criterion is FAIL, or when a material UNKNOWN blocks approval.
10. Overall Result may be PASS only when no significant evidence of failure exists.

Audit Phases

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
    description: 'Investigate a bug and generate a fix brief in one step, without writing code.',
    content: `---
name: bug-explore
description: Investigate a bug and generate a fix brief in one step, without writing code.
user-invocable: true
---

Purpose

Investigate a bug and leave behind a ready-to-fix brief.

Rules

1. If a Grill Me compatible skill is available in the current environment, use it for bug exploration.
2. If no Grill Me compatible skill is available, ask focused questions and drive the investigation yourself.
3. Do not write code.
4. Do not suggest fixes before enough evidence exists.
5. Identify root cause candidates.
6. Request evidence whenever possible.
7. Separate:

   * observed behavior
   * expected behavior
   * assumptions

8. Before writing the brief, inspect .ai/decisions/decisions.md if it exists and has entries. Pull in only decisions that materially constrain the observed behavior, expected behavior, or likely root cause.
9. Once the bug is sufficiently understood, generate a brief and save it to:

.ai/bugs/active/YYYY-MM-DD-bug-name.md

10. Show the saved brief and stop.

${DECISIONS_READ_GUIDANCE}

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
`,
  },

  'bug-fix': {
    name: 'bug-fix',
    description: 'Fix the latest active bug brief and validate the result. Archive automatically when complete.',
    content: `---
name: bug-fix
description: Fix the latest active bug brief and validate the result. Archive automatically when complete.
user-invocable: true
---

Purpose

Fix a bug from the latest file in .ai/bugs/active/.

Rules

1. Read the latest relevant brief from .ai/bugs/active/.
2. Minimize changes.
3. Avoid unrelated refactoring.
4. Fix root cause, not symptoms.
5. Preserve existing behavior.
6. Explain reasoning.
7. Validate the fix before stopping.
8. If the bug is fixed, archive the brief automatically by moving it to .ai/bugs/archive/.

When making implementation decisions

* Extend existing behavior before introducing new abstractions.
* Prefer the smallest behavioral correction that resolves the confirmed root cause.
* Introduce new dependencies only when existing project capabilities cannot reasonably solve the problem.

Output

## Root Cause

Confirmed cause.

## Fix

Changes made.

## Validation

Verification performed.

`,
  },

  'bug-audit': {
    name: 'bug-audit',
    description: 'Independently audit a completed bug fix against the bug brief and root cause.',
    content: `---
name: bug-audit
description: Independently audit a completed bug fix against the bug brief and root cause. The objective is to find evidence of failure, not to justify the implementation.
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
9. Overall Result must be FAIL when root cause validation is FAIL, any acceptance criterion is FAIL, or a material UNKNOWN blocks approval.
10. Overall Result may be PASS only when no significant evidence of failure exists.

Audit Phases

1. Root cause validation: determine whether the confirmed or suspected root cause was actually eliminated.
2. Acceptance criteria coverage: for each criterion, mark PASS, FAIL, or UNKNOWN.
3. Break attempt: construct inputs or flows that reproduce the old bug or expose adjacent failures.
4. Regression analysis: check behavior changes, compatibility issues, state corruption, and hidden side effects.
5. Engineering risk: check maintainability, unnecessary complexity, duplication, performance, memory, concurrency, and security.

Severity

Critical - Root cause not fixed or requirement violated.
High - Likely production issue.
Medium - Real issue with limited impact.
Low - Concrete issue with low impact. Do not use Low for preferences.

Output

## Overall Result

PASS or FAIL

## Root Cause Validation

PASS / FAIL / UNKNOWN, with evidence.

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
    description: 'Record implementation decisions to .ai/decisions/decisions.md. Default to append; if updating an existing decision, require explicit user confirmation first. Max 10 lines per entry.',
    content: `---
name: decision-log
description: Record implementation decisions to .ai/decisions/decisions.md. Default to append; if updating an existing decision, require explicit user confirmation first. Max 10 lines per entry.
user-invocable: true
---

Purpose

Record important implementation decisions.

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

Append Format

## YYYY-MM-DD

### Problem

What issue was encountered.

### Decision

What was chosen.

### Reason

Why this choice was made.

### Alternatives Considered

What alternatives were rejected.

Requirements

* Maximum 10 lines per decision
* Default to append
* Prefer fewer, harder decisions over broad coverage
* One decision should capture one durable constraint, not a mixed summary
* If a new entry appears to revise, merge with, or supersede an existing decision, do not edit or append yet
* Instead, show the relevant prior entry, explain the overlap or conflict, and ask the user whether to append, revise, merge, supersede, or skip
* Only modify an existing entry after explicit user confirmation
* Keep concise
`,
  },

  'decision-sweep-weekly': {
    name: 'decision-sweep-weekly',
    description: 'Weekly sweep of recent task and bug briefs to decide which deserve a decision-log entry. Proposes entries for confirmation before appending.',
    content: `---
name: decision-sweep-weekly
description: Weekly sweep of recent task and bug briefs to decide which deserve a decision-log entry. Proposes entries for confirmation before appending.
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
4. For each candidate, draft a decision entry using the four-section format.
5. Bias toward skip. Produce a draft only when the decision is clearly durable and likely to matter again.
6. Present a single review list: every scanned brief with a verdict (write / skip / insufficient info), then the proposed drafts grouped at the end.
7. For every skip, give a short reason such as one-off detail, already encoded in code, no future constraint, or still unsettled.
8. Do NOT append anything yet. Wait for the user to confirm which drafts to keep, edit, or drop.
9. If a proposed draft appears to overlap with, conflict with, or refine an existing decision, include that prior entry in the review and present explicit options such as append as new, revise existing, merge, supersede, or skip.
10. Only after confirmation, apply the approved action for each draft. Default to appending new entries oldest first under the matching YYYY-MM-DD section heading; revise or merge only when the user explicitly selects that action.
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

## YYYY-MM-DD

### Problem

What issue was encountered.

### Decision

What was chosen.

### Reason

Why this choice was made.

### Alternatives Considered

What alternatives were rejected.

Requirements

* Maximum 10 lines per decision
* Default to append
* One date section per day; multiple decisions on the same day stack under the same heading
* Never edit, merge, supersede, or delete prior entries without explicit user confirmation
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

Keep .ai/decisions/decisions.md narrow enough that future explore steps can read it quickly and trust that every surviving entry still matters.

Workflow

1. Read .ai/decisions/decisions.md.
2. Inspect the current codebase only as needed to judge whether each decision still represents a live constraint.
3. Classify each entry as keep, tighten, merge, or remove.
4. Bias toward removal when an entry is stale, duplicate, too local, too vague, or no longer changes future implementation choices.
5. Present a review list with every entry, its classification, and a short reason.
6. When proposing tighten, merge, or remove, quote or summarize the exact affected entry so the user can approve safely.
7. Do NOT modify the file yet. Wait for explicit user confirmation on each proposed change set.
8. After confirmation, apply only the approved edits and preserve unrelated entries.
9. Summarize what was kept, tightened, merged, removed, and why.

Retention Standard

Keep an entry only if it still acts as a durable project constraint or explains an intentional choice a future task could otherwise get wrong.

Removal Candidates

* one-off implementation details
* decisions already enforced clearly by code, tests, or tooling
* duplicate or near-duplicate entries
* vague notes that do not change future choices
* constraints invalidated by later refactors, simplifications, or performance work
* historical context that belongs in task or bug archives instead

Requirements

* Default to proposing, not editing
* Never remove or rewrite an entry without explicit user confirmation
* Prefer deleting low-value entries over rewriting them into longer prose
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

function skillFilePath(path, cwd, skillRoot, skillName) {
  return path.join(cwd, skillRoot, skillName, 'SKILL.md');
}

function hasGrillMeHint(value) {
  const normalized = value.toLowerCase();
  return GRILL_ME_HINTS.some((hint) => normalized.includes(hint));
}

function detectLocalGrillMeSkill(fs, path, cwd, skillRoot) {
  const root = path.join(cwd, skillRoot);
  if (!fs.existsSync(root)) {
    return null;
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (MANAGED_SKILL_NAMES.includes(entry.name)) {
      continue;
    }

    if (hasGrillMeHint(entry.name)) {
      return entry.name;
    }

    const skillPath = path.join(root, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      continue;
    }

    const content = fs.readFileSync(skillPath, 'utf-8');
    const metadata = content
      .split('---')
      .slice(1, 2)
      .join('\n');

    if (hasGrillMeHint(metadata)) {
      return entry.name;
    }
  }

  return null;
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
    const skillFile = skillFilePath(path, cwd, skillRoot, skill.name);

    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    if (!fs.existsSync(skillFile)) {
      fs.writeFileSync(skillFile, skill.content);
      log.chalk.green(`  ✓ ${skillRoot}/${skill.name}`);
    } else {
      log.chalk.dim(`  - ${skillRoot}/${skill.name} (exists)`);
    }
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
      const skillPath = skillFilePath(path, cwd, skillRoot, skill.name);
      if (!fs.existsSync(skillPath)) {
        checks.push(false);
        logCheck(log, false, `${skillRoot}/${skill.name}`, 'missing');
        continue;
      }

      const content = fs.readFileSync(skillPath, 'utf-8');
      const matches = content === skill.content;
      checks.push(matches);
      logCheck(
        log,
        matches,
        `${skillRoot}/${skill.name}`,
        matches ? 'current' : 'outdated, run `task refresh`'
      );
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

  const grillMeFindings = [
    [CLAUDE_SKILLS_DIR, detectLocalGrillMeSkill(fs, path, cwd, CLAUDE_SKILLS_DIR)],
    [CODEX_SKILLS_DIR, detectLocalGrillMeSkill(fs, path, cwd, CODEX_SKILLS_DIR)],
  ];

  for (const [skillRoot, skillName] of grillMeFindings) {
    if (skillName) {
      logCheck(log, true, `${skillRoot} Grill Me companion`, `detected ${skillName}`);
      continue;
    }

    console.log(chalk.yellow(
      `  WARN ${skillRoot} Grill Me companion - not detected locally; task-fast, task-explore, and bug-explore will use built-in clarification fallback`
    ));
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
