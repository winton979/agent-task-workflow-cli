---
areas: [workflow-skills]
working_set: [src/init.js, test/workspace.test.js, README.md, README.zh-CN.md]
---

# Goal

Adapt task-cli's managed workflows so trivial, unambiguous work completes without creating task, bug, or decision artifacts, while larger work automatically enters the appropriate exploration flow.

# Context

The latest local mattpocockskills repository defines grilling as a design tree worked in independent frontier rounds. Its documentation distinguishes small work that can proceed straight to implementation from work that warrants a fuller design flow. Current task-cli emits a brief even in task-fast and always makes task-explore and bug-explore stop before implementation.

# Constraints

- task-fast must assess the request and automatically run task-explore behavior when it is not a safe direct completion.
- task-explore and bug-explore must directly implement or fix in their own invocation when a bounded inspection confirms the work is trivial and unambiguous.
- Direct completion creates no task, bug, or decision artifact, but must validate its result.
- Non-direct task and bug work retain their respective brief and follow-on flows.
- Complex exploration must use the current upstream frontier-round grilling behavior.

# Risks

- Direct-completion wording that is too broad could bypass needed confirmation or bug evidence.
- Generated skills must remain aligned across Claude and Codex installations.

# Acceptance Criteria

- Installed task-fast contains a direct-completion assessment and automatic task-explore upgrade.
- Installed task-explore and bug-explore contain guarded direct-completion paths with validation and no artifact creation.
- The non-direct paths preserve brief generation and use frontier-round grilling.
- English and Chinese workflow documentation describe the adaptive behavior.
- Tests assert the generated guidance and the full suite passes.
