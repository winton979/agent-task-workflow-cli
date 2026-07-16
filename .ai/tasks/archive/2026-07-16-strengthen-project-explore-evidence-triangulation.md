---
areas: [workflow]
working_set: [src/init.js]
---

# Goal

Make project-explore build architectural explanations from corroborated repository evidence rather than the first matching file.

# Context

Project-explore already distinguishes facts, intent, rationale, assumptions, and trade-offs, but it does not explicitly require a broader check before explaining why a design exists.

# Constraints

- Change only the project-explore guidance and its managed generated copies.
- Preserve bounded, evidence-based exploration; do not require reading the whole repository.
- Keep existing transitions and read-only boundaries unchanged.

# Risks

- A generic “search broadly” rule could cause unnecessary context expansion.

# Acceptance Criteria

- Rationale or architectural-trade-off questions require corroboration beyond the first matching file when material evidence is available.
- The guidance names relevant evidence categories without requiring all of them for every answer.
- Conflicting or insufficient evidence is reported as Unknown instead of inferred.
- `task refresh` keeps the Claude and Codex project-explore skills synchronized with the source template.
