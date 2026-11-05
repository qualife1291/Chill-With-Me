# Project state · 2026-11-05

## Start here

Repo: https://github.com/qualife1291/Chill-With-Me · branch `main`.
Source version: see Git HEAD. Current source includes the 2026-11-05 immersive lobby, rigged male/female avatar selection and camera quality pass. Public deployment remains the earlier version below.
Public: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/?v=cinema6
Public UI was deployed 2026-11-03; the 2026-11-05 source quality pass has not been deployed. Read-only HTTP checks passed for HTML, all 3 asset files (exact local bytes after one gunzip) and 3-room summary; `cinema/evidence/public-drag.json`.

## Product rules / implemented behavior

- 3 fixed room slots; host chooses 2–10 seats, including host. Host can play alone immediately; late joins watch the current timeline. No wait for others.
- Server enforces host-only play/pause/seek/Next and membership approval/kick/ban. Playlist is the app queue; reject unsolicited YouTube video changes. Empty queue requires host URL + Enter; no defer/Escape. End of last item prompts host once, including device voice.
- Full-viewport theater, panels hidden until clicked. Tiered seats, framed screen, wall/ceiling lighting and KayKit rigged GLB avatars with procedural fallback; first-person, overview, shoulder and social camera presets. Neck yaw ±75°, pitch −45°/+35°, body look-back 180°.
- Avatars walk along the aisle, turn into the row, then blend into sitting. Arms/knees move with the gait. Members can wave for 2.4 seconds; server-scoped timestamps replicate the action and repeat requests during the same wave do not restart it. Male/female selection is retained through creation, pending approval and snapshots; older sessions default to male. KayKit Adventurers Knight/Mage are optimized CC0 assets under public/models, with source commit, license and checksums.
- Latest source: drag/vuốt on the 3D background, D-pad/WASD/arrows, recenter button, icon toolbar with 44px targets. Native iframe remains interactive. Drag input batches per animation frame; release/cancel/blur cleans up. Avatar pose uses the existing WebSocket path.
- Host queue edits use queue revision guards; viewers can submit up to three pending suggestions with a 10-second cooldown. Only host review appends a proposal; stale edits refresh without replay, invalid URL remains in the form, and queued reordering preserves the current video/timeline. Legacy room JSON defaults queueRevision to zero and suggestions to empty.
- Chat uses WebSocket delta + optimistic UI + idempotent HTTP fallback. Device Vietnamese TTS queue ducks video to 25%, then restores it. No realtime mic, hosted voice clone, or NIM production.
- Reservation 20s, reconnect grace 30s, pending TTL 120s, empty-room close 60s; host transfer/designated successor. New joins do not reset playback.

## File map (read targeted sections)

| File in `cinema/` | Responsibility |
| --- | --- |
| `src/main.tsx` | UI, room/session, WS/chat, panels, host modals, head state |
| `src/Lobby.tsx` | Demand-rendered lobby doors and live character preview |
| `src/ModelAvatar.tsx` | Independent cloned GLB skeletons, clips, stable gaze/wave overlays |
| `src/Cinema.tsx` | Procedural scene/avatar/neck, smooth camera, projection/dock framing |
| `src/useHeadDrag.ts` | Pointer gesture lifecycle; no idle render loop |
| `src/Player.tsx` | YouTube API, host seek, sync, ended/generation guards, duck volume |
| `src/useChatSpeech.ts` | Vietnamese device voice selection, speech queue |
| `src/style.css` | Fullscreen/responsive layout and control placement |
| `shared/model.ts` | Zod protocol, roles, room lifecycle, timeline, seat layout |
| `shared/camera.ts` | Validated camera presets shared with unit tests |
| `shared/avatar.ts` | Deterministic walk/seat/wave motion and aisle path |
| `shared/projection.ts` | Project 640×360 iframe onto 3D screen corners |
| `worker/index.ts` | Cookie identity, exact Origin guard, 3-slot gateway, SQLite DO + WS |
| `tests/fixes.cjs` | Current two-browser regression; mocked YouTube/speech |

## Verification / remaining work

