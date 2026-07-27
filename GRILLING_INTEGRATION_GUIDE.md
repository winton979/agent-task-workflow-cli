# Grilling Integration Guide

本说明用于把用户提供的最新版 `grilling` / `grill-me` `SKILL.md` 集成进 Task CLI。后续执行者只需获得：

1. 本说明
2. 最新版 `SKILL.md` 完整内容
3. Task CLI 仓库

包含完整访谈规则的最新版 `SKILL.md` 是原语内容的唯一权威来源。Matt Pocock 的 [skills 仓库](https://github.com/mattpocock/skills.git) 是方法思想来源，不是 Task CLI 的运行时依赖。

如果用户提供的 `grill-me` 只是转发包装器，例如正文只有 `Run a /grilling session`，该输入并不完整。先索取它所委托的 `grilling` skill 正文；不要把包装器嵌入 Task CLI，否则会重新产生外部依赖。

## 目标

将最新版 Grilling 原语无损嵌入 Task CLI，让 `task-explore` 和 `bug-explore` 获得相同的访谈行为，同时保持 Task CLI 自包含：

* 不要求用户安装 companion skill
* 不探测本地或全局 Grill skill
* 不在 `task init` 或 `task refresh` 中安装 Grill skill
* Task CLI 自己生成并维护完整的 Explore skills

## 设计哲学

把提示词视为实现代码，而不是可以自由改写的说明文字。

* 默认模型已经足够聪明，只保留不可缺少的程序性约束。
* 每个词都可能在调用预训练语义或修复具体失败模式。不要用更长的解释替换高密度措辞。
* 保留 leading words、语气强度、主语、段落顺序、标点和强调格式。
* 事实由 Agent 从环境调查；决策由用户作出。不要让 Agent 代替用户回答决策。
* 一次只问一个问题，给出推荐答案，并等待用户反馈。
* 确认门是硬边界。在用户确认共同理解前，不执行原语禁止的动作。
* 不因“看起来更完整”而增加分类、例外、过滤条件或重复约束。新措辞应由已观察到的模型失败驱动。

历史经验尤其要求避免以下改写：

* 把 `relentlessly`、`every aspect` 或 `each branch` 弱化为由 Agent 自行判断的 “important” 或 “material” 范围。
* 把 `For each question` 收窄成只适用于某类问题。
* 把简洁的 facts / decisions 对照扩展成未经验证的多级 taxonomy。
* 在原语外重复一次提问节奏或确认门。
* 用 Task CLI 的 brief、复杂度或 bug 术语污染通用原语正文。

## 集成边界

### 原语正文

从最新版 `SKILL.md` frontmatter 后提取完整正文，在 `src/init.js` 中作为一个共用常量保存。正文必须逐字保留；只允许因宿主字符串语法而进行必要转义，不允许润色、概括或规范化标点。

当前结构使用 `GRILLING_GUIDANCE`，并在正文前增加 `Grilling` 标题。若最新版已经自带等价标题，不要重复。

如果最新版正文引用了未随附的相对文件或资源，停止并索取这些资源。不要删除引用，也不要凭空补写内容。

### 完整 Explore

`task-explore` 和 `bug-explore` 使用完整原语。

* metadata 和 workflow 应保留最新版有意使用的 leading words，例如 `Grill`。
* Task CLI 特有规则放在原语之外。
* 只添加完成宿主绑定所必需的解释。
* 当前唯一绑定是：`For this workflow, "act on it" means creating the brief.`

绑定必须引用最新版原语的原词。如果最新版删除或改变 `act on it`，重新判断绑定是否仍需要，并修改外围 workflow；不要修改原语来适配旧绑定。

`bug-explore` 可以保留调查证据、区分 observed / expected / assumptions、识别 root cause candidates 等 bug 领域规则，但不得自行规定哪些内容必然属于 fact 或 decision。

### Direct Execution

`task-implement` 内置直接执行路径，不声称执行完整 Grilling。完整 Grilling 的 `relentlessly about every aspect` 与实现阶段的最小交互目标并不相同。

直接执行路径应继续保留：

* 能从环境查到的事实不询问用户
* 只询问可能改变实现或验收标准的问题
* 一次一个问题并等待反馈
* 每个问题提供推荐答案
* 未解决的决策交给用户
* 只有触发重要实现决策门时才等待用户确认，否则直接实现并验证

当新版原语增加重要行为时，判断它是否与实现阶段的直接执行和 proposal gate 相容。只迁移必要的窄化版本，不要自动复制完整原语。

### 生成文件与文档

`src/init.js` 是技能模板的源码。修改后通过 `task refresh` 同步：

* `.claude/skills/task-explore/SKILL.md`
* `.claude/skills/bug-explore/SKILL.md`
* `.codex/skills/task-explore/SKILL.md`
* `.codex/skills/bug-explore/SKILL.md`
* `.claude/skills/task-implement/SKILL.md`
* `.codex/skills/task-implement/SKILL.md`
* `.claude/skills/bug-fix/SKILL.md`
* `.codex/skills/bug-fix/SKILL.md`

README 应继续准确说明：

* Grilling 正文来自 Matt Pocock 的仓库
* 它是方法思想来源，不是运行时依赖
* 完整 Explore 逐字保留正文
* Task CLI 不要求也不安装 companion skill
* 实现阶段的直接执行路径采用较窄的 clarification loop，并通过 proposal gate 处理重要决策

不要在 README 中声称 Task CLI 会删除或阻止用户自行安装的其他 skills。

## 升级步骤

1. 读取用户提供的最新版 `SKILL.md` 全文，包括 frontmatter、正文、标点和格式。若它只是委托给另一个 skill，先取得被委托 skill 的完整正文。
2. 检查工作树，保护用户已有修改和无关文件。
3. 将当前嵌入正文与最新版逐行比较。先理解变化影响，再编辑。
4. 将最新版正文逐字更新到共用常量。
5. 检查 frontmatter description 的 leading words 或触发语义是否变化；必要时同步调整 Explore metadata，但不要机械复制上游 skill 名称。
6. 检查 Task CLI 外围绑定是否仍准确。优先修改外围 workflow，不修改上游正文。
7. 检查 `task-implement` 的直接执行和 proposal gate 是否需要兼容新版原则；保持实现阶段的窄边界。
8. 更新 README 中确实发生变化的来源或边界说明，避免重复解释原语。
9. 运行 `node bin/task.js refresh`，同步 Claude 与 Codex 生成文件。
10. 完成静态验证、fresh-init 验证、前向测试和独立措辞审查。

若最新版与当前嵌入正文完全相同，不制造格式 churn。只报告无需升级。

## 禁止事项

* 不重新引入 `grill-me` 检测、安装提示、doctor 告警或 fallback 分支。
* 不创建项目内 `grill-me` / `grilling` companion skill。
* 不改写或翻译最新版原语正文。
* 不把自己的解释插入原语段落之间。
* 不增加未经真实失败案例支持的 taxonomy、materiality filter 或行为规则。
* 不重复原语已经表达的等待、推荐或确认门。
* 不为了通过 Codex 通用 validator 而删除本项目用于跨平台调用的既有 `user-invocable` metadata。
* 不顺手修改无关代码、版本号或用户文件。
* 不提交或发布，除非用户明确要求。

## 验证清单

### 静态与安装验证

* `node --check src/init.js` 通过。
* 嵌入正文与用户提供的最新版正文一致。比较时可以规范化 checkout 的 CRLF/LF，但内容、标点和段落必须一致。
* 四个完整 Explore 生成文件中的正文均与最新版一致。
* Claude 与 Codex 对应生成文件内容一致。
* `src`、README 和生成技能中不存在旧 `grill-me` 名称、安装命令、探测逻辑或 companion 告警。本说明为了描述禁项，可以保留该历史名称。
* `node bin/task.js doctor` 全部检查通过。
* 在全新临时目录运行 `task init` 后，不生成 Grill skill；随后 `task doctor` 通过。
* `git diff --check` 通过。
* `npm pack --dry-run` 通过。

`quick_validate.py` 可能拒绝本项目既有的 `user-invocable` 字段。确认失败原因仅为字段 allowlist 后，保留该字段并如实报告，不要为通过工具而改变跨平台约定。

### 前向测试

至少使用两个无先验上下文的 Agent，分别执行一次真实的首轮 Explore：

1. 一个有歧义的功能需求
2. 一个需要从仓库取证的 bug 报告

只提供目标 skill 和用户请求，不提供预期答案或本次修改意图。要求 Agent 在需要用户反馈时停止，不写文件。

检查实际行为：

* 先调查环境中可获得的事实
* 不把可查事实推回用户
* 一次只提出一个问题
* 提供推荐答案
* 不替用户作决策
* 等待反馈，不越过确认门创建 brief 或实施

### 独立审查

让独立 reviewer 对照最新版原语和工作区 diff，重点寻找：

* 原文稀释或语义收窄
* Task CLI 规则侵入原语
* 重复确认门
* 新增但无证据支持的分类或约束
* metadata 与正文不一致
* README 夸大实际保证
* 源模板和生成文件漂移

修复所有 Critical 和 Important 问题后再完成迭代。

## 完成标准

只有同时满足以下条件才算完成：

* 最新版原语正文无损进入完整 Explore
* Task CLI 只保留必要的外围绑定
* fast path 与完整 Grilling 的差异清楚且有意为之
* 不存在运行时 companion 依赖
* README 来源和边界准确
* 静态验证、fresh init、前向测试和独立审查均完成

最终说明应列出上游措辞变化、外围绑定变化、验证结果、前向测试观察和任何仍存在的限制。

## 后续交接用语

将本说明与最新版 `SKILL.md` 一起提供，并使用以下请求即可：

> 请严格按照《Grilling Integration Guide》，把随附最新版 Grilling `SKILL.md` 集成进 Task CLI。把最新版正文视为唯一权威，保持措辞和格式，不重新引入 companion skill 依赖。完成源码、生成技能和 README 更新，并执行说明中的全部验证、前向测试和独立审查。
