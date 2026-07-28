---
working_set: [src/init.js, test/workspace.test.js, README.md, README.zh-CN.md]
---

# Goal

Allow a workspace repository to be disabled for a development cycle so agents do not spend context on it.

# Context

`workspace.yaml` defines repository entries. `workspace.local.yaml` currently overrides only repository paths. Managed explore skills receive shared workspace-context guidance from `src/init.js`.

# Constraints

Use a `disabled` boolean, retaining version 1 and compatibility with existing local path strings. A local entry may override both path and disabled state. Disabled repositories remain registered but are excluded from routine exploration and health checks.

# Risks

A disabled repository cannot serve as the configured workflow context. Explicit user requests may still require its repository evidence.

# Acceptance Criteria

- Shared and local manifests validate boolean disabled states and resolve local overrides.
- Managed skills direct routine exploration to skip disabled repositories.
- Repository listing identifies disabled entries and doctor skips their path checks.
- Documentation and tests cover shared and local disabled configurations.
