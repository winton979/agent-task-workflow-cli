---
areas: [workflow]
decisions: [DEC-20260722-npm-token-publishing]
working_set: [src/init.js, src/cli.js, README.md, README.zh-CN.md, test/workspace.test.js]
---

# Goal

Add optional task and bug planning skills that let users review a concrete implementation or fix approach before starting work.

# Context

The existing direct flows remain valid. A plan is an in-conversation preview only: it is not persisted, does not add a workflow state, and does not modify task or bug briefs.

# Constraints

- Task and bug plan skills must embed the same relevant sufficiency, decision, and implementation constraints as task-implement and bug-fix.
- Plans must show relevant implementation or fix details and material user choices without adding empty sections.
- An explicit user choice from a completed plan may be reused only in the current conversation.
- Material changes to the accepted contract return to exploration.

# Acceptance Criteria

- `task-plan` and `bug-plan` are installed for Claude and Codex workspaces.
- Direct task and bug execution remains possible without a plan.
- Plans do not write project files or persistent plan artifacts.
- Documentation and tests cover the optional flows and plan-to-execution handoff.
