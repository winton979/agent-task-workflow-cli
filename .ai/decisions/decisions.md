# Decisions Log

## DEC-20260722-npm-token-publishing

Status: active
Scope: release
Applies when: publishing @winton979/task-cli to npm
Supersedes: -
Superseded by: -

### Problem

npm releases require authentication in non-interactive environments.

### Decision

Publish npm releases with an authorized npm token.

### Reason

A token supports reliable release automation without interactive `npm login`.

### Alternatives Considered

Do not rely on interactive npm login for publishing.
