# task-cli

A workflow methodology for AI coding agents.

Task CLI separates requirement exploration from implementation, so AI agents decide whether complexity is justified **before** they start coding.

**Explore** — Understand the problem. Assess whether additional complexity is warranted.
**Implement** — Solve the accepted problem with the least necessary complexity.
**Audit** — Independently try to find failure evidence when the risk justifies it.

Designed for:

* Claude Code
* Codex CLI
* Mature codebases with frequent bug fixes and small feature iterations

> **Core principle**
> Explore decides whether complexity is justified.
> Implement decides how to satisfy the requirement with the least necessary complexity.

---

## Why task-cli?

### Traditional AI Workflow

```text
Requirement → Solution Design → Code → Review
```

The AI often starts designing before the requirement is fully clarified. Complexity gets introduced during coding, and review happens against whatever the AI produced rather than against the original intent.

### task-cli Workflow

```text
Requirement
    ↓
Explore  ──►  Understand + Challenge
    ↓
Complexity Assessment  ──►  Is added complexity justified?
    ↓
Brief
    ↓
Implement  ──►  Simplest acceptable solution
    ↓
Validation  ──►  Verify against the brief
    ↓
Audit  ──►  Optional, risk-triggered failure search
```

Exploration and implementation are intentionally separated.

---

## Core Philosophy

Most AI coding agents fail because they mix exploration and implementation in the same conversation. Task CLI intentionally separates them.

| Stage                     | Question                                   |
| ------------------------- | ------------------------------------------ |
| Explore                   | What problem are we solving?               |
| Complexity Assessment     | Is additional complexity justified?        |
| Implement                 | What is the simplest acceptable solution?  |
| Validation                | Did the implementation satisfy the brief?  |
| Audit                     | Can we find evidence that it fails?        |

This keeps AI agents from over-designing solutions during requirement discovery, and keeps implementation focused on the accepted scope.

---

## Installation

```bash
npm install -g @winton979/task-cli
```

Initialize the workflow in your project:

```bash
task init
```

After initialization, Task CLI creates the `.ai/` workspace and installs workflow skills into both `.claude/skills/` and `.codex/skills/`.

### Exploration Protocol

