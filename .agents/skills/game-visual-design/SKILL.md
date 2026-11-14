---
name: game-visual-design
description: Design original lightweight Vietnamese board-game graphics with responsive touch and accessible motion.
---

# Game Visual Design

Project-authored skill, 14/11/2026. Supplements AGENTS.md; existing user release authority persists.

## Procedure

1. Preserve the cinema palette; use original CSS/SVG wood, felt and pebble motifs with no unlicensed images.
2. Use the existing controlled sheet and a single game entry; opening chat/view must replace the game sheet.
3. Ô ăn quan: horizontal desktop, vertical five-row phone board; pit controls at least 44px, upright labels and own-side names.
4. Lô tô: nine-column numbers are read-only and auto-marked; give Kinh and draw their own 44px buttons.
5. Cap decorative pebbles per pit; show numeric counts rather than one DOM node per stone.
6. Use finite transform/opacity highlights, visible focus, text turn/result announcements and reduced-motion overrides.
7. Never add a second WebGL renderer, physics loop, remote fonts or automatic fullscreen effects.
8. Inspect screenshots at 320px, landscape, tablet and desktop; hit-test controls and check media/renderer identity.

## Evidence and guardrails

- Report observed facts, assumptions and open gates separately.
- Read only relevant source/tests; preserve user changes and room/media contracts.
- Mutations and adversarial tests are local only; no billing or service provisioning.
- A planned or blocked step is not a passed implementation.
