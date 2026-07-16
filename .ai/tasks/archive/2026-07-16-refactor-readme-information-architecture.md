# Goal

Refactor the README into a concise, task-oriented guide that explains when task-cli fits, how to install it, which workflow to run, and how to keep it healthy.

# Context

The current README is 1,735 words across 332 lines. Its value proposition and workflow rationale are repeated across Why, Core Philosophy, the example, comparison, and strengths sections. Decision logging and operating limits contain useful guidance but take more space than first-use information.

# Constraints

- Preserve the documented commands, all managed skills, task/bug flows, audit guidance, decision-log guidance, operational limits, refresh behavior, and license.
- Keep the central principle: clarify and assess complexity before implementation; implement the least complex acceptable solution.
- Do not change CLI behavior, workflow skills, package metadata, or add documentation tooling.
- Prefer a single concise README over new documents or links that fragment required onboarding information.

# Risks

- Excessive compression could hide the risk-triggered audit boundary or make upgrade behavior unclear.
- Moving detailed guidance must not imply a workflow requirement that does not exist.

# Acceptance Criteria

- The README has a clear first-use path: fit, install, choose a workflow, maintain.
- Duplicate philosophy and comparison copy are consolidated without losing material guidance.
- A reader can find every command, managed skill, audit trigger, decision-log action, operating limit, and refresh behavior.
- The rewrite is materially shorter and retains valid Markdown.
