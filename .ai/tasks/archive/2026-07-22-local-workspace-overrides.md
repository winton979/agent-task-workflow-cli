---
areas: [workspace]
working_set: [src/init.js, src/cli.js, test/workspace.test.js, README.md, .gitignore]
---

# Goal

Allow each developer to override workspace repository checkout paths locally without changing the shared `workspace.yaml`.

# Context

`workspace.yaml` currently stores repository IDs and portable relative paths. Developers may keep the same repositories in different directory layouts.

# Constraints

- Add an ignored `workspace.local.yaml` with repository-ID-to-path bindings.
- Local bindings take precedence over the shared repository path; absent bindings preserve current behavior.
- Shared paths remain relative; local paths may be relative or absolute.
- Provide a command to write a local binding and make `repos` and `doctor` resolve the merged mapping.
- Keep the package dependency-free using its existing JSON-compatible YAML convention.

# Risks

Malformed, unknown, duplicate, missing, or non-Git local bindings must fail or be reported clearly without changing the shared manifest.

# Acceptance Criteria

- Existing workspace tests and workflows work without a local config file.
- A valid local binding overrides a shared path in repository listing and doctor validation.
- The binding command creates only the ignored local config and validates the target Git root.
- Documentation and generated gitignore rules describe and exclude the local config.
- Focused tests cover success and validation failures.

# Revisions

