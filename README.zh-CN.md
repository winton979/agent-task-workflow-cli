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
├── efforts/active 和 efforts/archive
├── specs
└── decisions/decisions.md
```

## 工作流

在 Claude Code 中用 `/skill-name` 调用技能；在 Codex CLI 中用 `$skill-name`。

| 需求 | 流程 |
| --- | --- |
| 理解项目 | `project-explore` |
| 小且无歧义的改动 | `task-fast` |
| 大型或不确定的请求 | `effort-explore` |
| 将 ready Effort 转为经审查的任务 | `effort-spec` -> `task-implement` |
| 非简单的新增或修改行为 | `task-explore` -> `task-implement` -> 可选 `task-audit` |
| 非简单的缺陷修复 | `bug-explore` -> `bug-fix` -> 可选 `bug-audit` |
| 放弃尝试 | `task-cancel` 或 `bug-cancel` |

每个任务和缺陷入口都会先做基于证据的直接完成检查：当目标明确、改动是真正窄小的补丁、项目惯例足以决定实现方式，且可进行聚焦验证时，技能会在当前调用内完成并验证，不创建 task、bug 或 decision 记录。Direct Completion 是 proof obligation，不是 agent 的 confidence score：无法由请求、仓库证据和适用 decision 排除的歧义，必须进入探索。若检查不通过，`task-fast` 会在同一次调用内自动进入完整的 task 或 bug 探索，而不依赖用户对任务是否简单的判断。

`task-explore` 与 `bug-explore` 采用 `grilling`（Grill Me）协议作为以决策驱动探索的方法论基础，该原语内置自 [Matt Pocock 的 skills collection](https://github.com/mattpocock/skills.git)，但不作为运行时依赖。非直接完成的探索会将决策组织为树，并按轮次提出当前所有互不依赖的问题，同时给出每题建议。

`effort-explore` 用自然语言管理大型或不确定的请求。它将未决决策和当前 frontier 记录在一个可恢复的 Effort 中，同时将已观察事实、推断理由和证据冲突与用户确认的决策分开保存。当没有未决项能实质改变 Spec contract 时，Effort 才 ready；剩余不确定性必须与 contract 无关，或作为无需在实现前决策的 non-blocking Risk 记录。可以要求继续、查询状态、关闭或显式重新打开。关闭总是需要确认，并会保留归档记录。

`CONTEXT.md` 是工作流状态根目录下可选的单一词汇表。`task init` 不会创建它。当重要的项目术语含义模糊、与词汇表或代码冲突，或成为跨任务稳定概念时，`effort-explore` 会提出精简的词汇表修改，并等待明确确认。它绝不将词汇表当作 Spec、决策日志或会话记录。

`effort-spec` 将 ready 且 open 的 Effort 转为可恢复的 Spec Proposal。用户显式确认 Spec 后，它会在 `.ai/specs/` 写入受版本控制的 Spec Record，并在内部展示作为 contract execution projection 的任务图；第二次确认才会一次性创建全部生成型 Task Brief。任务图反馈可以调整分组、归属或真实依赖，但不能改变已确认的 Spec；contract 变更必须回到 Spec Proposal。每个验收条件都会指定最高实用的 Verification Boundary，Task 通常交付可独立观察的端到端行为；广泛机械式重构则使用显式的 expand-migrate-contract 序列。生成型 Task 保留来源条件追溯、真实依赖门禁和完成证据；既有 Task 与 Bug 流程保持不变。

对于不符合直接完成条件的 Bug，`bug-explore` 会先建立能捕捉到原问题的、已脱敏的诊断循环，然后才能确认根因或产出 `BUG_READY`。`bug-fix` 复用该循环作为回归证据，并在归档前移除临时诊断插桩。

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

`task refresh` 会保留 `.ai/tasks`、`.ai/bugs`、`.ai/efforts`、`.ai/specs`、`.ai/decisions`、`workspace.yaml`、`workspace.local.yaml` 和无关的自定义技能。

## 许可证

MIT
