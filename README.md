# task-cli

[简体中文](README.zh-CN.md)

A lightweight workflow for AI-assisted development. It separates requirement exploration from implementation so an agent decides whether added complexity is justified before it starts coding.

> Explore decides whether complexity is justified. Implement delivers the least complex acceptable solution.

## When It Fits

Use task-cli with Claude Code or Codex CLI when a mature codebase has frequent bug fixes and small-to-medium feature work. It keeps enough structure to clarify scope, validate outcomes, and retain durable decisions without maintaining large specifications.

It is less suitable for initiatives that require formal cross-team design approval, long-lived specification traceability, or coordination across independent developer workspaces. A single local workflow can cover a system split across related Git repositories.

## Install From npm

[`@winton979/task-cli`](https://www.npmjs.com/package/@winton979/task-cli) requires Node.js 18 or later. The npm package page renders this README, including the multi-repository workspace workflow below.

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

### Upgrade an Existing Install

```bash
npm install -g @winton979/task-cli@latest
task doctor
task refresh
```

`task refresh` updates only task-cli-managed skills. It preserves tasks, bugs, decisions, `workspace.yaml`, `workspace.local.yaml`, and unrelated custom skills.

### Multi-Repository Workspaces

For a full-stack system split across repositories, initialize task-cli in the directory you will use as the shared agent workflow root. The existing `.ai/` directory keeps task, bug, and decision records there; configured repositories remain independent Git worktrees.

```bash
task init
task add-repo ../frontend --id frontend --description "Web application"
task bind-repo frontend D:/work/acme/web-client
task repos
```

The first `task add-repo` creates `workspace.yaml` and refreshes task-cli-managed skills so the agent can use the repository map immediately. When the workflow root is itself a Git repository, it is registered automatically as `.` before the requested repository is added.

```json
{
  "version": 1,
  "repositories": [
    { "id": "backend", "path": "." },
    { "id": "frontend", "path": "../frontend", "description": "Web application" }
  ]
}
```

`workspace.yaml` uses JSON syntax, which is a YAML-compatible subset, so it stays dependency-free and can be safely versioned with the workflow root. Repository paths are relative to that root; keep related checkouts in a portable layout. `task init` alone does not create this file, so existing single-project workflows remain unchanged.

When an individual developer keeps repositories in a different layout, run `task bind-repo <id> <path>`. It writes an ignored `workspace.local.yaml` that maps repository IDs to local paths. A local path may be absolute or relative to the workflow root and overrides the shared default only on that machine.

For a workflow initialized by an earlier task-cli version, run `task refresh` before the first binding so its `.gitignore` excludes the local file. `task bind-repo` refuses to write a local config that Git would track; remove any later `!workspace.local.yaml` rule first. If the file was already tracked, remove it from Git's index before binding.

```json
{
  "version": 1,
  "repositories": {
    "frontend": "D:/work/acme/web-client"
  }
}
```

`task repos` and `task doctor` use the resolved paths. `task bind-repo` requires the path to be a Git repository root and rejects binding the same repository to more than one ID. `task doctor` reports missing, non-Git, duplicate, or non-root paths.

The manifest is a context map, not an instruction to load every repository. Agents first identify the repositories relevant to the request, then record cross-repository working sets with repository-prefixed paths such as `frontend/src/auth`.

## Choose a Workflow

In Claude Code, invoke a skill as `/skill-name`; in Codex CLI, use `$skill-name`.

| Need | Flow | Result |
| --- | --- | --- |
| Understand the existing project | `project-explore` | Read-only, evidence-based explanation; no artifacts or changes. |
| Obvious small change or fix | `task-fast` | Create a concise execution brief, implement directly, validate, and archive in one flow. |
| New or changed behavior | `task-explore` -> `task-implement` -> optional `task-audit` | A concise, implementation-agnostic task brief followed by validated work. Straightforward changes execute directly; material implementation choices use an in-conversation proposal gate. |
| Bug fix | `bug-explore` -> `bug-fix` -> optional `bug-audit` | Evidence, a root-cause-focused fix brief followed by direct fixing or, when needed, an in-conversation fix strategy gate. |
| Abandon an active attempt | `task-cancel` or `bug-cancel` | Leave the attempt without treating it as completed work. |

### Explore Before Implementing

Exploration keeps repository facts and user decisions separate: inspect discoverable facts, then ask one material user-owned decision at a time. It records complexity as a constraint or risk, not an implementation design. Before producing a brief, it stops when the contract is executable, relevant decisions are consistent, and remaining uncertainty is either recorded as a risk or does not block work.

### Grilling Produces the Brief

The `grilling` (Grill Me) protocol is the quality gate for a high-quality brief: it drives the conversation to shared understanding before the agent acts. Task CLI embeds the primitive from [Matt Pocock's skills collection](https://github.com/mattpocock/skills.git) as the methodological foundation for decision-driven exploration, not as a runtime dependency.

`task-explore` and `bug-explore` preserve the protocol: investigate discoverable facts, put material decisions to the user one at a time, and wait for confirmation before acting. In task-cli, acting means creating the brief. No companion interviewing skill is required or installed.

`task-fast` is an explicit low-ceremony path for obvious, localized, low-risk changes or fixes. It still creates and archives a concise task brief, but user invocation authorizes direct implementation when the outcome is clear and existing project conventions determine the approach. If investigation finds material uncertainty, `task-fast` stops and routes changed behavior to `task-explore` or non-obvious defects to `bug-explore`.

For a task requirement, `task-explore` produces `TASK_READY` only when its brief could support a fresh implementation session. This is a readiness check, not a requirement to start a new session. The brief normally stays within 500 words; it may reach 1000 only when needed to preserve execution-critical scope, constraints, risks, or acceptance criteria. Split work that cannot remain coherent within that limit.

`task-implement` rechecks repository facts and relevant current decisions. Current code, tests, configuration, and direct observations describe current behavior; a brief records the confirmed desired contract, while an archive is historical context. A difference between current behavior and the brief's Goal is normally the work to implement, not a contradiction. It follows existing conventions for local, reversible choices, asks about unresolved material decisions, and returns material changes to goal, scope, or acceptance criteria to exploration. When several active briefs could match, identify the intended one rather than relying on recency.

### Decision Gates

`task-implement` and `bug-fix` default to direct execution. They stop for confirmation only when an unresolved decision can materially change system behavior, architecture or boundaries, compatibility, long-term maintenance, or risk profile. Routine local details stay owned by the agent.

When a task implementation has multiple reasonable approaches, affects boundaries, introduces a durable design decision, or requires material assumptions, `task-implement` presents an `Implementation Proposal`: the agent's recommended modification report, not a request for the user to design the implementation. When bug evidence or correction strategy is materially uncertain, `bug-fix` presents a `Fix Strategy Proposal`: the agent's recommended fix report, not a request for routine repair choices. These proposals are conversation-level gates, not `.ai/` artifacts and not separate skills.

New briefs use YAML frontmatter whenever evidence establishes an `area`, relevant active `decision`, or an evidence-based `working_set`; fields without a value are omitted rather than written as empty placeholders. In a multi-repository workspace, a cross-repository working set lists repository-ID-prefixed paths, such as `frontend/src/auth`; older unprefixed metadata remains valid. These fields help choose context; they never make a repository snapshot authoritative or turn the working set into a hard boundary. Frontmatter may be omitted only when none of those values is established; older briefs without frontmatter remain valid. Confirmed narrow clarifications are recorded under `Revisions`; material contract changes return to exploration.

When the requirement indicates it, exploration records concrete compatibility, migration, data, security, performance, concurrency, release, or operational risks. It does not require an empty checklist for every small task.

### Audit When Risk Justifies It

Use `task-audit` or `bug-audit` before a PR, after a large diff, for public APIs or core modules, production fixes, security or data-integrity work, or when explicitly requested. A task audit first scans the final code and diff before reading the brief, then checks requirement coverage. The strongest audit uses a fresh session or reviewer context with the brief, final diff or code, and relevant tests.

## Commands and Skills

```bash
task init       # create the workspace and install managed skills
task add-repo   # add a Git repository and enable workspace mode
task bind-repo  # override a repository path for the current machine
task repos      # list configured workspace repositories
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

`.ai/decisions/decisions.md` stores durable project invariants and reusable constraints, not a transcript of local implementation choices. Current code and tests describe behavior; active decisions explain durable constraints that future work could otherwise choose incorrectly. The default is to skip logging unless omitting a decision would make a later exploration materially more likely to choose incorrectly.

| Action | Use it for |
| --- | --- |
| `decision-log` | Record an approved durable decision. |
| `decision-sweep-weekly` | Review the previous seven days of archived briefs, draft worthwhile decisions, and wait for confirmation. |
| `decision-curate` | Classify stale or duplicate entries and wait for confirmation before changing the log. |

New entries use a stable `DEC-YYYYMMDD-descriptive-slug` heading and concise lifecycle metadata:

```md
## DEC-20260716-token-storage

Status: active
Scope: auth, api
Applies when: all supported configurations
Supersedes: -
Superseded by: -
```

`active` entries constrain new work. `superseded` and `deprecated` entries are history unless a task explicitly needs them. When a later task replaces a durable conclusion, the new active entry names its predecessor and the prior entry records its successor, but only after explicit user confirmation. If overlapping active decisions conflict, the agent surfaces the conflict instead of choosing one. Legacy date-based entries remain valid and are not bulk-migrated.

### Operating Limits

Keep `active/` personal, local, and small. The scaling concern is high-signal context, not total archived work.

| Signal | Working range | Response when exceeded |
| --- | --- | --- |
| Active briefs per developer | 1-3; 4-5 increases context-switching cost | Finish, cancel, or split active work. |
| Archive size | Hundreds are acceptable | Normal flows do not reread the archive. |
| Active decisions | 15-30 entries | Run `decision-curate` regularly after 30. |
| Completed briefs per week | 10-20 is light | At 20-40, expect more review to separate durable constraints from one-off noise. |

Repeatedly filtering stale decisions, archiving tiny repetitive briefs, producing mostly skipped weekly-sweep candidates, or carrying too many active briefs are signs to reduce decision noise or brief granularity rather than add process.

## Refresh an Existing Project

```bash
task doctor
task refresh
```

`task refresh` preserves `.ai/tasks`, `.ai/bugs`, `.ai/decisions`, `workspace.yaml`, `workspace.local.yaml`, and unrelated custom skills. It removes only task-cli-managed skills, including legacy `task-review` and `bug-review`, then reinstalls the skills listed above. Run `task doctor` first to see whether a refresh is needed.

## License

MIT

