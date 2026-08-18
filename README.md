# task-cli

[简体中文](README.zh-CN.md)

A lightweight workflow for AI-assisted development. It separates requirement exploration from implementation so an agent decides whether added complexity is justified before it starts coding.

> Explore decides whether complexity is justified. Implement delivers the least complex acceptable solution.

## Install

Requires Node.js 18 or later.

```bash
# npm
npm install -g @winton979/task-cli

# volta
volta install @winton979/task-cli

task init
```

`task init` creates the `.ai/` workspace and installs managed skills into `.claude/skills/` and `.codex/skills/`.

```text
.ai/
├── tasks/active and tasks/archive
├── bugs/active and bugs/archive
├── efforts/active and efforts/archive
└── decisions/decisions.md
```

## Workflows

In Claude Code, invoke a skill as `/skill-name`; in Codex CLI, use `$skill-name`.

| Need | Flow |
| --- | --- |
| Understand the project | `project-explore` |
| Small, unambiguous change | `task-fast` |
| Large or uncertain request | `effort-explore` |
| Non-trivial new or changed behavior | `task-explore` -> `task-implement` -> optional `task-audit` |
| Non-trivial bug fix | `bug-explore` -> `bug-fix` -> optional `bug-audit` |
| Abandon an attempt | `task-cancel` or `bug-cancel` |

Every task and bug entry starts with an evidence-based direct-completion check. When the requested behavior is explicit, the correction is a trivial narrow patch, project conventions determine the approach, and focused validation is available, the skill completes and verifies the work in the same invocation without creating a task, bug, or decision artifact. `task-fast` automatically continues with full task or bug exploration when that check does not qualify; it does not rely on the user's estimate that the work is small.

`task-explore` and `bug-explore` use the `grilling` (Grill Me) protocol from [Matt Pocock's skills collection](https://github.com/mattpocock/skills.git) as the methodological foundation for decision-driven exploration, not as a runtime dependency. Non-direct exploration maps decisions as a tree and asks the independent frontier in rounds, with a recommendation for each question.

`effort-explore` manages a large or uncertain request in natural language. It records unresolved decisions and the current frontier in one resumable Effort. Ask to continue it, check its status, or close it; closing always requires confirmation and preserves the archived record. It does not create a Spec or Task automatically.

## Decision Memory

Task and bug archives preserve work history. Code, tests, tooling, configuration, and project documentation preserve engineering knowledge. `decisions.md` is intentionally smaller: record only a non-obvious durable constraint that changes a specific future choice and is not already unambiguous in those artifacts.

Use `decision-log` for a confirmed constraint. `decision-sweep-weekly` is an on-demand curation pass, not a weekly ceremony or a requirement to produce decisions; a sweep that adds nothing is a successful result.

## Commands

```bash
task init        # create workspace and install managed skills
task add-repo    # add a Git repository and enable workspace mode
task use-context # store workflow state in a registered Git repository
task bind-repo   # override a repository path for the current machine
task repos       # list configured workspace repositories
task refresh     # reinstall managed skills without changing .ai content
task doctor      # check workspace state, skill versions, and gitignore rules
task --help
```

## workscope

`workscope` is a standalone workspace manifest tool shipped in the same package. It manages `workspace.yaml` and `workspace.local.yaml` only — it does not install skills, create `.ai/` state, or require `task init` to have been run.

```bash
workscope add-repo <path> [--id <id>] [--description <text>]
workscope use-context <id>
workscope bind-repo <id> <path>
workscope enable-repo <id> [--local]
workscope disable-repo <id> [--local]
workscope focus <id> [<id>...] [--local]   # enable listed, disable all others
workscope repos
workscope --help
```

`workscope focus` is useful when working on a subset of repositories: it enables the listed IDs and disables everything else, in one command. If a `context_repository` is configured, it must be included in the focus list.

The `--local` flag writes overrides to gitignored `workspace.local.yaml` instead of the shared `workspace.yaml`. workscope automatically adds `workspace.local.yaml` to `.gitignore` on first local write.

On the first write command in a directory, workscope also generates a `WORKSPACE.md` declaration describing the workspace layout. Edit it to customize the project name or description. Read-only commands (`repos`, `--help`) skip this generation.

## Multi-Repository Workspaces

Initialize task-cli in the directory you will use as the shared workflow root.

```bash
task init
task add-repo ../frontend --id frontend --description "Web application"
task bind-repo frontend D:/work/acme/web-client
task disable-repo frontend
task enable-repo frontend --local
task repos
```

The first `task add-repo` creates `workspace.yaml`. Use `task bind-repo` for per-developer path overrides (written to ignored `workspace.local.yaml`). Use `task use-context` to store workflow state in a registered Git repository when the launch root differs from the business repository.

## Upgrade

```bash
npm install -g @winton979/task-cli@latest   # or: volta install @winton979/task-cli
task doctor
task refresh
```

`task refresh` preserves `.ai/tasks`, `.ai/bugs`, `.ai/efforts`, `.ai/decisions`, `workspace.yaml`, `workspace.local.yaml`, and unrelated custom skills.

## License

MIT
