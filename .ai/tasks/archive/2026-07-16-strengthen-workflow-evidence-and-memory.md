---
areas: [workflow]
working_set: [src/init.js, README.md]
---

# Goal

Strengthen task-cli's task, bug, audit, and decision-memory workflows so they surface material uncertainty, retain only current durable constraints, and avoid treating historical task outcomes as current truth.

# Context

The workflow intentionally remains lightweight and local. Current code and tests describe current behavior; archived briefs provide history; active decisions describe durable constraints. Do not introduce team coordination, task dependency management, a database, or a feature hierarchy.

# Constraints

- Preserve the fact-versus-user-decision boundary and implementation-agnostic task briefs.
- Keep existing briefs and decisions readable; new metadata must be optional.
- Preserve explicit user confirmation before a decision is created, revised, merged, superseded, or removed.
- Risks and working sets are relevant only when material; they are not mandatory checklists or hard boundaries.

# Risks

- Extra metadata or process may turn small changes into ceremony.
- A stale or conflicting active decision could mislead later exploration.
- A working set could hide a necessary dependency if treated as a whitelist.

# Acceptance Criteria

- Task exploration and fast paths define material-risk prompts, explicit readiness stop conditions, optional brief metadata, and a revision record for confirmed narrow clarifications.
- Task audit starts with a brief-independent diff scan before requirement coverage.
- Bug briefs distinguish hypotheses, evidence, confidence, and discriminating checks; bug fixing selects an unambiguous active brief and does not claim an unconfirmed root cause.
- Decision entries support stable identifiers, scope, applicability, status, and supersession; relevant skills define how conflicts are surfaced and confirmed.
- README documents the model, operating rules, and backward-compatible migration.
- Templates and installed Claude/Codex skills remain synchronized and the CLI still initializes and refreshes a workspace.
