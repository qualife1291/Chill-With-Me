---
name: game-feature-planning
description: Plan bounded multiplayer game slices for Chill With Me, including dependencies, rollout and acceptance.
---

# Game Feature Planning

Project-authored skill, 14/11/2026. Supplements AGENTS.md; existing user release authority persists.

## Procedure

1. Read PROJECT_STATE.md, AGENTS.md and the game row in docs/ARCHITECTURE.md.
2. Write acceptance in the existing roadmap before implementation; separate playable scope from research.
3. Map lobby → join → start → turn/draw → pause → finish → close, including reconnect and host transfer.
4. Reuse room admission, cookies, epoch, command dedupe and revision CAS; do not create another multiplayer service.
5. Keep game state separate from media: opening/closing a game must not remount, seek or pause the native player.
6. Deliver Ô ăn quan and lô tô as explicit versioned rule packs; no money, prizes or provider integrations.
7. Measure lazy chunk size, bounded snapshot and DOM nodes; preserve one renderer and battery-friendly idle.
8. Finish with rule tests, authorization/DTO tests, real multi-profile UI and mobile evidence.

## Evidence and guardrails

- Report observed facts, assumptions and open gates separately.
- Read only relevant source/tests; preserve user changes and room/media contracts.
- Mutations and adversarial tests are local only; no billing or service provisioning.
- A planned or blocked step is not a passed implementation.
