# task-cli

[English](README.md)

一个轻量、证据驱动的 AI 辅助研发工作流。小改动直接完成；非简单任务或缺陷先生成可审查的 brief，实施并验证后再归档。

## 安装

需要 Node.js 18 或更高版本。

```bash
npm install -g @winton979/task-cli
task init
task skill install codex   # 或：agents | claude
```

`task init` 只创建项目内的 `.ai/` 工作区。工作流技能安装到全局目录：`~/.codex/skills`、`~/.agents/skills` 或 `~/.claude/skills`。

```text
.ai/
├── tasks/active 和 tasks/archive
├── bugs/active 和 bugs/archive
└── decisions/decisions.md
```

## 工作流

Claude Code 使用 `/skill-name` 调用；Codex 使用 `$skill-name`。

| 场景 | 工作流 |
| --- | --- |
| 理解现有项目 | `project-explore` |
| 完成小任务或小修复 | `task-fast` |
| 交付非简单的新增或修改行为 | `task-explore` -> `task-implement` -> 可选 `task-audit` |
| 修复非简单缺陷 | `bug-explore` -> `bug-fix` -> 可选 `bug-audit` |
| 放弃当前尝试 | `task-cancel` 或 `bug-cancel` |

每个 task 和 bug 入口都会先做基于证据的直接完成检查。当目标明确、改动确实窄小、项目惯例足以决定实现方式，并且可以进行聚焦验证时，技能会在当前调用内完成并验证，不创建工件。否则 `task-fast` 会自动进入完整的 task 或 bug 探索，而不依赖用户对工作量的判断。

非直接完成的探索使用固定版本的 Grilling 协议：将决策组织为树，每轮只询问当前所有互不依赖的问题，并给出推荐答案。仓库事实由 Agent 自行调查，不要求用户提供可查到的信息。

Task 与 Bug brief 是精简的执行契约。`task-implement` 与 `bug-fix` 完成验证后才把 brief 移入 `archive/`。Audit 是独立的证伪式审查，仅在风险需要时启用。

## 命令

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

`workscope` 是同包提供的独立工作区清单工具，只管理 `workspace.yaml` 和 `workspace.local.yaml`，不会创建 `.ai/` 状态，也不安装技能。

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

`--local` 会把仅适用于当前机器的覆盖写入已忽略的 `workspace.local.yaml`。

## 多仓库工作区

```bash
task init
task add-repo ../frontend --id frontend --description "Web application"
task bind-repo frontend D:/work/acme/web-client
task repos
```

如果工作流状态需要放在某个已登记仓库中，使用 `task use-context`。禁用的仓库会从日常探索范围中排除，除非用户显式要求查看。

## 升级

```bash
npm install -g @winton979/task-cli@latest
task skill update
task doctor
task refresh
```

`task refresh` 会保留已有 tasks、bugs、decisions、workspace 清单和无关的自定义技能。

## 许可证

MIT
