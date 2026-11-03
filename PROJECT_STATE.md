# Project state · 2026-11-03

## Start here

Repo: https://github.com/qualife1291/Chill-With-Me · branch `main`.
Source release: `6aa2426` (full app + drag controls). This document may be committed later.
Public: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/?v=cinema5
Public build is older than the latest source; new drag controls are **not deployed yet**.

## Product rules / implemented behavior

- 3 fixed room slots; host chooses 2–10 seats, including host. Host can play alone immediately; late joins watch the current timeline. No wait for others.
- Server enforces host-only play/pause/seek/Next and membership approval/kick/ban. Playlist is the app queue; reject unsolicited YouTube video changes. Empty queue requires host URL + Enter; no defer/Escape. End of last item prompts host once, including device voice.
- Full-viewport theater, panels hidden until clicked. Tiered procedural seats/avatars, first-person or centered elevated third-person. Neck yaw ±75°, pitch −45°/+35°, body look-back 180°.
- Latest source: drag/vuốt on the 3D background, D-pad/WASD/arrows, recenter button, icon toolbar with 44px targets. Native iframe remains interactive. Drag input batches per animation frame; release/cancel/blur cleans up. Avatar pose uses the existing WebSocket path.
- Chat uses WebSocket delta + optimistic UI + idempotent HTTP fallback. Device Vietnamese TTS queue ducks video to 25%, then restores it. No realtime mic, hosted voice clone, or NIM production.
- Reservation 20s, reconnect grace 30s, pending TTL 120s, empty-room close 60s; host transfer/designated successor. New joins do not reset playback.

## File map (read targeted sections)

| File in `cinema/` | Responsibility |
| --- | --- |
| `src/main.tsx` | UI, room/session, WS/chat, panels, host modals, head state |
| `src/Cinema.tsx` | Procedural scene/avatar/neck, smooth camera, projection/dock framing |
| `src/useHeadDrag.ts` | Pointer gesture lifecycle; no idle render loop |
| `src/Player.tsx` | YouTube API, host seek, sync, ended/generation guards, duck volume |
| `src/useChatSpeech.ts` | Vietnamese device voice selection, speech queue |
| `src/style.css` | Fullscreen/responsive layout and control placement |
| `shared/model.ts` | Zod protocol, roles, room lifecycle, timeline, seat layout |
| `shared/projection.ts` | Project 640×360 iframe onto 3D screen corners |
| `worker/index.ts` | Cookie identity, exact Origin guard, 3-slot gateway, SQLite DO + WS |
| `tests/fixes.cjs` | Current two-browser regression; mocked YouTube/speech |

## Verification / remaining work

PASS: production frontend build, Worker TypeScript, 20 model/lifecycle/projection cases. Previous browser regression passed host seek, shared roster, approvals, queue, TTS duck/restore, iframe geometry and mobile layout. Latest local browser regression: PASS, 22 checks in `cinema/evidence/fixes.json`. It exercises direct mouse drag direction, release/blur cleanup, jitter/right-button exclusion, recenter, player identity, keyboard, host/guest behavior, and portrait/landscape framing with 44px toolbar targets. YouTube/speech are mocked; touch hardware and real media remain unverified. Earlier reruns exposed background-tab/timer assumptions in the harness; activate the host tab and poll persisted state instead of fixed delays.

Review finding: removed render-blocking Google Fonts import; use system fonts, avoiding an external font dependency. Test scripts still need portable Playwright setup.

Known limits: real YouTube ads/autoplay/iOS/drift and device voice quality need pilot; no 30-person benchmark or free-forever guarantee. No playlist import/reorder, private invitations or operator moderation. Avatars are primitive geometry, not rigged assets. Browser runner paths are environment-specific.

Security baseline: opaque HttpOnly/SameSite cookie; only hashed identity public; backend role/session/connection checks, input bounds, payload cap, throttling and command dedupe. Public lobby exposes room titles. Anti-abuse, privacy/deletion, observability and operational audit remain incomplete; alpha only.

## Runtime / next action

Cloudflare Worker `cung-xem-cinema-alpha`; account `966c7ceee358485648b935a07877ec45`; SQLite DO `RoomSlot`, migration `v1`. Last public deployment `2d039b7019984938b05b4a3af78bf143`. No server/API credentials stored in repo; connected API performs current deployment. Embedded gzip assets consume Worker requests; regular Wrangler Static Assets deployment is preferred later.

Next: push reviewed source/evidence/docs → deploy verified UI → confirm public HTML/assets → real-device pilot. Do not recreate rooms or change billing/unrelated Workers. Commands: `cinema/README.md`. Research references: `docs/INDEX.md`.
