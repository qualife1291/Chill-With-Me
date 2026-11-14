---
name: game-documentation
description: Maintain concise game rulebooks, source provenance and an implementation-linked QA plan.
---

# Game Documentation

Project-authored skill, 14/11/2026. Supplements AGENTS.md; existing user release authority persists.

## Procedure

1. Keep PROJECT_STATE.md as the concise resume entry; do not add duplicate status/memory documents.
2. Keep normative rules in docs/GAME_RULES_V1.md and research/licensing in docs/VIETNAMESE_GAMES.md.
3. Write a small rule/action/test mapping so an agent can locate the reducer and relevant fixture quickly.
4. Mark source facts, chosen variants, implemented behavior and unverified hardware/rules pilot separately.
5. Document error recovery: stale action, disconnect/reload, player removal, pause and host succession.
6. Keep runtime commands/limits in cinema/README.md and the single roadmap as the owner of acceptance checkboxes.
7. Preserve attribution and licenses for imported assets; authored CSS/SVG needs an honest project provenance note.
8. Update only changed facts at handoff; verify document paths and never mark tests or deployments passed without evidence.

## Evidence and guardrails

- Report observed facts, assumptions and open gates separately.
- Read only relevant source/tests; preserve user changes and room/media contracts.
- Mutations and adversarial tests are local only; no billing or service provisioning.
- A planned or blocked step is not a passed implementation.
