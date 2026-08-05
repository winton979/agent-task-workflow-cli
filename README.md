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
└── decisions/decisions.md
```

## Workflows

In Claude Code, invoke a skill as `/skill-name`; in Codex CLI, use `$skill-name`.

| Need | Flow |
| --- | --- |
| Understand the project | `project-explore` |
| Obvious small change | `task-fast` |
| New or changed behavior | `task-explore` -> `task-implement` -> optional `task-audit` |
| Bug fix | `bug-explore` -> `bug-fix` -> optional `bug-audit` |
| Abandon an attempt | `task-cancel` or `bug-cancel` |

`task-explore` and `bug-explore` use the `grilling` (Grill Me) protocol from [Matt Pocock's skills collection](https://github.com/mattpocock/skills.git) as the methodological foundation for decision-driven exploration, not as a runtime dependency.

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

`task refresh` preserves `.ai/tasks`, `.ai/bugs`, `.ai/decisions`, `workspace.yaml`, `workspace.local.yaml`, and unrelated custom skills.

## License

MIT
