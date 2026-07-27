# task-cli

[English](README.md)

一个轻量的 AI 辅助开发工作流。它将需求探索与实现分开，使智能体在开始编码前先判断额外复杂度是否合理。

> 探索决定复杂度是否合理；实现交付满足要求的最简方案。

## 适用场景

当成熟代码库中经常有缺陷修复和中小型功能需求时，可在 Claude Code 或 Codex CLI 中使用 task-cli。它以较少的结构帮助澄清范围、验证结果并保留长期有效的决策，而无需维护大型规格文档。

它不太适合需要正式跨团队设计审批、长期规格追溯，或协调多个相互独立开发者工作区的项目。一个本地工作流可覆盖拆分在相关 Git 仓库中的系统。

## 从 npm 安装

[`@winton979/task-cli`](https://www.npmjs.com/package/@winton979/task-cli) 需要 Node.js 18 或更高版本。npm 包页面会渲染本 README，其中包括下方的多仓库工作流说明。

```bash
npm install -g @winton979/task-cli
task init
```

`task init` 会创建 `.ai/` 工作区，并将托管技能安装到 `.claude/skills/` 和 `.codex/skills/`。不需要额外的访谈技能。

```text
.ai/
├── tasks/active 和 tasks/archive
├── bugs/active 和 bugs/archive
└── decisions/decisions.md
```

### 升级已有安装

```bash
npm install -g @winton979/task-cli@latest
task doctor
task refresh
```

`task refresh` 只更新由 task-cli 托管的技能。它会保留任务、缺陷、决策、`workspace.yaml`、`workspace.local.yaml` 和不相关的自定义技能。

### 多仓库工作区

对于由多个仓库组成的全栈系统，请在用作共享智能体工作流根目录的位置初始化 task-cli。已有的 `.ai/` 目录在该处保存任务、缺陷和决策记录；配置的仓库仍是彼此独立的 Git 工作树。

```bash
task init
task add-repo ../frontend --id frontend --description "Web application"
task bind-repo frontend D:/work/acme/web-client
task repos
```

第一次执行 `task add-repo` 会创建 `workspace.yaml`，并刷新 task-cli 托管的技能，使智能体能立即使用仓库映射。当工作流根目录本身是 Git 仓库时，执行首次添加其他仓库会自动将其注册为 `.`。

```json
{
  "version": 1,
  "repositories": [
    { "id": "backend", "path": "." },
    { "id": "frontend", "path": "../frontend", "description": "Web application" }
  ]
}
```

`workspace.yaml` 使用 JSON 语法，这是 YAML 的兼容子集，因此无需依赖即可安全地随工作流根目录纳入版本控制。仓库路径相对于该根目录；请将相关 checkout 保持在可移植的布局中。仅运行 `task init` 不会创建这个文件，因此已有的单项目工作流不受影响。

当某位开发者以不同的目录布局保存仓库时，运行 `task bind-repo <id> <path>`。它会写入被忽略的 `workspace.local.yaml`，将仓库 ID 映射到本地路径。本地路径可以是绝对路径，也可以相对于工作流根目录，并且只在该机器上覆盖共享默认路径。

对于由旧版 task-cli 初始化的工作流，请在首次绑定前运行 `task refresh`，以便 `.gitignore` 忽略本地文件。`task bind-repo` 拒绝写入会被 Git 跟踪的本地配置；请先移除其后出现的 `!workspace.local.yaml` 规则。如果文件已被跟踪，请在绑定前将它从 Git 索引中移除。

```json
{
  "version": 1,
  "repositories": {
    "frontend": "D:/work/acme/web-client"
  }
}
```

`task repos` 和 `task doctor` 使用解析后的路径。`task bind-repo` 要求路径是 Git 仓库根目录，并拒绝将同一仓库绑定到多个 ID。`task doctor` 会报告缺失、非 Git、重复或不是根目录的路径。

该清单是上下文映射，不是要求加载每个仓库的指令。智能体会先确定与请求相关的仓库，再使用带仓库 ID 前缀的路径记录跨仓库工作集，例如 `frontend/src/auth`。

## 选择工作流

在 Claude Code 中用 `/skill-name` 调用技能；在 Codex CLI 中用 `$skill-name`。

| 需求 | 流程 | 结果 |
| --- | --- | --- |
| 理解现有项目 | `project-explore` | 只读、以证据为基础的说明；不创建工件或修改。 |
| 明显的小改动或小修复 | `task-fast` | 创建简洁执行简报、直接实现、验证，并在一次流程中归档。 |
| 新增或修改行为 | `task-explore` -> `task-implement` -> 可选 `task-audit` | 先形成简洁且不依赖具体实现的任务简报，再完成经验证的实现。直接执行清晰改动；重要实现选择使用对话内 proposal gate。 |
| 缺陷修复 | `bug-explore` -> `bug-fix` -> 可选 `bug-audit` | 形成证据和聚焦根因的修复简报，再直接修复，或在必要时使用对话内修复策略 gate。 |
| 放弃当前尝试 | `task-cancel` 或 `bug-cancel` | 结束该尝试，但不将其视为已完成工作。 |

### 实现前先探索

探索将仓库事实与用户决策分开：先检查可发现的事实，再一次询问一个重要的、由用户决定的问题。它将复杂度记录为约束或风险，而不是实现设计。在生成简报前，它会确保任务契约可执行、相关决策一致，并且剩余不确定性已记录为风险或不会阻碍执行。

### Grilling 生成简报

`grilling`（Grill Me）协议是高质量简报的质量门：它通过逐步对话形成共同理解。task-cli 将该原语作为以决策驱动探索的方法论基础，内置自 [Matt Pocock 的 skills collection](https://github.com/mattpocock/skills.git)，但不将其作为运行时依赖。

`task-explore` 和 `bug-explore` 会保留该协议：调查可发现的事实，一次向用户提出一个重要决策并等待确认。在 task-cli 中，行动指创建简报。不需要也不会安装额外的访谈技能。

`task-fast` 是一个明确的低仪式路径，用于明显、局部、低风险的小改动或小修复。它仍会创建并归档简洁的任务简报，但当目标清楚且现有项目惯例已决定实现方式时，用户调用即表示授权直接实现。如果调查发现重要不确定性，`task-fast` 会停止，并将行为变更交给 `task-explore`，或将非明显缺陷交给 `bug-explore`。

对于任务需求，只有当其简报足以支持一次新的实现会话时，`task-explore` 才会产出 `TASK_READY`。这是就绪性检查，不要求开始新会话。简报通常不超过 500 词；只有在保留执行所需的范围、约束、风险或验收标准时，才可扩展到 1000 词。无法保持连贯的工作应拆分。

`task-implement` 会重新检查仓库事实和相关当前决策。当前代码、测试、配置和直接观察描述当前行为；简报记录的是已确认的目标契约。当前事实与简报的 Goal 或 Acceptance Criteria 不同通常意味着需要实现的工作；只有当前事实与简报的 Context 或 Constraints 冲突时才应提出冲突。它会遵循本地惯例处理局部且可逆的选择，询问未解决的重要决策，并将对目标、范围或验收标准的实质变更送回探索流程。当多个活动简报可能匹配时，应识别目标简报，而不要依赖最近创建的简报。

### 决策门

`task-implement` 和 `bug-fix` 默认直接执行。只有当未解决决策会实质影响系统行为、架构或边界、兼容性、长期维护或风险画像时，才停下来确认。常规的局部实现细节仍由智能体负责。

当任务实现存在多个合理路径、影响边界、引入长期设计决策，或需要会实质影响结果的假设时，`task-implement` 会提出 `Implementation Proposal`：这是智能体推荐的修改报告，不是要求用户设计实现。当缺陷证据或修复策略存在重要不确定性时，`bug-fix` 会提出 `Fix Strategy Proposal`：这是智能体推荐的修复报告，不是要求用户选择常规修复细节。这些 proposal 是对话级决策门，不是 `.ai/` 工件，也不是独立技能。

新简报只要已根据证据确定了 `areas`、相关活动 `decisions` 或基于证据的 `working_set` 中任一项，就必须使用 YAML frontmatter；没有值的字段应省略，不能写成空占位。在多仓库工作区中，跨仓库工作集必须使用仓库 ID 前缀，例如 `frontend/src/auth` 或 `api/tests/auth`；旧的无前缀元数据仍然有效。这些字段有助于选择上下文，但从不使仓库快照成为权威，也不会将工作集变成硬性边界。只有三项都未能确定时才可省略 frontmatter；没有这些字段的旧简报仍有效。已确认的窄范围澄清记录在 `Revisions` 下；实质性的契约变更会回到探索流程。

当需求表明有必要时，探索会记录具体的兼容性、迁移、数据、安全、性能、并发、发布或运维风险。它不会为每个小任务强制生成空的检查表。

### 在风险合理时审计

在提交 PR 前、较大差异后、公共 API 或核心模块、生产修复、安全或数据完整性工作，或明确要求时，使用 `task-audit` 或 `bug-audit`。任务审计会先扫描最终代码和差异，再读取简报，然后检查需求覆盖情况。最强的审计会使用新的会话或审查者上下文，并提供简报、最终差异或代码以及相关测试。

## 命令与技能

```bash
task init       # 创建工作区并安装托管技能
task add-repo   # 添加 Git 仓库并启用工作区模式
task bind-repo  # 覆盖当前机器上的仓库路径
task repos      # 列出当前工作区中配置的仓库
task refresh    # 重新安装托管工作流技能，不修改 .ai 内容
task doctor     # 检查工作区状态、技能新鲜度和 gitignore 规则
task --help
```

| 范围 | 技能 |
| --- | --- |
| 项目理解 | `project-explore` |
| 任务 | `task-fast`、`task-explore`、`task-implement`、`task-audit`、`task-cancel` |
| 缺陷 | `bug-explore`、`bug-fix`、`bug-audit`、`bug-cancel` |
| 决策记忆 | `decision-log`、`decision-sweep-weekly`、`decision-curate` |

## 保持工作区有用

### 决策记忆

`.ai/decisions/decisions.md` 存放长期有效的项目不变量和可复用约束，而不是本地实现选择的流水账。当前代码和测试描述行为；活动决策解释了未来工作中本可能被错误选择的持久约束。默认不记录决策，除非遗漏它会显著增加后续探索做出错误选择的可能性。

| 操作 | 用途 |
| --- | --- |
| `decision-log` | 记录已批准的长期决策。 |
| `decision-sweep-weekly` | 审查过去七天的归档简报，起草有价值的决策候选并等待确认。 |
| `decision-curate` | 对过时或重复条目进行分类，并在修改日志前等待确认。 |

新条目使用稳定的 `DEC-YYYYMMDD-descriptive-slug` 标题和简洁的生命周期元数据：

```md
## DEC-20260716-token-storage

Status: active
Scope: auth, api
Applies when: all supported configurations
Supersedes: -
Superseded by: -
```

`active` 条目约束新工作。`superseded` 和 `deprecated` 条目是历史，除非任务明确需要该历史。当后续任务替换一项长期结论时，新活动条目会指向前一条，旧条目记录其继任者，但只能在用户明确确认后进行。重叠的活动决策若冲突，智能体会提出冲突而不是自行选择。旧的按日期命名条目仍有效，不会批量迁移。

### 使用规模

让 `active/` 保持个人、本地且小规模。需要控制的是高信号上下文，而不是归档总量。

| 信号 | 合理范围 | 超出后的处理 |
| --- | --- | --- |
| 每位开发者的活动简报 | 1-3；4-5 会增加上下文切换成本 | 完成、取消或拆分活动工作。 |
| 归档规模 | 数百份可接受 | 正常流程不会重新读取归档。 |
| 活动决策 | 15-30 条 | 超过 30 后定期运行 `decision-curate`。 |
| 每周完成简报 | 10-20 份较轻 | 达到 20-40 时，预计需要更多审查以区分长期约束和一次性噪声。 |

反复过滤过时决策、归档细小重复的简报、产生大多被跳过的每周清理候选，或携带过多活动简报，说明应减少决策噪声或简报粒度，而不是增加流程。

## 刷新已有项目

```bash
task doctor
task refresh
```

`task refresh` 会保留 `.ai/tasks`、`.ai/bugs`、`.ai/decisions`、`workspace.yaml`、`workspace.local.yaml` 和无关的自定义技能。它只删除 task-cli 托管的技能（包括旧版 `task-review` 和 `bug-review`），然后重新安装上述技能。先运行 `task doctor` 可查看是否需要刷新。

## 许可证

MIT
