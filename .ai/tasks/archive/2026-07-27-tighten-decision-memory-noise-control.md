---
areas: [decision-memory, skills, docs]
working_set: [src/init.js, README.md, README.zh-CN.md]
---

# Goal

Tighten decision-memory skill guidance so decisions record stable reusable constraints, not bug lessons or per-brief learning.

# Context

The current decision skills already bias toward fewer durable decisions, but the wording can still allow noisy growth when many tasks or bugs are reviewed. The updated guidance should make candidate generation non-linear: repeated bugs may justify one underlying durable constraint, or no decision at all.

# Constraints

Use cautious, precise skill wording. Preserve the existing lifecycle metadata format and explicit user-confirmation gates.

# Risks

Overly broad wording could make agents skip genuinely useful project constraints. Overly verbose wording could make the skill harder to use.

# Acceptance Criteria

`decision-log`, `decision-sweep-weekly`, and `decision-curate` explicitly reject bug lessons, common knowledge, and one-off implementation notes as decision entries.

Weekly sweep guidance requires grouping repeated incidents by underlying stable constraint rather than producing entries proportional to task or bug count.

Curate guidance prefers removal or merge of entries that do not still constrain future choices.

README and README.zh-CN summarize the stricter policy consistently.

# Revisions

2026-07-27: Tighten the policy further to counter conservative retention bias. The decision skills should explicitly treat zero new entries as a healthy outcome, require unclear value to be skipped or removed, and discourage keeping entries for possible future usefulness.
