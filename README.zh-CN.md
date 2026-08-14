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

## 决策沉淀

任务和缺陷归档保存工作历史；代码、测试、工具、配置和项目文档保存工程知识。`decisions.md` 刻意保持精简：只记录会改变某个具体未来选择、且无法从这些工程制品中无歧义得出的长期约束。

对于已确认的约束，使用 `decision-log`。`decision-sweep-weekly` 是按需触发的策展与清理，不是每周例行事务，也不要求产出新的 Decision；没有新增记录同样是成功结果。

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

## workscope

`workscope` 是同一包内的独立工作区清单工具。它只管理 `workspace.yaml` 和 `workspace.local.yaml`，不安装技能、不创建 `.ai/` 状态目录，也不要求先运行 `task init`。

```bash
workscope add-repo <path> [--id <id>] [--description <text>]
workscope use-context <id>
workscope bind-repo <id> <path>
workscope enable-repo <id> [--local]
workscope disable-repo <id> [--local]
workscope focus <id> [<id>...] [--local]   # 启用列出的仓库，禁用其余全部
workscope repos
workscope --help
```

`workscope focus` 适用于只关注部分仓库的场景：一条命令启用列出的 ID，禁用其他全部。若已配置 `context_repository`，必须将其包含在 focus 列表中。

`--local` 标志将覆盖写入被忽略的 `workspace.local.yaml`，而非共享的 `workspace.yaml`。workscope 在首次本地写入时自动将 `workspace.local.yaml` 加入 `.gitignore`。

在某目录首次执行写命令时,workscope 还会生成 `WORKSPACE.md` 声明文件,描述工作区布局。可手动编辑其中的项目名或描述。只读命令(`repos`、`--help`)不会触发生成。

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
