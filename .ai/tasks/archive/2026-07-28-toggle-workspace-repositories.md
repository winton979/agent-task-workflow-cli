---
working_set: [src/cli.js, src/init.js, test/workspace.test.js, README.md, README.zh-CN.md]
---

# Goal

Provide task commands that enable or disable registered workspace repositories and make repository status visible in listing output.

# Context

Repository disabled state is already supported by shared and local workspace manifests. CLI commands currently manage registration, context selection, and local paths but not this state.

# Constraints

Add `enable-repo` and `disable-repo`, with `--local` selecting the ignored local manifest. Preserve an existing local path when changing its disabled state. The configured context repository must remain enabled.

# Risks

A shared enable can still be locally disabled; command output must identify the scope changed.

# Acceptance Criteria

- Commands update shared or local disabled state and reject unknown or context repository IDs.
- Local writes retain the existing ignored/tracked safety checks and path override.
- `task repos` prints enabled and disabled statuses.
- Help text, bilingual documentation, and CLI tests cover the commands.
