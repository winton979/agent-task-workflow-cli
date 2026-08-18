## Destination

Deliver task-cli Phase 1 of the Effort-aware workflow: durable, resumable exploration for large or uncertain requests, without changing the existing Task and Bug execution flows.

## Notes

- This map carries execution by explicit user request after its decisions are resolved.
- Use the task-cli workflow vocabulary in `CONTEXT.md` and the `grilling`, `domain-modeling`, and `karpathy-guidelines` skills.
- Keep the implementation as managed skills emitted from `src/init.js`, not new `task` CLI subcommands.
- The Phase 1 surface is one explicit, user-invocable `effort-explore` Skill. It interprets natural-language requests to create, continue, report on, or close an Effort.
- An Effort's only persisted record state is `open` or `closed`. Blocking, readiness, and pause are derived from its current frontier and unknowns; they are not stored lifecycle states.
- Active Efforts follow the existing active Task and Bug gitignore convention. Closing requires explicit confirmation, preserves the record and reason in the archive, and never deletes code. A ready Effort preserves confirmed context for a future `effort-spec`; it does not generate a Spec.

## Decisions so far

<!-- Closed decision tickets are indexed here. -->

- [Define the Effort Record Contract](issues/01-effort-record-contract.md) — use one resumable Markdown record with only `open`/`closed` persisted; derive live status from its contents and require confirmation before archiving.
- [Define the Natural-Language Effort Interaction Contract](issues/02-effort-skill-contract.md) — one `effort-explore` Skill selects existing records safely, derives status from record content, and archives only after confirmed, reasoned closure.

## Not yet specified

<!-- No unresolved Phase 1 decisions remain. -->

## Out of scope

- Spec generation and `effort-spec`: deferred to Phase 2.
- Spec decomposition, coverage matrices, task dependencies, and `task-decompose`: deferred to Phase 3.
- Automatic Task-to-Effort escalation, issue tracker synchronization, multi-agent orchestration, and external tracker integrations: deferred beyond Phase 1.
