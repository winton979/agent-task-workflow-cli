---
working_set: [src/init.js, test/workspace.test.js]
---

# Goal

Ensure task-fast always resolves its brief and decision paths from the workflow state root, even when implementation commands run in a registered or nested repository.

# Context

task-fast first identifies a workflow state root but later names brief paths as relative `.ai/...` paths. Its workspace guidance also permits commands in the relevant repository directory. A changed working directory can therefore send a brief to a child repository's existing `.ai` directory.

# Constraints

Keep the change limited to generated task-fast guidance and its regression coverage. No new CLI command, dependency, or runtime path resolver is needed. The existing release-token decision does not apply.

# Risks

This is guidance interpreted by an AI agent, so it cannot technically prevent a noncompliant agent from writing elsewhere. The instructions must remove the current ambiguity and make the correct absolute target explicit.

# Acceptance Criteria

task-fast instructs agents to retain an absolute workflow state root, never derive `.ai` paths from the current command directory or an existing child `.ai`, and uses that root for decision, active-brief, and archive paths. Tests verify the generated skill contains these guarantees.

# Revisions
