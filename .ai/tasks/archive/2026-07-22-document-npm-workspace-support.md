---
areas: [documentation, package]
working_set: [README.md, package.json]
---

# Goal

Make the npm-facing documentation and package metadata clearly communicate task-cli's single-project and multi-repository workspace support.

# Context

The README already documents `task add-repo`, but the npm installation section does not identify the npm package page, document the supported Node version, or give users upgrading an existing global installation the `task doctor` and `task refresh` path. Package metadata has a generic description and no keywords for npm discovery.

# Constraints

- Preserve existing installation and workspace instructions.
- Do not change the package version, dependencies, publish configuration, registry state, or publish the package.
- Keep npm guidance limited to install, upgrade, and local workflow refresh.
- Add only accurate package metadata that describes current functionality.

# Risks

- Documentation must not imply that `task refresh` changes user task records or registered repositories.

# Acceptance Criteria

- README identifies the npm package, its Node.js requirement, global install command, and global upgrade plus `doctor`/`refresh` sequence.
- README makes clear that the published npm page uses the same README and includes the multi-repository workspace instructions.
- `package.json` description and keywords make single-project and multi-repository AI-assisted workflow usage discoverable on npm.
- Package JSON remains valid and no release or registry action occurs.

# Revisions
