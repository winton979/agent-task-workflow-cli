# Grilling Integration Guide

`task-explore`, `bug-explore`, and the escalation paths inside `task-fast` embed the Grilling protocol from [Matt Pocock's skills collection](https://github.com/mattpocock/skills.git) at commit `49dd158d1076134a641b33efb035946536778336` (October 9, 2026).

The protocol is embedded rather than installed as a separate skill. It provides decision-tree exploration, frontier rounds, false-positive facts investigation, and one recommended answer per question.

Managed workflows that include the protocol:

- `task-explore`: once
- `bug-explore`: once
- `task-fast`: twice, once for each automatic escalation route

Repository facts are investigated by the agent. User-owned decisions are asked in the current frontier and become inputs to the resulting brief. The workflow waits for shared understanding before writing the brief.

When updating the upstream protocol, update the embedded text and its fixture together, then verify all three installation targets with the upstream guidance tests.
