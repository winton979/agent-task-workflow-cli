---
areas: [decision-memory, skills, documentation]
working_set: [src/init.js, test/workspace.test.js, README.md, README.zh-CN.md]
---

# Goal

Keep task-cli decision records a sparse, high-signal set of durable constraints for an individual developer and AI agent, rather than a running record of task and bug activity.

# Context

Task and bug archives retain work history. Current code, tests, tooling, and configuration retain executable engineering knowledge. `decisions.md` is reserved for constraints that would otherwise cause a future task to make a materially different choice. The current weekly sweep wording can imply a recurring output obligation even though its selection rules already reject most candidates.

# Constraints

- Preserve the lightweight, single-developer harness; do not add task coordination, indexing, or new persistent artifact types.
- A bug count, task count, or busy week must not itself justify a decision entry.
- Keep explicit confirmation before changing decisions and preserve existing decision lifecycle metadata.
- Existing managed skill names remain compatible; update their generated Claude and Codex copies through the normal refresh path.

# Risks

- Stronger wording must not prevent recording genuine external, compatibility, or intentional-behavior constraints that are not evident from engineering artifacts.
- Documentation must distinguish an on-demand curation pass from a required weekly ceremony.

# Acceptance Criteria

- `decision-log` explicitly rejects content already clear from code, tests, tooling, configuration, or project documentation unless it records a non-obvious durable constraint.
- `decision-sweep-weekly` is an on-demand review and curation tool, never a scheduled requirement or a source of mandatory output; its default review window remains bounded.
- English and Chinese documentation describe the intended separation of archives, engineering artifacts, and decisions.
- Generated skills stay synchronized and tests cover the strengthened policy.
