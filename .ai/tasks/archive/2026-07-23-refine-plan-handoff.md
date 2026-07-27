---
areas: [workflow]
working_set: [src/init.js, README.md, README.zh-CN.md, test/workspace.test.js]
---

# Goal

Make optional plan skills provide a faithful, reviewable implementation or fix rehearsal without causing the immediately following implementation to repeat the same architectural analysis.

# Context

`task-plan` and `bug-plan` already share execution constraints and design guidance with `task-implement` and `bug-fix`. Their current handoff permits reuse only after a full recheck, so the same session may repeat the planning work.

# Constraints

- Plans remain read-only, in-conversation only, and create no persistent state or plan artifact.
- Plans and execution retain the same acceptance, minimal-change, existing-convention, helper-reuse, and dependency/abstraction constraints.
- A directly following implementation or fix must verify that the brief, relevant decisions, and plan evidence have not materially changed before relying on the plan.
- Material deviations from an approved plan must be surfaced for user confirmation; direct execution without a plan remains valid.

# Risks

- An overly broad handoff could apply stale facts; the validation boundary must be explicit.
- A vague plan could diverge from final code; plans must state their evidence, recommendation, assumptions, and validation.

# Acceptance Criteria

- Generated plan skills describe a constrained rehearsal and emit reusable in-conversation plan context.
- Generated implementation and fix skills use immediately preceding plan context after a focused freshness check, rather than repeating full discovery by default.
- Documentation explains the optional review flow and its same-conversation handoff behavior.
- Tests cover the generated plan context and focused handoff instructions for both providers.
