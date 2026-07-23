---
areas: [workflow, metadata]
working_set: [src/init.js, README.md, README.zh-CN.md, test/workspace.test.js]
---

# Goal

Make task and bug brief metadata generation deterministic when evidence establishes an area, relevant decision, or working set.

# Context

The current optional wording permits a new, cross-module bug brief to omit useful metadata even when its scope is established. Metadata remains a context aid, not a source of truth or a hard modification boundary.

# Constraints

- Preserve compatibility with legacy briefs that lack frontmatter.
- Omit fields without evidence-backed values; do not add empty placeholders.
- Do not add metadata parsing, indexing, or migration behavior.

# Acceptance Criteria

- Generated task and bug exploration skills require frontmatter when any supported metadata field has an evidence-backed value.
- Cross-workspace-repository work requires repository-ID-prefixed working-set paths.
- English and Chinese README guidance matches the generated skills.
- Automated coverage detects regression in the generated guidance.
