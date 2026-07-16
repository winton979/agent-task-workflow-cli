# task-cli

A lightweight workflow for AI-assisted development. It separates requirement exploration from implementation so an agent decides whether added complexity is justified before it starts coding.

> Explore decides whether complexity is justified. Implement delivers the least complex acceptable solution.

## When It Fits

Use task-cli with Claude Code or Codex CLI when a mature codebase has frequent bug fixes and small-to-medium feature work. It keeps enough structure to clarify scope, validate outcomes, and retain durable decisions without maintaining large specifications.

It is less suitable for initiatives that require formal cross-team design approval, long-lived specification traceability, or a dedicated specification repository.

## Install

```bash
npm install -g @winton979/task-cli
task init
```

`task init` creates the `.ai/` workspace and installs managed skills into `.claude/skills/` and `.codex/skills/`. No companion interviewing skill is required.

```text
.ai/
├── tasks/active and tasks/archive
├── bugs/active and bugs/archive
└── decisions/decisions.md
```

## Choose a Workflow

In Claude Code, invoke a skill as `/skill-name`; in Codex CLI, use `$skill-name`.

| Need | Flow | Result |
| --- | --- | --- |
| Understand the existing project | `project-explore` | Read-only, evidence-based explanation; no artifacts or changes. |
| Small, contained change | `task-fast` | Clarify, confirm a brief, implement, validate, and archive in one flow. |
| Larger requirement | `task-explore` -> `task-implement` -> optional `task-audit` | A concise, implementation-agnostic task brief followed by validated work. |
| Bug fix | `bug-explore` -> `bug-fix` -> optional `bug-audit` | Evidence, a root-cause-focused fix brief, then validation. |
| Abandon an active attempt | `task-cancel` or `bug-cancel` | Leave the attempt without treating it as completed work. |

### Explore Before Implementing

Exploration keeps repository facts and user decisions separate: inspect discoverable facts, then ask one material user-owned decision at a time. It records complexity as a constraint or risk, not an implementation design.

For a larger task, `task-explore` produces `TASK_READY` only when its brief could support a fresh implementation session. This is a readiness check, not a requirement to start a new session. The brief normally stays within 500 words; it may reach 1000 only when needed to preserve execution-critical scope, constraints, risks, or acceptance criteria. Split work that cannot remain coherent within that limit.

`task-implement` rechecks repository facts. It follows existing conventions for local, reversible choices, asks about unresolved material decisions, and returns material changes to goal, scope, or acceptance criteria to exploration. When several active briefs could match, identify the intended one rather than relying on recency.

### Audit When Risk Justifies It

Use `task-audit` or `bug-audit` before a PR, after a large diff, for public APIs or core modules, production fixes, security or data-integrity work, or when explicitly requested. The strongest audit uses a fresh session or reviewer context with the brief, final diff or code, and relevant tests.

## Commands and Skills

```bash
task init       # create the workspace and install managed skills
task refresh    # reinstall managed skills without changing .ai content
task doctor     # check workspace state, skill versions, and gitignore rules
task --help
```

| Area | Skills |
| --- | --- |
| Project understanding | `project-explore` |
| Tasks | `task-fast`, `task-explore`, `task-implement`, `task-audit`, `task-cancel` |
| Bugs | `bug-explore`, `bug-fix`, `bug-audit`, `bug-cancel` |
| Decision memory | `decision-log`, `decision-sweep-weekly`, `decision-curate` |

## Keep the Workspace Useful

### Decision Memory

`.ai/decisions/decisions.md` stores durable project invariants and reusable constraints, not a transcript of local implementation choices. Explore and fast paths read only entries that materially constrain the current work. The default is to skip logging unless omitting a decision would make a later exploration materially more likely to choose incorrectly.

| Action | Use it for |
| --- | --- |
| `decision-log` | Record an approved durable decision. |
| `decision-sweep-weekly` | Review the previous seven days of archived briefs, draft worthwhile decisions, and wait for confirmation. |
| `decision-curate` | Classify stale or duplicate entries and wait for confirmation before changing the log. |

### Operating Limits

Keep `active/` personal, local, and small. The scaling concern is high-signal context, not total archived work.

| Signal | Working range | Response when exceeded |
| --- | --- | --- |
| Active briefs per developer | 1-3; 4-5 increases context-switching cost | Finish, cancel, or split active work. |
| Archive size | Hundreds are acceptable | Normal flows do not reread the archive. |
| Durable decisions | 15-30 entries | Run `decision-curate` regularly after 30. |
| Completed briefs per week | 10-20 is light | At 20-40, expect more review to separate durable constraints from one-off noise. |

Repeatedly filtering stale decisions, archiving tiny repetitive briefs, producing mostly skipped weekly-sweep candidates, or carrying too many active briefs are signs to reduce decision noise or brief granularity rather than add process.

## Refresh an Existing Project

```bash
task doctor
task refresh
```

`task refresh` preserves `.ai/tasks`, `.ai/bugs`, `.ai/decisions`, and unrelated custom skills. It removes only task-cli-managed skills, including legacy `task-review` and `bug-review`, then reinstalls the skills listed above. Run `task doctor` first to see whether a refresh is needed.

## License

MIT

