---
name: task-audit
description: Independently audit a completed task implementation against the task brief. The objective is to find evidence of failure, not to justify the implementation.
user-invocable: true
---

Purpose

Perform an independent audit of a completed task implementation.

Workspace Context

Before reading or writing any .ai path, determine the workflow state root. Managed skills are discovered from the launch root, but a launch-root workspace.yaml may declare context_repository. When it does:

1. Resolve that repository ID from the launch-root workspace.yaml, honoring launch-root workspace.local.yaml when present.
2. Verify that its resolved directory exists and is a Git repository root. If it is missing or invalid, stop and report the configuration error; never fall back to a launch-root .ai directory.
3. Treat the selected repository as the workflow state root. Read its workspace.yaml and workspace.local.yaml for the business repository map, and resolve every .ai path in this skill from that directory.

Without context_repository, the launch root remains the workflow state root and its workspace manifest is the repository map.

Retain the resulting absolute canonical directory as `workflowStateRoot`. Every .ai read, write, move, or delete must use an absolute path below `<workflowStateRoot>/.ai`. Never use a relative `.ai/...` path, infer the state root from the current command directory, or choose an existing .ai directory in a nested or registered repository.

* Treat the manifest as an initial context map, not a request to scan every repository.
* Treat repositories whose resolved disabled flag is true as unavailable for routine development in the current cycle. Do not select, inspect, index, or include them in a working set unless the user explicitly asks about that repository.
* Select only the repositories relevant to the current question or task, and inspect their current code, tests, configuration, and history as needed.
* For work that crosses repositories, record the selected repository IDs and paths in Context or working_set metadata. A working set remains a starting scope, not a hard boundary.
* Run commands from the relevant repository directory. Changing the command directory never changes `workflowStateRoot`. Do not assume a workflow-state-root Git diff represents changes in registered repositories.
* A repository manifest describes local checkout locations. Current repository evidence remains authoritative for behavior and implementation decisions.

Rules

1. Use the latest matching brief from .ai/tasks/active/ or .ai/tasks/archive/.
2. Inspect the actual implementation via final code and git diff.
3. Begin with a brief-independent scan of the final code and diff. Read the brief only after recording unexpected behavior or scope changes.
4. Use the least implementation context possible: task brief, final code, git diff, and existing tests.
5. Ignore implementation reasoning from the current conversation.
6. Do not prove the implementation correct. Try to invalidate it with evidence.
7. If evidence is unavailable, mark the area UNKNOWN instead of guessing.
8. Run relevant tests when practical. If tests cannot be run, list that under Unknowns.
9. Do not suggest unrelated improvements.
10. Overall Result must be FAIL when any acceptance criterion is FAIL, or when a material UNKNOWN blocks approval.
11. Overall Result may be PASS only when no significant evidence of failure exists.

Audit Phases

0. Unprompted diff scan: before reading the brief, identify behavior changes, unexpected scope, and suspicious changes from final code and git diff.
1. Requirement coverage: for each acceptance criterion, mark PASS, FAIL, or UNKNOWN.
2. Break attempt: construct edge cases, invalid inputs, and unexpected user actions that may violate the brief.
3. Regression analysis: check behavior changes, compatibility issues, state corruption, and hidden side effects.
4. Engineering risk: check maintainability, unnecessary complexity, duplication, performance, memory, concurrency, and security.

Severity

Critical - Causes incorrect behavior or violates requirements.
High - Likely production issue.
Medium - Real issue with limited impact.
Low - Concrete issue with low impact. Do not use Low for preferences.

Output

## Overall Result

PASS or FAIL

## Unprompted Diff Scan

Behavior and scope changes observed before reading the brief.

## Acceptance Criteria

| Criterion | Result | Evidence |
|-----------|--------|----------|

## Findings

For every finding include:

### Severity

Critical / High / Medium / Low

### Issue

What is wrong.

### Evidence

Concrete code, diff, test result, or behavior supporting the finding.

### Impact

Why it matters.

### Confidence

High / Medium / Low

## Unknowns

Areas that cannot be verified from available information.

## Final Assessment

State whether approval is blocked and what remains risky.
