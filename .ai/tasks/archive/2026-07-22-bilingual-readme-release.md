---
areas: [documentation, release]
working_set: [README.md, README.zh-CN.md, package.json, package-lock.json]
---

# Goal

Release the completed workspace-local-config feature with a Chinese README that GitHub users can switch to from the English README.

# Context

The published package and local manifest are both version `1.7.0`. The current worktree contains the completed feature changes to release. A new optional CLI command and configuration capability justify a minor release, `1.8.0`.

# Constraints

- Add a complete Chinese `README.zh-CN.md` consistent with the English README.
- Add reciprocal English/Chinese links at the top of both README files.
- Include the Chinese README in the npm package contents.
- Update the package and lockfile to `1.8.0`.
- Test, inspect the packed package, publish to npm, and commit all release changes locally without pushing Git.

# Risks

- `npm publish` is an external, irreversible release action.
- `npm whoami` currently reports no authenticated npm user; publishing cannot complete until this machine is logged in with permission to publish `@winton979/task-cli`.

# Acceptance Criteria

- GitHub users can switch between complete English and Chinese README files.
- The npm package preview contains both README files and reports version `1.8.0`.
- Tests pass before publishing.
- npm publishes `@winton979/task-cli@1.8.0` once authentication is available.
- A local Git commit contains the release; no Git push is performed.

# Revisions

- 2026-07-22: Confirmed npm publishing uses an authorized token and explicitly targets the npmjs registry. This changes authentication mechanics only, not the release scope.
