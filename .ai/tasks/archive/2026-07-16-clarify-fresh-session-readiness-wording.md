# Goal

Clarify the fresh-session wording in `task-explore` so it defines a brief-sufficiency check rather than requiring a new implementation session.

# Context

The existing wording says to assume implementation will start in a fresh session. This can be read as a required execution mode even when exploration and implementation continue in one conversation.

# Constraints

- Preserve the cross-session handoff standard.
- State explicitly that implementation may proceed in the current session.
- Keep source templates, installed Claude and Codex skills, and README consistent.

# Risks

The revised text must not weaken the requirement to capture material contract decisions in the brief.

# Acceptance Criteria

- The wording presents fresh-session handling as a hypothetical readiness check.
- It does not imply that a new session is required.
- All managed copies and documentation use the same interpretation.
