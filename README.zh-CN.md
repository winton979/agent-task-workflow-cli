# task-cli

[English](README.md)

一个轻量的 AI 辅助开发工作流。它将需求探索与实现分开，使智能体在开始编码前先判断额外复杂度是否合理。

> 探索决定复杂度是否合理；实现交付满足要求的最简方案。

## 安装

需要 Node.js 18 或更高版本。

```bash
# npm
npm install -g @winton979/task-cli

# volta
volta install @winton979/task-cli

task init
```

`task init` 会创建 `.ai/` 工作区，并将托管技能安装到 `.claude/skills/` 和 `.codex/skills/`。

```text
.ai/
├── tasks/active 和 tasks/archive
├── bugs/active 和 bugs/archive
└── decisions/decisions.md
```

## 工作流

在 Claude Code 中用 `/skill-name` 调用技能；在 Codex CLI 中用 `$skill-name`。

| 需求 | 流程 |
| --- | --- |
| 理解项目 | `project-explore` |
| 明显的小改动 | `task-fast` |
| 新增或修改行为 | `task-explore` -> `task-implement` -> 可选 `task-audit` |
| 缺陷修复 | `bug-explore` -> `bug-fix` -> 可选 `bug-audit` |
| 放弃尝试 | `task-cancel` 或 `bug-cancel` |

`task-explore` 与 `bug-explore` 采用 `grilling`（Grill Me）协议作为以决策驱动探索的方法论基础，该原语内置自 [Matt Pocock 的 skills collection](https://github.com/mattpocock/skills.git)，但不作为运行时依赖。

## 命令

```bash
task init        # 创建工作区并安装托管技能
task add-repo    # 添加 Git 仓库并启用工作区模式
task use-context # 将工作流状态存入已注册的 Git 仓库
task bind-repo   # 覆盖当前机器上的仓库路径
task repos       # 列出工作区中配置的仓库
task refresh     # 重新安装托管技能，不修改 .ai 内容
task doctor      # 检查工作区状态、技能版本和 gitignore 规则
task --help
```

## 多仓库工作区

在用作共享工作流根目录的位置初始化 task-cli。

```bash
task init
task add-repo ../frontend --id frontend --description "Web application"
task bind-repo frontend D:/work/acme/web-client
task disable-repo frontend
task enable-repo frontend --local
task repos
```

第一次 `task add-repo` 会创建 `workspace.yaml`。使用 `task bind-repo` 写入每开发者路径覆盖（位于被忽略的 `workspace.local.yaml`）。当启动根与业务仓库不同时，使用 `task use-context` 将工作流状态存入已注册的 Git 仓库。

## 升级

```bash
npm install -g @winton979/task-cli@latest   # 或: volta install @winton979/task-cli
task doctor
task refresh
```

`task refresh` 会保留 `.ai/tasks`、`.ai/bugs`、`.ai/decisions`、`workspace.yaml`、`workspace.local.yaml` 和无关的自定义技能。

## 许可证

MIT
