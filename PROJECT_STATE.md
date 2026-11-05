# Resume state · 2026-11-05

Repo `qualife1291/Chill-With-Me`; source version = Git HEAD. Read this file first; use `rg` and the relevant row of [architecture](docs/ARCHITECTURE.md), not the research catalog. Commands: [cinema/README](cinema/README.md). Completion gates: [roadmap](docs/KE_HOACH_TRIEN_KHAI_HIEN_HANH.md).

## Current contract

- Three fixed slots; host chooses 2–10 seats including self and plays alone immediately. Approved late joiners follow the existing timeline. Cookie identity, host ACL, queue revision, command ID, epoch and connection guards remain authoritative. Reserve 20s; reconnect 30s; pending TTL 120s; empty close 60s; room expiry 24h.
- Public/private rooms. Private lobby reveals only occupied/private, never title/capacity/count/epoch/key. Independent random invite capability in URL fragment; only host DTO contains it. Valid invitation creates a pending request, still requiring host approval. Rotation revokes old links and pending requests, keeps approved members; members/pending cookie holders can resume. This is admission control, not E2EE/account auth.
- Host-only native play/pause/seek/Next; one ended transition per generation. Mandatory first source cannot be deferred. Queue max 50; viewer suggestions max 3 pending, 10s cooldown. Batch URL/TXT/static M3U import max 20 links/16 KiB, validated atomically, deduplicated within the batch. Drag/up/down retain the current player; stale revision refreshes without replaying edits.
- YouTube stays native/interactive; camera changes never remount it. Native HTTPS video/audio + local files support MP4/WebM/Ogg/MOV/M4V/MP3/M4A/WAV subject to codecs. No transcoding/upscaling. Drive sample downloaded correctly but real Chromium playback failed CORS; explicit preview is **unsynchronized**, with no ended API. No claim every URL/codec works.
- Local file limits: 100 MiB each/250 MiB total sender handles. Reliable WebRTC attempted via public STUN, no TURN; explicit authenticated WS relay ≤25 MiB, 16 KiB chunks, 256 KiB ack window. Playback after full receipt, then catch-up. Sender keeps tab/file open. Reload requires reselecting the same file. No file bytes in DB/R2. End/Next/remove/leave prune metadata, Blob URLs, handles, chunks and transfer connections/cursors. Dedupe table ≤200 ID/timestamp rows, no file history.
- Clock: nonce/socket/epoch-bound probes; minimum RTT of ≤8 samples younger than 60s; monotonic server-time callback for players. Snapshots bootstrap only. No certified WAN drift bound.
- Fullscreen theater, 44px controls, four smooth camera presets, reduced motion/light fallback. KayKit CC0 male/female GLBs; independent skeletons, shared geometry; walk/sit/wave, smoothed yaw ±75°/pitch −45°…35°, body 180°. Demand rendering stops at rest. Screen-edge/cove/aisle emissive trims are static, with no extra shadow lights or animation loop. Device speech speed is locally persisted (0.75–1.25×), default 0.95×. Device Vietnamese TTS ducks/restores media; no mic/call/clone/NIM production.
- Dialogs contain focus/inert background (including summary/textarea); required start ignores Escape. Nonmodal panels focus the composer and restore their toolbar opener on Escape. Invitation copy has a manual fallback.

## Read map

| Change | Files under `cinema/` |
| --- | --- |
| Rules/admission/private/queue/lifecycle | `shared/model.ts`, `worker/index.ts` |
| Batch/clock protocols | `shared/playlist.ts`, `shared/clock.ts` |
| App/session/WS/panels | `src/main.tsx`, `src/useRoomClock.ts`, `src/useModalFocus.ts` |
| Import/invitation UI | `src/PlaylistImport.tsx`, `src/InvitationControls.tsx` |
| Playback/local transfer | `src/Player.tsx`, `src/NativePlayer.tsx`, `src/FileShare.ts`, `shared/fileSignal.ts`, `shared/fileRelay.ts` |
| Graphics/input/speech | `src/Cinema.tsx`, `ModelAvatar.tsx`, `Lobby.tsx`, `useHeadDrag.ts`, `useChatSpeech.ts`; `shared/avatar.ts`, `camera.ts`, `projection.ts` |
| QA/release | `tools/verify-local.mjs`, `tests/`, `evidence/`; `wrangler.jsonc`, `scripts-bundle.mjs` |

## Verification and next action

Run `npm run verify:local` against an already running local Worker on 8787 with all three slots free. It builds, runs individual unit cases, types/docs/dry-run, API/relay/UI/native-media/private/import/clock tests, one-renderer 10-avatar smoke, 30-socket capacity and embedded byte/gzip checks **sequentially**. No concurrent source edits/builds during browser/load tests. It preserves pre-existing rooms and writes screenshots/logs outside Git. Final status/counts are in `cinema/evidence/verification.json`; feature reports: `fixes.json`, `media.json`, `roadmap.json`, `render-capacity.json`, `capacity.json`, `artifact.json`. Latest full local run passed all 25 stages: 52 individual logic cases, 44 UI checks, 18 native-media checks, 14 roadmap-browser checks, relay security, 10-model smoke, 30 sockets and embedded byte equality. Zero page errors in the UI/media/roadmap reports. A failed report is not a release pass. CI workflow checks source/build/types/docs on Node 22/24; CI execution is distinct from local evidence.

UI tests mock YouTube/device speech; native media decodes real generated WebM/MP3/H.264 MOV and checks exact transferred bytes, native controls/ended, mixed queue and persisted/Blob cleanup. Drive fallback uses a controlled fixture; actual sample CORS failure is separate. Managed Chromium blocks non-proxied WebRTC UDP; successful local delivery is verified through the explicit relay. SwiftShader timings/30 backend sockets do not certify mobile FPS, WAN, sustained media load, real voice quality or quota.

Still open: physical iOS/Android/desktop YouTube autoplay/ads/embed/touch/voice pilot; sustained production media/rendering/reconnect/eviction/quota/rollback checks; operator/privacy processes; full voice provider/consent/enrollment/delete/quality/budget gates. Do not mark the whole roadmap complete or add fictional provider controls.

## Deployment boundary

Already authorized, but blocked: latest runtime has **no Cloudflare secret/identity bindings**; `wrangler whoami` unauthenticated. User must supply `CLOUDFLARE_API_TOKEN` securely through Environment settings and apply that configuration. Never print/read secret values or use a temporary account. Once ready, deploy without asking again to existing Worker `cung-xem-cinema-alpha`, account `966c7ceee358485648b935a07877ec45`, SQLite binding `ROOMS`/class `RoomSlot`, migration `v1`. Preserve production rooms/billing. Optional embedded release must retain `encodeBody: "manual"`. Only read-only production smoke after deployment.

Public remains the older release: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/?v=cinema6 (last recorded deployment `80520b2dd07d411ea28aee473d445c3d`). GitHub push is not deployment. Do not repeat historical changes; inspect HEAD and the current diff.