Latest source release, 2026-11-05 (not deployed):
- Interactive 3D lobby with keyboard-accessible door preview, selected-room cards and live male/female model preview; lightweight fallback preserves the forms. Four camera presets interpolate position, aim and lens; reduced-motion skips camera travel. Shoulder/social views keep the player pinned above the character view. Camera changes preserve player identity.
- Real rigged GLB avatars replace the normal procedural rendering path. Source: KayKit Adventurers 1.0, Kay Lousberg, CC0; pinned commit and verified source/optimized hashes in `cinema/public/models/manifest.json`. Knight/Mage are 341,736/332,816 bytes, about 131 KB gzip each. Removed weapons/accessories and unused clips; retained native idle/walk/sit/cheer, with a bounded wave overlay. Independent skeleton clones share immutable geometry/materials; skeleton resources are disposed on unmount. Procedural head/arm offsets are restored before each mixer evaluation so idle poses cannot accumulate rotation. Asset failure is isolated to a model, not the whole room.
- Existing chat/voice fixes remain: capped-history follow versus manual reading, held keys release on text focus/hidden tab, stale speech callbacks cannot duck audio, bounded seen IDs, storage-denied preferences, visible voice warning and autoplay-blocked recovery. Avatar choice does not select or clone a voice.
- Head-control review: D-pad loops now cancel on window blur/document hiding; the pad drag shares primary-pointer/RAF/capture cleanup and rejects secondary-button input. Rig head yaw/pitch interpolate by elapsed time, use pitch-then-yaw ordering consistent with camera/fallback YXZ, respect reduced-motion and snap exactly at rest. The browser checks a non-neutral bone change and matching host/guest quaternion at renderer diagnostic precision; unchanged snapshots do not accumulate offsets.
- Measured demand rendering: foreground=true, 0 additional renderer frames during a 1,205 ms interval while mocked video advanced 1.206 seconds. This establishes idle rendering behavior only; it does not certify physical-device FPS/thermal/media behavior. Values are recorded under performance in evidence/fixes.json.
- PASS: 35 individual logic/asset cases, frontend build, frontend/Worker TypeScript, Worker dry-run, local API integration including avatar persistence, 44 current two-browser regression checks with zero page errors. YouTube/speech mocked. Main browser suite verifies both GLBs, preview/approval, interpolated/remote stable gaze, D-pad blur/right-button guards, camera/reduced-motion, mobile 44px queue controls, suggestion/reorder/approval, stale edit refresh without replay, membership/chat/voice/wave and idle render counters. Final radio-sizing CSS was additionally smoke-tested at 390px. Fault injection verifies model 404 leaves lobby/forms usable; the injected loader error is expected, not a normal-path error.
- PASS: final fixed-build 3-room/30-authenticated-WebSocket smoke; all peers received chat (103/85/99 ms by room), overflow rejected, HTTP p50 21.0 ms/p95 33.2 ms over 92 measured requests. Rooms closed by runner. An earlier run was invalidated by a concurrent dev build/reload and was rerun after the build settled. This remains a short backend check, excluding media/rendering/WAN/sustained load.
- PASS: local embedded Worker returns all 10 dist files (including both GLBs, manifest/license) as exact bytes after one gzip decode, correct GLB MIME, missing-model 404 and 3-slot API. `encodeBody: "manual"` preserved. Reusable check: `tests/artifact.integration.mjs`; local config helper: `tools/embedded-config.mjs`. Release Worker prepared at ignored `cinema/release/worker.mjs`. Current reports: `cinema/evidence/fixes.json`, `capacity.json`, `artifact.json`; PNGs outside Git in `/workspace/review-chill/evidence/`.

Still requires actual devices: iOS Safari/Android Chrome YouTube autoplay, ads, embed restrictions, background/reconnect, physical touch and real Vietnamese voice quality. Automated mocks do not establish real media behavior or GPU performance. No free camera orbit, voice calling/cloning, sustained 30-device GPU/media benchmark, drift-under-one-second or free-forever claim.

Security baseline: opaque HttpOnly/SameSite cookie; hashed public identity; backend role/session/connection checks, input bounds, payload cap, throttling and command dedupe. Alpha anti-abuse/privacy/deletion/operational work remains separate.

Deployment blocker: the actual noninteractive `wrangler deploy --config wrangler.jsonc` attempt exited because CLOUDFLARE_API_TOKEN is absent. Runtime status exposes no Cloudflare credential binding; whoami is unauthenticated. The secret requirement targeting api.cloudflare.com was saved in the environment draft, not supplied/applied. User must enter it securely in Environment settings and save/publish the relevant environment configuration. Do not use a temporary Cloudflare account. Deployment is already authorized by the user; once credentials are usable, resume deployment to the exact existing Worker/account below, preserve ROOMS/migration and run only read-only production smoke checks.

Current plan audit: docs/KE_HOACH_TRIEN_KHAI_HIEN_HANH.md now reconciles S0–S9 with source/evidence, keeps private-room/advanced queue/RTT/production-device/ops/full-voice gaps visible, and marks old 50/150-person plans as historical. Overview/UI/UX/reference index link to this matrix. Do not claim the full roadmap is complete.

## Runtime / next action

Cloudflare Worker `cung-xem-cinema-alpha`; account `966c7ceee358485648b935a07877ec45`; SQLite DO `RoomSlot`, migration `v1`. Last recorded public deployment `80520b2dd07d411ea28aee473d445c3d`. No server/API credentials stored in repo; connected API performs current deployment. Embedded gzip assets consume Worker requests; regular Wrangler Static Assets deployment is preferred later.

Next: real-device YouTube/autoplay/voice/touch pilot → sustained 3-room media/rendering/quota benchmark → prioritize measured findings. The 2026-11-05 GitHub source update does not deploy the Worker. Do not recreate rooms or change billing/unrelated Workers. Commands: `cinema/README.md`. Research references: `docs/INDEX.md`.
