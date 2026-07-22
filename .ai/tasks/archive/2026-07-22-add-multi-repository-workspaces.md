---
areas: [cli, workflow]
working_set: [src/cli.js, src/init.js, README.md, package.json]
---

# Goal

Allow one task-cli workflow root to describe and operate across multiple Git repositories, while preserving the existing single-project workflow unchanged until a user explicitly adds a repository.

# Context

`task init`, `task refresh`, and `task doctor` currently treat the current directory as the only project root. Full-stack systems may keep related frontend and backend code in separate repositories. The workflow root should retain the central `.ai/` task, bug, and decision records and install provider skills locally, while a tracked `workspace.yaml` at that root lists participating repositories.

# Constraints

- `task init` alone must not create a manifest or change the observable single-project behavior.
- `task add-repo <path>` must require initialized workflow state, resolve and validate a Git worktree, create or update `workspace.yaml`, use portable paths relative to the workflow root, and reject duplicate repositories.
- When the workflow root is itself a Git repository, the first add operation registers it as `.` before adding the requested repository.
- Add read-only repository listing and workspace-aware `task doctor` validation.
- Workflow guidance must use the manifest as an initial context map, then select only repositories relevant to the work; it must not mandate scanning every repository.
- Existing briefs without workspace repository metadata remain valid.
- Do not add runtime dependencies or automatic Git commits, checkout, or changes inside registered repositories.

# Risks

- Relative checkout layouts may differ between developers; validation must report missing paths clearly rather than silently falling back.
- Provider skills embed workflow instructions, so their source and installed copies must stay consistent.

# Acceptance Criteria

- `task init` still creates only the existing workflow artifacts and works for a single repository without `workspace.yaml`.
- `task add-repo ../frontend --id frontend --description "Web app"` records a normalized relative path and metadata in a versioned manifest.
- Duplicate, non-existent, and non-Git repository paths fail with actionable errors and leave the manifest unchanged.
- `task repos` lists the configured repositories; `task doctor` verifies their paths and Git roots when a manifest exists, while its legacy checks retain their prior behavior when absent.
- Generated Claude and Codex workflow skills instruct agents to use declared repositories narrowly and record cross-repository working sets.
- Automated tests cover legacy initialization and the workspace commands; the documented command reference and multi-repository setup are updated.

# Revisions
