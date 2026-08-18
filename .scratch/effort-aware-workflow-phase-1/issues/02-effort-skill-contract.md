# Define the Natural-Language Effort Interaction Contract

Type: grilling
Status: resolved
Blocked by: 01

## Question

Given the Effort record contract, what must `effort-explore` read, validate, change, preserve, and report for natural-language creation, continuation, status reporting, and closure, while allowing a ready Effort to be handed to a future Spec workflow without generating a Spec?

## Answer

`effort-explore` is the sole Phase 1 interface. It interprets natural-language creation, continuation or update, status, and closure requests. Every request about an existing Effort must name it or identify a single unambiguous open record; multiple plausible records require user selection and are never resolved by recency.

The Skill reports readiness, blocking, or continued exploration from the Current Frontier and Open Unknowns without persisting those labels. A closure request without a reason asks for one, then describes the state change, reason recording, and archive move before awaiting confirmation. Confirmation changes the record to `state: closed`, writes the reason under `# Closure`, archives the record, and leaves code and other workflow artifacts untouched.

The resulting contract is implemented by the Phase 1 Spec in `../spec.md`, including workspace-root routing, init, refresh, doctor, documentation, and provider-parity coverage.
