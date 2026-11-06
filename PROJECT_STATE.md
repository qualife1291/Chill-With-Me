# Resume state · 2026-11-06

Repo `qualife1291/Chill-With-Me`; source version = Git HEAD. Read this file first; use `rg` and the relevant row of [architecture](docs/ARCHITECTURE.md), not the research catalog. Commands: [cinema/README](cinema/README.md). Completion gates: [roadmap](docs/KE_HOACH_TRIEN_KHAI_HIEN_HANH.md).

## Current contract

- Three fixed slots; host chooses 2–10 seats including self and plays alone immediately. Approved late joiners follow the existing timeline. Cookie identity, host ACL, queue revision, command ID, epoch and connection guards remain authoritative. Reserve 20s; reconnect 30s; pending TTL 120s; empty close 60s; room expiry 24h.
- Home asks for profile only after room selection; creation includes cinema/sofa seating, joining asks only name/avatar. Rows are centered at 1.25-unit spacing: 2–5 seats in one row, 6–8 in two, 9–10 in three; row counts differ by at most one. Sofas share rounded backs without interior armrests. Side ramps/rear concourse match the avatar path; seated GLBs are aligned to cushions/footrests. Legacy rooms use cinema seating.
- Public/private rooms. Private lobby reveals only occupied/private, never title/capacity/count/epoch/key. Independent random invite capability in URL fragment; only host DTO contains it. Valid invitation creates a pending request, still requiring host approval. Rotation revokes old links and pending requests, keeps approved members; members/pending cookie holders can resume. This is admission control, not E2EE/account auth.
- Approved members can report interruption for the current generation: wait freezes timeline; ready clears only their hold, never auto-plays. Host resumes explicitly or overrides; next/leave/kick/expiry prune holds. No automatic ad detection/skipping.
- Host-only native play/pause/seek/Next; one ended transition per generation. Mandatory first source cannot be deferred. Queue max 50; viewer suggestions max 3 pending, 10s cooldown. Batch URL/TXT/static M3U import max 20 links/16 KiB, validated atomically, deduplicated within the batch. Drag/up/down retain the current player; stale revision refreshes without replaying edits.
- YouTube stays native/interactive; camera changes never remount it. Native HTTPS video/audio + local files support MP4/WebM/Ogg/MOV/M4V/MP3/M4A/WAV subject to codecs. No transcoding/upscaling. Drive sample downloaded correctly but real Chromium playback failed CORS; explicit preview is **unsynchronized**, with no ended API. No claim every URL/codec works.
- Local file limits: 100 MiB each/250 MiB total sender handles. Reliable WebRTC attempted via public STUN, no TURN; explicit authenticated WS relay ≤25 MiB, 16 KiB chunks, 256 KiB ack window. Playback after full receipt, then catch-up. Sender keeps tab/file open. Reload requires reselecting the same file. No file bytes in DB/R2. End/Next/remove/leave prune metadata, Blob URLs, handles, chunks and transfer connections/cursors. Dedupe table ≤200 ID/timestamp rows, no file history.
- Clock: nonce/socket/epoch-bound probes; minimum RTT of ≤8 samples younger than 60s; monotonic server-time callback for players. Snapshots bootstrap only. No certified WAN drift bound.
- Fullscreen theater; four camera choices in one selector, drag/touch/WASD to look, wheel FOV 32–80°. Looking aside/social views use a small corner player; narrow fallback stays at the top, landscape controls remain visible. Media stays mounted across view/zoom/light changes. Live head poses are cached by room epoch until membership ends; a 2s pose heartbeat reaches late joiners and identical poses do not redraw the scene. Seated bodies stay aligned with chairs while heads turn.
- Lobby uses timber/sage colors, rounded doors, benches, plants and warm pendants; `RoundedGeometry.tsx` shares disposable cushion geometry. KayKit CC0 male/female Barbarian/Rogue GLBs remain 331,576/339,052 bytes, with isolated skeletons, walk/sit/wave and smoothed gaze. Lobby preview uses a fixed origin, independent of the walking route. Demand rendering stops at rest; lights/trims are static. Approved peers can poke another member (3s actor cooldown, no self/pending target): a bounded reaction and named notification are shared. Local-file tiles are clickable/focusable native file inputs with limits and disabled feedback; existing transfer limits remain unchanged.
- Device Vietnamese TTS has persisted speed 0.75–1.25×, default 0.95×, and ducks/restores media. No mic/call/clone/NIM production.
- Dialogs contain focus/inert background (including summary/textarea); required start ignores Escape. Nonmodal panels focus the composer and restore their toolbar opener on Escape. Invitation copy has a manual fallback.

## Read map

