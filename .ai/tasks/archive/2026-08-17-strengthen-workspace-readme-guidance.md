# Goal

Make generated `WORKSPACE.md` sufficient for an agent to safely select workspace repositories and resolve their local paths.

# Context

The declaration currently names the shared and local manifests and suggests `workscope repos`, but does not define effective enabled state, local override precedence, or the routine-development meaning of disabled repositories.

# Constraints

- Preserve existing manifest resolution and command behavior.
- Do not modify an existing user-authored `WORKSPACE.md`.
- No new dependency or cross-cutting change is needed.

# Risks

- The strengthened template only applies to newly generated declarations; existing files remain intentionally untouched.

# Acceptance Criteria

- A new declaration directs agents to resolve the effective workspace before selecting repository paths.
- It states that local path and disabled values override shared values, and omitted disabled means enabled.
- It excludes effectively disabled repositories from routine selection and exploration unless explicitly requested.
- The workscope tests protect this generated guidance.
