# Goal

Make generated `WORKSPACE.md` independently explain how an agent resolves repository paths and availability without a workscope installation.

# Context

The previous guidance delegates effective-workspace resolution to `workscope repos`, which may not exist on another developer's machine.

# Constraints

- Describe the existing shared-plus-local manifest semantics exactly.
- Preserve CLI and manifest behavior.
- Existing user-authored declarations remain untouched.

# Risks

- The new template applies only when a declaration is generated after this change.

# Acceptance Criteria

- The generated declaration has no `workscope repos` dependency.
- It describes reading the shared manifest, conditionally merging the local overlay, field precedence, default enabled state, and path resolution.
- It retains the disabled-repository exploration restriction.
- Tests protect the self-contained guidance.