| Change | Files under `cinema/` |
| --- | --- |
| Rules/admission/private/queue/lifecycle | `shared/model.ts`, `worker/index.ts` |
| Batch/clock protocols | `shared/playlist.ts`, `shared/clock.ts` |
| App/session/WS/panels | `src/main.tsx`, `src/useRoomClock.ts`, `src/useModalFocus.ts` |
| Import/invitation UI | `src/PlaylistImport.tsx`, `src/InvitationControls.tsx` |
| Playback/local transfer | `src/Player.tsx`, `src/NativePlayer.tsx`, `src/PlaybackReadiness.tsx`, `src/FileShare.ts`, `shared/fileSignal.ts`, `shared/fileRelay.ts` |
| Graphics/input/speech | `src/Cinema.tsx`, `ModelAvatar.tsx`, `Lobby.tsx`, `useHeadDrag.ts`, `useChatSpeech.ts`; `shared/avatar.ts`, `camera.ts`, `projection.ts` |
| QA/release | `tools/verify-local.mjs`, `tests/`, `evidence/`; `wrangler.jsonc`, `scripts-bundle.mjs` |

## Verification and next action

Run `npm run verify:local` against an already running local Worker on 8787 with all three slots free. It builds, runs individual unit cases, types/docs/dry-run, API/relay/UI/native-media/private/import/clock tests, one-renderer 10-avatar smoke, 30-socket capacity and embedded byte/gzip checks **sequentially**. No concurrent source edits/builds during browser/load tests. It preserves pre-existing rooms and writes screenshots/logs outside Git. Final status/counts are in `cinema/evidence/verification.json`; feature reports: `fixes.json`, `media.json`, `roadmap.json`, `render-capacity.json`, `capacity.json`, `artifact.json`. Latest full local run passed all 26 stages: 64 individual logic cases, 47 UI checks, 19 native-media checks, 15 roadmap-browser checks, relay security, 10-model smoke, 30 sockets and embedded byte equality. Zero page errors in the UI/media/roadmap reports. A failed report is not a release pass. CI workflow checks source/build/types/docs on Node 22/24; CI execution is distinct from local evidence.

UI tests mock YouTube/device speech; native media decodes real generated WebM/MP3/H.264 MOV and checks exact transferred bytes, native controls/ended, mixed queue and persisted/Blob cleanup. Drive fallback uses a controlled fixture; actual sample CORS failure is separate. Managed Chromium blocks non-proxied WebRTC UDP; successful local delivery is verified through the explicit relay. SwiftShader timings/30 backend sockets do not certify mobile FPS, WAN, sustained media load, real voice quality or quota.

Still open: physical iOS/Android/desktop YouTube autoplay/ads/embed/touch/voice pilot; sustained production media/rendering/reconnect/eviction/quota/rollback checks; operator/privacy processes; full voice provider/consent/enrollment/delete/quality/budget gates. Do not mark the whole roadmap complete or add fictional provider controls.

## Deployment boundary

Cloudflare auth is ready: runtime revision 4 reports `CLOUDFLARE_API_TOKEN` ready; real Wrangler whoami authenticated the expected account. Never print/read token values. Deployment already authorized for Worker `cung-xem-cinema-alpha`, account `966c7ceee358485648b935a07877ec45`, `ROOMS`/`RoomSlot`, migration `v1`; preserve rooms/billing.

Deployed code `fd6b209` on 06/11/2026 via Wrangler Static Assets. Version `7b950a22-8a63-485e-ab4c-7be7f08c681a`. Public: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/ . Read-only smoke matched all 10 dist files (including both GLBs) byte-for-byte and the 3-room API; `cinema/evidence/production.json`. No production room mutations. GitHub workflow still checks source only; push is not automatic deployment.

R2 remains blocked by account service activation, not missing runtime token: real `wrangler r2 bucket list` returned Cloudflare code 10042, “Please enable R2 through the Cloudflare Dashboard.” No buckets were created or billing changed. User must enable R2 in the account Dashboard before temporary media storage can be provisioned. Optional `worker/temp-media.ts` storage core has six fake-ledger/bucket unit cases: local current+next references, byte limits, private Range, epoch/member checks, TTL and durable delete retries. It is **unwired**: routes, client integration, binding/provisioning and actual R2 tests remain open. It does not fetch YouTube/Drive/direct URLs or provide resumable uploads. Production still uses P2P/relay and stores no file bytes.

Optional embedded builds retain `encodeBody: "manual"`; current deployment uses regular Static Assets. Check Git HEAD/current diff before changing code.

YouTube Premium is per eligible signed-in viewer, not inherited through the host URL. Embeds may not recognize login; ads can cause drift. Official-source notes: [Premium research](docs/YOUTUBE_PREMIUM.md).
