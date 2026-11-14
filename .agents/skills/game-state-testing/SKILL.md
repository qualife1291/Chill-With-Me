---
name: game-state-testing
description: Test deterministic game invariants, authoritative multiplayer boundaries and lifecycle recovery.
---

# Game State Testing

Project-authored skill, 14/11/2026. Supplements AGENTS.md; existing user release authority persists.

## Procedure

1. Test pure rules with hand-authored counterexamples before random simulations.
2. Ô fixtures cover NEXT-pit relay vs last pit, chain capture, quan stop, refills/loans/debt, both quan captured, ties and loop bounds.
3. Seeded legal-play simulations assert nonnegative integers and conservation of every physical token after each move.
4. Lô tô tests assert 3×9/15 unique numbers, five per row, valid sorted column ranges, unique deck and no-replacement drawing.
5. Test equal winners at the same draw, invalid claims, host-only draw/publish and secrets stripped even for host/spectators.
6. Test stale revisions, close/open ABA, nonmembers/pending users, replay dedupe and unchanged state after errors.
7. Use real local Worker/WebSocket profiles for moves, pause/resume, reload/rejoin and host transfer; fixture only provider APIs.
8. Check snapshots remain bounded across rounds; UI is keyboard/touch accessible and Hold/native video identity survives.
9. Run standard verify:local sequentially; distinguish software GPU, emulated devices, rules pilot and production read-only verification.

## Evidence and guardrails

- Report observed facts, assumptions and open gates separately.
- Read only relevant source/tests; preserve user changes and room/media contracts.
- Mutations and adversarial tests are local only; no billing or service provisioning.
- A planned or blocked step is not a passed implementation.
