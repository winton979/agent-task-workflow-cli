---
areas: [workspace]
working_set: [src/cli.js, src/init.js, test/workspace.test.js, README.md, README.zh-CN.md]
---

# Goal

Allow a web-hosted agent to discover task-cli skills at a workspace root while storing all shared workflow state in a selected, registered Git context repository.

# Context

The web environment runs the agent only at the outer workspace root. Its `.claude/skills` and `.codex/skills` must therefore remain there. The selected `otb-agent-context` repository is the collaboration-owned context: it contains the authoritative `workspace.yaml` mapping the business repositories and must own `.ai` task, bug, and decision records.

# Constraints

- A root-level `context_repository` identifies an existing registered repository by ID. The selected repository must resolve to a Git root.
- Provide `task use-context <repository-id>` to validate and set this selection, and initialize the context repository's workflow-state structure when it is absent.
- With a context configured, generated skills and relevant CLI lifecycle checks use the context repository for `.ai` state and its `workspace.yaml` repository map; skills remain installed at the outer root.
- Workspaces without a context configuration retain their current behavior.
- Do not automatically copy, move, or delete a pre-existing root `.ai` directory.
- An unavailable or invalid configured context is an error. Do not fall back to root `.ai`.

# Risks

- This crosses CLI setup, refresh, diagnostics, and all managed skill instructions; partial routing could cause shared state to be written to the wrong repository.
- Existing workspace manifests and single-project workflows must remain compatible.

# Acceptance Criteria

- A root workspace can register and select a Git context repository using `task use-context`.
- Its root skill installations stay callable from the web environment.
- Tasks, bugs, decisions, and other `.ai` workflow records created through managed skills are read from and written to the selected context repository.
- The context repository's own `workspace.yaml` is used for business-repository discovery.
- `init`, `refresh`, and `doctor` reflect the split between root-level skills and context-level state.
- Invalid, missing, or non-Git contexts are reported without creating or using root `.ai` as a fallback.
- Existing configurations without `context_repository` pass their prior behavior and tests.