Task CLI embeds the `grilling` primitive from [Matt Pocock's skills collection](https://github.com/mattpocock/skills.git). Its wording is the methodological foundation for decision-driven exploration, not a runtime dependency.

`task-explore` and `bug-explore` preserve the primitive's body verbatim. Their only workflow-specific interpretation of it is that "act on it" means creating the brief. `task-fast` uses a narrower clarification loop so the fast path remains fast.

`project-explore` is explicitly invoked, read-only, and evidence-driven. It answers when the available evidence supports a bounded conclusion and asks a question only when ambiguity would materially change the answer.

Task CLI neither requires nor installs a companion interviewing skill.

---

## Quick Start

### Project Understanding

```text
Claude Code: /project-explore
Codex CLI:   $project-explore
             ↓
evidence-based explanation  →  no artifacts or changes
```

### Small Feature / Enhancement

```text
/task-fast
    ↓
clarify + brief + implement + validate
    ↓
archive automatically
```

### Larger Requirement

```text
/task-explore  →  TASK_READY  →  /task-implement  →  optional /task-audit
```

`task-explore` writes a brief that supports a fresh-session handoff when needed. Before `TASK_READY`, it checks that a new implementation session could determine the goal, acceptance criteria, material constraints, and exclusions from the brief alone. This is a readiness check, not a requirement to start implementation in a new session. The brief preserves confirmed execution-critical context without becoming a repository snapshot; the implementing agent revalidates current repository facts. Briefs should stay within 500 words; they may extend to 1000 only when a shorter contract would omit execution-critical information. Requirements that still do not fit should be split before implementation.

When more than one active brief could match, identify the intended brief when invoking `task-implement`. The implementing agent rechecks repository facts and resolves local, reversible choices from existing conventions. It asks the user only for unresolved decisions that materially affect the contract, records confirmed narrow clarifications in the active brief, and returns material goal, scope, or acceptance changes to `task-explore`.

### Bug Fix

```text
/bug-explore  →  BUG_READY  →  /bug-fix  →  optional /bug-audit
```

Use `/task-cancel` or `/bug-cancel` when abandoning the current attempt before accepting it.

Run audit only when the risk is worth the extra pass, such as before a PR, after a large diff, when changing public APIs or core modules, when fixing production bugs, when security or data integrity is involved, or when the user explicitly asks for it.

For the highest-value audit, start a fresh session or use a different reviewer context and provide only the brief, final code or git diff, and relevant tests. Audit quality comes from new perspective and evidence, not from asking the same context to approve its own work.

### CLI Commands

```bash
task init       # initialize workspace and install skills
task refresh    # reinstall managed skills without touching .ai content
task doctor     # check workspace state, skill versions, gitignore rules
task --help
```

---

## Example: Preventing Over-Engineering

**Requirement:** *"Add CSV export."*

### Without task-cli

Common AI behavior — jumps straight into designing:

* `ExportService`
* `ExportRepository`
* `CSVAdapter`
* `Factory`
* new dependency

**Files changed:** 7
**New abstractions:** 4

### With task-cli

Exploration runs first. Complexity Assessment determines that a new project-wide capability is not justified.

Implementation:

* reuse existing export path
* modify two files
* no new dependency

**Files changed:** 2
**New abstractions:** 0

The workflow encourages the simplest acceptable implementation instead of the most elaborate one.

---

## Available Skills

**Project Understanding**

* `project-explore`

**Task Workflow**

* `task-fast`
* `task-explore`
* `task-implement`
* `task-audit`
* `task-cancel`

**Bug Workflow**

* `bug-explore`
* `bug-fix`
* `bug-audit`
* `bug-cancel`

**Decision Logging**

* `decision-log`
* `decision-sweep-weekly`
* `decision-curate`

---

## Decision Logging

Task CLI keeps a lightweight decision trail in `.ai/decisions/decisions.md`. Explore and fast-path skills should consult it before finalizing a brief, and pull in only the decisions that materially constrain the current task or bug.

The decisions file is intentionally narrow. It holds durable project invariants and reusable constraints, not a running transcript of every local implementation choice.

The default bias should be to skip writing. A decision should be logged only when leaving it undocumented would make a future task or bug exploration materially more likely to choose the wrong path.

### Weekly Decision Sweep

Calling `/decision-log` after every task is easy to forget. As a lower-friction alternative, run once per week (Friday is a natural fit):

```
/decision-sweep-weekly
```

The skill scans archived task and bug briefs from the past 7 days, judges which ones contain a decision worth keeping (cross-task impact, rejected alternatives, counter-intuitive choices, externally driven calls, or instructive cancellations), drafts the entries, and waits for confirmation before writing to `.ai/decisions/decisions.md`. When a draft overlaps with an existing decision, it presents both versions and asks whether to append, revise, merge, supersede, or skip.

### Decision Curation

When the decisions file starts collecting stale, duplicate, or low-value entries, run:

```
/decision-curate
```

The skill audits the current decisions file, classifies entries as keep, tighten, merge, or remove, and waits for explicit confirmation before changing anything. Its job is to keep the file short enough that explore can still read it cheaply.

Use `decision-log` for in-the-moment recording, `decision-sweep-weekly` for harvesting new durable constraints, and `decision-curate` for pruning old ones.

---

## Operational Boundaries

Task CLI is most effective when `active/` stays personal, local, and small. In that operating model, the main scaling risk is not total bug or task count, but whether the long-lived context remains high-signal.

Recommended working limits:

* Per developer, keep local `active` briefs at `1-3`. At `4-5`, the agent starts paying more context-switching cost.
* Total `archive` size can grow into the hundreds without becoming a primary problem, because normal flows do not re-read all historical briefs.
* Keep `.ai/decisions/decisions.md` lean. Around `15-30` durable entries is comfortable. Once it grows past `30`, run `/decision-curate` regularly.
* Weekly completed brief volume around `10-20` is still light for `decision-sweep-weekly`. Past `20-40`, expect more review effort to separate durable constraints from one-off noise.

Red flags that the workflow is becoming an agent burden:

* explore spends noticeable time filtering stale or irrelevant decisions
* many archived briefs are too small or repetitive to justify their own long-term trace
* weekly decision sweep produces mostly skip-worthy items
* one developer keeps more than a few local active briefs open at once

When those signals appear, the right response is usually to reduce noise in decisions and brief granularity, not to add more process.

---

## Directory Structure

```text
.ai/
├── tasks/
│   ├── active/
│   └── archive/
├── bugs/
│   ├── active/
│   └── archive/
└── decisions/
    └── decisions.md

.claude/skills/
.codex/skills/
```

The `archive/` directories are internal storage, not user-facing steps.

---

## Compared with OpenSpec-Style Workflows

Detailed specification workflows such as OpenSpec can improve alignment, traceability, and consistency for large initiatives, cross-team programs, and process-heavy environments.

The difficulty is that the same level of ceremony does not fit day-to-day engineering. For frequent bug fixes, small features, and fast iteration, the process becomes heavier than the change itself — maintenance overhead grows, documentation quality drifts, and teams gradually stop using the workflow as intended.

Task CLI takes a narrower approach: clarify the requirement, capture only the minimum useful brief, execute and validate against acceptance criteria, run audit only when risk justifies it, and keep a lightweight decision trail. The goal is a workflow people will actually keep using.

---

## Strengths and Tradeoffs

**Strengths**

* much lower process overhead for bugs, small features, and short iterations
* easier to adopt in mature codebases where engineers already know the product
* encourages real usage because the workflow is short enough to sustain
* keeps enough structure to improve clarity without forcing large documents

**Tradeoffs**

* less suitable for large cross-team initiatives that need formal design traceability
* relies more on engineer judgment and risk-triggered audit quality than a full spec process
* stores less long-form historical context than a dedicated spec repository

---

## Upgrading Existing Projects

If a project was initialized with an older version of task-cli, run:

```bash
task refresh
```

This will:

* keep `.ai/tasks`, `.ai/bugs`, and `.ai/decisions`
* remove only managed skills from `.claude/skills/` and `.codex/skills/`, including legacy `task-review` and `bug-review`, then reinstall the current set: `project-explore`, `task-fast`, `task-explore`, `task-implement`, `task-audit`, `task-cancel`, `bug-explore`, `bug-fix`, `bug-audit`, `bug-cancel`, `decision-log`, `decision-sweep-weekly`, `decision-curate`
* reinstall the latest versions of those skills

Unrelated custom skills in the same project are left untouched. Inspect the current setup first with `task doctor`.

## License

MIT

