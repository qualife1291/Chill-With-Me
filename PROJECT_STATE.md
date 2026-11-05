# Project state · 2026-11-05

## Start here

Repo: https://github.com/qualife1291/Chill-With-Me · branch `main`.
Source version: see Git HEAD. Current source includes the 2026-11-05 scene/avatar/chat/voice quality pass. Public deployment remains the earlier version below.
Public: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/?v=cinema6
Public UI was deployed 2026-11-03; the 2026-11-05 source quality pass has not been deployed. Read-only HTTP checks passed for HTML, all 3 asset files (exact local bytes after one gunzip) and 3-room summary; `cinema/evidence/public-drag.json`.

## Product rules / implemented behavior

- 3 fixed room slots; host chooses 2–10 seats, including host. Host can play alone immediately; late joins watch the current timeline. No wait for others.
- Server enforces host-only play/pause/seek/Next and membership approval/kick/ban. Playlist is the app queue; reject unsolicited YouTube video changes. Empty queue requires host URL + Enter; no defer/Escape. End of last item prompts host once, including device voice.
- Full-viewport theater, panels hidden until clicked. Tiered seats, framed screen, wall/ceiling lighting and articulated procedural avatars; first-person or a wider centered elevated third-person overview. Neck yaw ±75°, pitch −45°/+35°, body look-back 180°.
- Avatars walk along the aisle, turn into the row, then blend into sitting. Arms/knees move with the gait. Members can wave for 2.4 seconds; server-scoped timestamps replicate the action and repeat requests during the same wave do not restart it. No external model binaries or licenses introduced.
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
| `shared/avatar.ts` | Deterministic walk/seat/wave motion and aisle path |
| `shared/projection.ts` | Project 640×360 iframe onto 3D screen corners |
| `worker/index.ts` | Cookie identity, exact Origin guard, 3-slot gateway, SQLite DO + WS |
| `tests/fixes.cjs` | Current two-browser regression; mocked YouTube/speech |

## Verification / remaining work

2026-11-05 quality pass, source only:
- Improved the room composition with a wider overview/lower aim, wall panels, warm sconces, ceiling beams and screen trim. Lower seat backs expose seated avatars; original procedural joints drive walking, sitting and waving. Rendering remains on demand, limited DPR, without new textures, model downloads, dependencies or shadow maps.
- Fixed capped-history chat follow using layout timing and message identity while preserving manual history reading. Held camera keys release on text/dialog focus or document hiding. Stale cancelled-speech callbacks cannot duck volume or show errors; seen-message IDs are bounded. Denied localStorage no longer breaks voice preferences. Voice warnings appear inside chat; YouTube autoplay-blocked feedback points to the user-gesture playback button. Lightweight video now fits short landscape screens and expanded controls.
- PASS: frontend build, frontend and Worker TypeScript, Worker dry-run packaging, 23 individual logic cases (model/lifecycle/projection/avatar), local API integration, 30 browser regression checks with zero page errors. Browser cases include first/third/light views retaining the same player, chat cap/history reading, TTS duck/restore/cancellation, storage denied, autoplay-blocked recovery, landscape bounds and persisted shared wave action. YouTube/speech are mocked. Capped-history UI uses synthetic server-shaped WS deltas; normal chat/membership/control paths use the real local backend.
- PASS: 3 local rooms, 10 online members each, 30 independent authenticated WebSockets; chat reached all peers, extra guest rejected, runner closed its rooms. Observed broadcast completion 83–121 ms, HTTP p50 21.2 ms/p95 29.2 ms over 92 measured requests. This is a short backend smoke test, excluding real media, rendering, WAN latency and sustained load. See `cinema/evidence/capacity.json`.
- Latest browser result: `cinema/evidence/fixes.json`. Screenshots live outside Git at `/workspace/review-chill/evidence/` (wave/desktop/mobile/landscape); inspected after the final full run. Browser runtime paths are portable via normal Playwright resolution or explicit overrides; historical browser.cjs/realtime.cjs still target the older UI, so fixes.cjs is the current regression suite.

Remaining verification requires actual devices: iOS Safari/Android Chrome YouTube autoplay, ads, embed restrictions, background/reconnect, physical touch, and real Vietnamese voices. Commands and pilot checklist: `cinema/README.md`. Do not call this a real-media or sustained 30-client GPU benchmark. The procedural rig does not include imported/skinned characters, facial animation, free camera orbit, voice calling or voice cloning. Catalog assets remain candidates; these features are separate product work, not verified by this pass. No claim of production readiness, drift below one second or unlimited free usage.

Security baseline: opaque HttpOnly/SameSite cookie; only hashed identity public; backend role/session/connection checks, input bounds, payload cap, throttling and command dedupe. Public lobby exposes room titles. Anti-abuse, privacy/deletion, observability and operational audit remain incomplete; alpha only.

## Runtime / next action

Cloudflare Worker `cung-xem-cinema-alpha`; account `966c7ceee358485648b935a07877ec45`; SQLite DO `RoomSlot`, migration `v1`. Latest public deployment `80520b2dd07d411ea28aee473d445c3d`. No server/API credentials stored in repo; connected API performs current deployment. Embedded gzip assets consume Worker requests; regular Wrangler Static Assets deployment is preferred later.

Next: real-device YouTube/autoplay/voice/touch pilot → sustained 3-room media/rendering/quota benchmark → prioritize measured findings. The 2026-11-05 GitHub source update does not deploy the Worker. Do not recreate rooms or change billing/unrelated Workers. Commands: `cinema/README.md`. Research references: `docs/INDEX.md`.
