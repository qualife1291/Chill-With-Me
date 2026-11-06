# Runtime commands and limits

Resume/status: [PROJECT_STATE](../PROJECT_STATE.md). Code map/invariants: [architecture](../docs/ARCHITECTURE.md). [Roadmap](../docs/KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) owns unresolved gates; archive files are historical.

## Develop

Node 22+:

```bash
npm ci
npm run build
npm run serve -- --local --ip 127.0.0.1 --port 8787
```

Home asks for a profile only after selecting create/join. Hosts choose cinema chairs or shared sofa seating at creation; all members receive the same layout, with unchanged capacity/seat anchors.

Use separate browser profiles for separate members. `/?demo` is a local simulation. Optional Vite HMR: `npm run dev` while Wrangler supplies the API. Never run room mutation tests on production.

## Verify

With local Wrangler on 8787 and **all three slots free**:

```bash
npm run verify:local
```

The runner builds once, waits for that build, then runs individual logic cases, strict Worker types, document paths, dry-run, API/playlist/private/bulk/relay security, UI/3D/chat/device speech, real native media, roadmap UI, one-renderer/ten-avatar smoke, 30 backend sockets and embedded asset/gzip equality **sequentially**. It stops on failure and preserves existing occupied rooms. It starts a local embedded Worker on 8788 if needed and stops only that process when finished. Do not edit source or rebuild while it runs.

Requirements: ffmpeg, Chromium and Playwright. `tests/browser-runtime.cjs` uses local Playwright or the managed cloud runtime; `PLAYWRIGHT_MODULE_PATH`/`CHROMIUM_EXECUTABLE_PATH` can select an existing install. Outside that environment, install QA tools without changing app dependencies:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

Screenshots/logs go to a temporary directory printed by the runner; JSON evidence stays in `evidence/`. `verification.json` is the aggregate result, not a production certification. Per-feature reports: `fixes.json`, `media.json`, `roadmap.json`, `render-capacity.json`, `capacity.json`, `artifact.json`. A failed/stale report is not a release pass. Historical `browser.cjs`/`realtime.cjs` predate the current UI; use `fixes.cjs`.

Targeted commands:

```bash
npm test
npm run check:worker
npm run check:docs
npm run worker:check
node tests/roadmap.integration.mjs  # private/API bulk/idempotency/body limits, slot 2
node tests/roadmap.cjs              # private/import/drag/clock/panel UI, slot 2
node tests/media.cjs                # native codecs/control/cleanup, slot 3
node tests/relay-security.cjs       # binary ACL/cursor/size/stale item, slot 2
node tests/render-capacity.cjs      # run alone; ten models, one software renderer
```

GitHub `Source checks` checks build/logic/types/docs/dry-run on Node 22/24. It does not run physical devices or the local full-browser runner. CI configuration and an observed remote CI pass are separate facts.

## Media and storage

| Input | Behavior / limit |
| --- | --- |
| YouTube | Native interactive iframe; host controls; stable across camera changes |
| Direct HTTPS | MP4/WebM/Ogg/MOV/M4V/MP3/M4A/WAV extensions, signed query allowed; browser codec/provider rules apply |
| Local file | ≤100 MiB each, ≤250 MiB sender-held total; sender keeps tab/file open; playback after full receipt, catches up |
| Direct file sharing | Ordered reliable WebRTC, public STUN, no TURN; NAT/UDP policy can prevent connection |
| Explicit room relay | ≤25 MiB; 16 KiB binary chunks/256 KiB ack window; authenticated current owner/recipient/item, exact cursor/size and timeouts |
| Drive | Try native download URL; sharing/quota/confirmation/CORS may block it. Preview fallback is explicitly **unsynchronized**, with no ended/Next API |
| Playlist import | ≤20 links/16 KiB; plain text/TXT/static M3U, one URL per line; dedupe within batch; atomic validation; no HLS segment playlists |

Files are not transcoded, compressed or upscaled. MOV is a container: H.264/AAC MOV was tested; HEVC/ProRes depend on the browser. Unknown embed sites, arbitrary extensionless URLs, HLS/DASH playback and universal download proxying are unsupported. The supplied Drive sample downloaded as H.264/AAC MP4, but actual browser playback failed CORS; download/share a permitted file or use a direct media URL for synchronized playback.

SQLite holds one room JSON row, bounded metadata/queue/chat, ≤200 command ID/timestamp records and short throttles. **No file bytes, blob table, R2 bucket or recordings.** End/Next removes old media metadata without creating played history. Queue removal/leave/close also prune Blob URLs, file/chunk references, native media resources and transfer connections/cursors. Reload loses file handles: the original owner reselects the same file. Relay consumes Worker/DO resources; sustained throughput/quota is unmeasured.

## Release

Cloudflare credentials go through secure Environment settings, never source/chat. Deployment is authorized for the existing target. Runtime Cloudflare auth was verified and code fd6b209 deployed on 06/11/2026; current version/evidence is in PROJECT_STATE. Command:

```bash
CLOUDFLARE_ACCOUNT_ID=966c7ceee358485648b935a07877ec45 npx wrangler deploy --config wrangler.jsonc
```

