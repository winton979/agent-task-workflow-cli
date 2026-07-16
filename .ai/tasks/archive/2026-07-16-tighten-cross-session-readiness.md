# Goal

Make `task-explore`'s cross-session handoff criterion more explicit without expanding the workflow.

# Context

The current readiness guidance records material user decisions and exclusions, but it does not explicitly require the brief to stand alone for goal, acceptance, constraints, and exclusions. It also names decisions more clearly than other confirmed execution-critical context.

# Constraints

- Keep Cross-session Readiness as a prompt-level self-check; do not describe it as mechanical validation.
- Do not add an `Unknowns` section, artifact type, dependency, or architecture.
- Preserve the repository-fact boundary: avoid snapshots, but retain minimal context needed to interpret a confirmed constraint.
- Keep `src/init.js`, both managed skill copies, and README consistent.

# Risks

Overbroad wording could turn ordinary repository discovery or local implementation choices into required brief content.

# Acceptance Criteria

- Before `TASK_READY`, the brief must be checked for a fresh implementation session's ability to determine its goal, acceptance criteria, material constraints, and exclusions.
- Confirmed execution-critical context beyond explicit decisions is recorded only when omission could materially change implementation or validation.
- Guidance does not add an `Unknowns` section or claim mechanical validation.
- `task doctor` reports managed skills current.
