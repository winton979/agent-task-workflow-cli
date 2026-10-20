# task-cli

[简体中文](README.zh-CN.md)

A lightweight, evidence-driven workflow for AI-assisted software changes. It keeps small fixes fast, turns non-trivial work into reviewable task or bug briefs, and validates implementation before archiving it.

## Install

Requires Node.js 18 or later.

```bash
npm install -g @winton979/task-cli
task init
task skill install codex   # or: agents | claude
```

`task init` creates project-local state under `.ai/`. Workflow skills are installed globally at `~/.codex/skills`, `~/.agents/skills`, or `~/.claude/skills`.

```text
.ai/
├── tasks/active and tasks/archive
├── bugs/active and bugs/archive
└── decisions/decisions.md
```

## Workflows

In Claude Code, invoke a skill as `/skill-name`; in Codex, use `$skill-name`.

| Need | Workflow |
| --- | --- |
| Understand the existing project | `project-explore` |
| Complete a small task or fix | `task-fast` |
| Deliver non-trivial new or changed behavior | `task-explore` -> `task-implement` -> optional `task-audit` |
| Fix a non-trivial bug | `bug-explore` -> `bug-fix` -> optional `bug-audit` |
| Record a durable project constraint | `decision-log` |
| Clean up decision memory | `decision-curate` or `decision-sweep-weekly` |
| Abandon an attempt | `task-cancel` or `bug-cancel` |

Every task and bug entry starts with an evidence-based direct-completion check. When the request is explicit, the patch is genuinely narrow, project conventions determine the approach, and focused validation is available, the skill completes and verifies the change without creating an artifact. Otherwise, `task-fast` automatically continues with full task or bug exploration; it does not rely on the user's estimate that the work is small.

Non-direct exploration uses the pinned Grilling protocol: decisions form a tree, and each round asks the independent frontier in rounds with a recommended answer. Repository facts are investigated by the agent rather than pushed back to the user.

Task and bug briefs are concise execution contracts. `task-implement` and `bug-fix` validate before moving completed briefs into `archive/`. Audits are independent, evidence-seeking reviews and are optional unless the risk warrants one.

## Decision Memory

`.ai/decisions/decisions.md` stores only durable project constraints that change a specific future choice. Use `decision-log` to add a confirmed constraint. Use `decision-curate` to remove or tighten stale, duplicate, or low-value entries, and `decision-sweep-weekly` as an on-demand review of recent task and bug work. A zero-entry result is valid.

## Commands

```bash
task init
task add-repo <path> [--id <id>] [--description <text>]
task use-context <id>
task bind-repo <id> <path>
task enable-repo <id> [--local]
task disable-repo <id> [--local]
task repos
task refresh
task skill install <agents|claude|codex>
task skill update [<target> ...]
task skill remove [<target> ...]
task doctor
task --version
task --help
```

## workscope

`workscope` is a standalone workspace manifest tool shipped in the same package. It manages `workspace.yaml` and `workspace.local.yaml` without creating `.ai/` state or installing skills.

```bash
workscope add-repo <path> [--id <id>] [--description <text>]
workscope use-context <id>
workscope bind-repo <id> <path>
workscope enable-repo <id> [--local]
workscope disable-repo <id> [--local]
workscope focus <id> [<id>...] [--local]
workscope repos
workscope --help
```

The `--local` flag writes machine-specific overrides to ignored `workspace.local.yaml`.

## Multi-Repository Workspaces

```bash
task init
task add-repo ../frontend --id frontend --description "Web application"
task bind-repo frontend D:/work/acme/web-client
task repos
```

Use `task use-context` when workflow state should live in a registered repository rather than the launch directory. Disabled repositories are excluded from routine exploration until explicitly requested.

## Upgrade

```bash
npm install -g @winton979/task-cli@latest
task skill update
task doctor
task refresh
```

`task refresh` preserves existing tasks, bugs, decisions, workspace manifests, and unrelated custom skills.

## License

MIT