Target Worker `cung-xem-cinema-alpha`, binding `ROOMS`/class `RoomSlot`, migration `v1`. New optional room metadata needs no schema reset; legacy rooms remain public. Do not change billing, use a temporary account or reset rooms. After deploy, compare public HTML/assets/models with the tested artifact and read room summaries only. Push alone does not deploy. A rollback drill requires actual account access and a verified healthy version; inspect deployment/version history before selecting a rollback, preserving room data.

Optional embedded release:

```bash
node scripts-bundle.mjs
node tools/embedded-config.mjs
npx wrangler dev --local --config .wrangler/embedded-check.json --port 8788 --persist-to .wrangler/embedded-state
node tests/artifact.integration.mjs
```

Preserve `encodeBody: "manual"`; embedded assets consume Worker requests. Regular Static Assets deployment is preferred. Generated artifacts/state are ignored by Git.

Male scalp hair is derived from the pinned CC0 Rogue head mesh, follows the head bone and uses the selected hair color. Scene quantization retains one skin per model; runtime clones share a skeleton across body parts within each avatar. To regenerate, use the documented offline glTF toolchain with `AVATAR_TOOLS` and run `tools/prepare-avatars.mjs` against the two original source GLBs; it invokes `tools/add-male-hair.mjs`. Never add the offline toolchain to app dependencies.

KayKit GLB provenance/checksums/license: `public/models/manifest.json`. The offline preparation tool lives in `tools/prepare-avatars.mjs`; keep tools outside app dependencies and update hashes/tests intentionally.

## View and social controls

Choose male/female and clothing/hair colors before creating/requesting entry to a room; a 3D preview shows the result. Appearance is retained through approval/reconnect and cannot be edited inside the room. Legacy profiles retain their original textures.

Select eye or free orbit from the view menu. Free orbit combines the previous overview/shoulder/social views: drag around the seats, scroll nearer/farther. Drag/swipe or WASD/arrows to look; scroll the room background to change eye-view FOV or orbit distance. Video stays on the physical 8.8×4.95 screen, with heads/chairs correctly in front of it. The visible screen stays lit even when some corners cross behind the camera; it naturally leaves view when you look fully away. There is no automatic floating player. Reset returns your gaze to the screen. The native iframe stays interactive/mounted; explicit light mode provides a flat player. Character actions include sit, wave and a targeted poke (approved peers only, 3s cooldown). Seats are centered: 2–5 in one row, 6–8 in two, 9–10 in three. Click or keyboard-focus the local-file tile to open the native picker.

Host approval opens immediately in the center, even before the first video; new requests reopen a deferred dialog. When chat is closed, incoming messages appear bottom-right (up to 3, 6 seconds); click to open chat. Poke sounds only on the recipient. Flowers, applause, sad and playful reactions show the sender centrally for 3 seconds to all approved members. The room accepts one effect at a time and each sender waits 5 seconds; the event is deleted on expiry. The action panel toggles interaction sounds independently of chat speech; short WebAudio cues require a user gesture, never queue blocked audio and do not replay on rejoin. Reduced-motion preferences suppress animation.

The optional temporary-storage core in `worker/temp-media.ts` has fake-object unit coverage only. R2 activation, binding, authenticated routes, client upload/prefetch, alarm reconciliation and real-service tests remain required before use. Absolute TTL is 6h; long-playback/renewal policy and resumable upload are not implemented.

## Limits of evidence

UI tests mock YouTube/device speech. Native tests decode generated WebM, MP3 and H.264 MOV, compare transferred bytes and exercise play/pause/seek/ended, speech-volume duck/restore and DB/Blob cleanup. Managed Chromium blocks non-proxied UDP, so relay delivery is verified separately from WebRTC/WAN connectivity. Ten SwiftShader avatars and 30 backend sockets do not certify device FPS, thermal behavior, WAN drift or sustained media quota. Actual iOS/Android YouTube ads/autoplay, touch, voice quality, production eviction/rollback/privacy operations and full voice-provider gates remain open.

YouTube Premium is not shared through the host video URL. See [official-source findings](../docs/YOUTUBE_PREMIUM.md); each iframe/viewer needs its own eligible signed-in account, and ads can cause drift.

## Abrupt departure

Closing a tab closes its transport and retains its seat for up to 30 seconds, allowing refresh/rejoin. When the host expires, only the designated successor with a live, unexpired connection can continue; otherwise the room closes immediately, including pending requests. Public lobby cards indicate host recovery and new requests are rejected until the host returns. A silent connection has a 90-second lease, renewed using existing 15-second clock probes; saves coalesce to every 30 seconds, without heartbeat broadcasts. Browser suspension beyond the lease requires joining again. Private lobby summaries retain their existing privacy boundary.

Reconnect uses one bounded request at a time and backoff (3–15s), resumes on online/pageshow, ignores old socket callbacks and stale command responses, and stops after takeover/closed/expired membership. Healthy rooms do not add HTTP polls. Lease tests use real local sockets/tab close/offline emulation, not a hardware power-loss or WAN certification; see `evidence/departures.json`.
