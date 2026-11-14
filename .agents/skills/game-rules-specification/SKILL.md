---
name: game-rules-specification
description: Specify Vietnamese game rules as versioned deterministic contracts with sourced facts and explicit house variants.
---

# Game Rules Specification

Project-authored skill, 14/11/2026. Supplements AGENTS.md; existing user release authority persists.

## Procedure

1. Read docs/VIETNAMESE_GAMES.md and the source confidence table; never call a community README a national rulebook.
2. Keep the normative implementation contract only in docs/GAME_RULES_V1.md; distinguish sources from product choices.
3. For Ô ăn quan, lock pit indexing, sow direction, NEXT-pit relay, capture chaining, quan value, refill/debt, termination and ties.
4. Track physical dân/quan separately from points and debt; preserve 50 dân + 2 quan throughout every accepted move.
5. For lô tô, lock ticket geometry/ranges, draw without replacement, first winning draw, equal winners and claim validation.
6. Server computes results; never accept client scores, tickets, random seeds or draw order.
7. Make malformed/stale/out-of-turn commands atomic failures; bound sow loops and all stored collections.
8. Publish concrete examples and hand-authored fixtures; record local variants openly and retain a human cultural/rules pilot gate.

## Evidence and guardrails

- Report observed facts, assumptions and open gates separately.
- Read only relevant source/tests; preserve user changes and room/media contracts.
- Mutations and adversarial tests are local only; no billing or service provisioning.
- A planned or blocked step is not a passed implementation.
