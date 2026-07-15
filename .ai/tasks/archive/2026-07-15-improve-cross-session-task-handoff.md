# Goal

Make `task-explore` briefs reliable contracts for implementation in a fresh session, while allowing genuinely complex tasks enough space to preserve execution-critical information.

# Context

`task-explore` currently emits a maximum-500-word brief. `task-implement` reads the latest relevant active brief, states assumptions, and implements, but it does not define deterministic brief selection, classify missing information, persist user clarifications back into the brief, or route material requirement changes back to exploration.

# Constraints

- Preserve the lightweight `task-explore -> task-implement -> optional task-audit` workflow and the implementation-agnostic boundary of exploration.
- Treat 500 words as the normal target for `task-explore`; allow up to 1000 words only when execution-critical scope, constraints, risks, or acceptance criteria cannot be preserved within 500. Prefer splitting a task when a coherent contract still cannot fit.
- Keep `task-fast` at its existing 500-word maximum because it handles small, single-session requirements.
- Do not add an appendix, new artifact type, dependency, or architecture.
- Repository facts must be investigated by the implementing agent. Local reversible implementation choices follow existing conventions. Only material user-owned decisions require clarification.
- A clarification that does not materially change the accepted goal, scope, or acceptance criteria may be written back to the active brief after explicit user confirmation. Material changes must return to `task-explore`.
- Keep incomplete briefs active; archive only after successful implementation and validation.

# Risks

- An overly broad stop rule could make implementation interrupt for ordinary engineering choices.
- Editing a brief without a clear user decision could turn an agent assumption into an accepted requirement.
- Selecting by recency when several active briefs exist could execute the wrong task.

# Acceptance Criteria

- `task-explore` performs a cross-session readiness check before `TASK_READY`, capturing all implementation-critical user decisions without relying on conversation memory.
- Its brief guidance uses a 500-word target and an exceptional 1000-word maximum with task splitting as the fallback.
- `task-implement` uniquely identifies the intended brief or asks when multiple candidates are plausible.
- It investigates discoverable facts, resolves local reversible choices conservatively, and asks one recommended question at a time for material user decisions.
- Confirmed narrow clarifications are persisted to the active brief before coding; material requirement changes return to exploration.
- Source templates, Claude and Codex generated skills, and user-facing documentation remain consistent and pass the existing CLI validation commands.
