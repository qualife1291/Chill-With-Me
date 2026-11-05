# Cinema runtime

Read [`../PROJECT_STATE.md`](../PROJECT_STATE.md) for current status. Historical implementation notes: [`../docs/archive/IMPLEMENTATION_NOTES_2026-11-03.md`](../docs/archive/IMPLEMENTATION_NOTES_2026-11-03.md).

## Local development (Node 22+)

```bash
npm ci
npm run build
npm run serve
```

Open the Wrangler URL (usually `http://localhost:8787`). Use two separate browser profiles for realtime. `/?demo` is local simulation only. Optional frontend HMR: keep Wrangler on 8787 and run `npm run dev` in another terminal.

## Checks

```bash
npm test
npm run cf:types
npx tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler worker/index.ts worker-configuration.d.ts
npm run worker:check
```

To see the individual test results in the research environment:

```bash
node --import tsx tests/model.test.ts
node --import tsx tests/lifecycle.test.ts
node --import tsx tests/projection.test.ts
node --import tsx tests/avatar.test.ts
node --import tsx tests/camera.test.ts
node --import tsx tests/assets.test.ts
node --import tsx tests/playlist.test.ts
node --import tsx tests/media.test.ts
```

With local Wrangler running and room slots free:

```bash
node tests/api.integration.mjs
node tests/playlist.integration.mjs
node tests/fixes.cjs
node tests/capacity.cjs
```

Browser scripts prefer a local Playwright installation, then the cloud runtime installation. Set `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_EXECUTABLE_PATH` to override these; without a system Chromium they use Playwright’s browser. Keep generated evidence outside the checkout: create `/workspace/review-chill/evidence`, change to `/workspace/review-chill`, then run `node /workspace/Chill-With-Me/cinema/tests/fixes.cjs`. The local Worker must already be running. They mock YouTube and speech, while exercising the local backend and real DOM iframe geometry. Never run destructive room tests on production. Older `browser.cjs`/`realtime.cjs` predate the fullscreen UI; `fixes.cjs` is the current regression suite.

## Deployment

After Cloudflare authentication: `npm run build` then `npx wrangler deploy`. Config: `wrangler.jsonc`; SQLite migration `v1`; `ROOMS` binding. Change Worker name for an independent deployment. GitHub push alone does not deploy.

The current public alpha instead uses `scripts-bundle.mjs` and the connected Cloudflare API. That script embeds gzip assets; preserve `encodeBody: "manual"`. Requests for these assets count against Worker quota. Static Assets through Wrangler is the intended regular deployment path.

No production credentials or voice recordings belong in Git. The room geometry is procedural; installed KayKit avatar files and their CC0 license are under public/models. The asset catalog marks installed models separately from candidates.

## Quality checks and device pilot

The 3D lobby previews three doors and the selected male/female character. Room avatars use KayKit rigged GLB models with native idle/walk/sit clips and a bounded wave overlay; each member has an independent cloned skeleton. Original procedural avatars remain the per-model failure/loading fallback. Camera presets: first-person, overview, shoulder and social side view. Camera position/aim/lens interpolate and respect reduced-motion settings; every preset retains the same native YouTube player.

`node tests/capacity.cjs` requires all three **local** slots free. It opens 30 independent cookie sessions/WebSockets, verifies room capacity and chat broadcast, rejects an extra guest, and closes its own rooms. Its timing excludes real video, 3D rendering, WAN latency and sustained-load behavior.

Before calling the alpha production-ready, run on actual iOS Safari and Android Chrome: join using separate devices, tap playback after autoplay is blocked, test pause/seek/reconnect/background/foreground, an embed-restricted video and an ad, then select a Vietnamese voice, read several chat messages, stop speech midway and confirm video volume restores. Test touch dragging, first-person/overview/light views and landscape controls. Automated YouTube/speech mocks do not prove those device behaviors.

## Avatar files and reproducible preparation

Runtime files live in `public/models/`: `male.glb` (Knight), `female.glb` (Mage), original `LICENSE.txt` and `manifest.json`. Source: KayKit Adventurers 1.0 by Kay Lousberg, CC0. The manifest pins the upstream commit, source/optimized SHA-256 checksums, tool versions and size budgets. Each model is under 350 KB on disk and approximately 131 KB gzip. Models are served by this app, without a third-party runtime CDN. New/pending member records retain avatar choice; missing values from older sessions default to male. Voice selection remains independent from avatar choice.

No asset tooling is needed for ordinary `npm ci` / build. To regenerate assets, download the two source URLs in the manifest into a temporary directory. Install offline tooling outside the app checkout:

```bash
npm install --prefix /tmp/cinema-model-tools --no-audit --no-fund @gltf-transform/core@4.2.1 @gltf-transform/functions@4.2.1 @gltf-transform/extensions@4.5.1
AVATAR_TOOLS=/tmp/cinema-model-tools node tools/prepare-avatars.mjs /path/to/original-glbs
```

The tool verifies the expected original checksums, retains five needed clips, removes weapons/loose accessories, and optimizes/prunes the GLB data. Keep the manifest/checksums and model tests aligned when intentionally changing this pipeline.

## Embedded release verification

`scripts-bundle.mjs` now includes all recursive dist files, including GLB, manifest and license; it preserves manual gzip encoding and GLB MIME. For local validation of the embedded API deployment variant:

```bash
npm run build
node scripts-bundle.mjs
node tools/embedded-config.mjs
npx wrangler dev --local --config .wrangler/embedded-check.json --port 8788 --persist-to .wrangler/embedded-state
# In another terminal, from cinema/:
node tests/artifact.integration.mjs
```

Use `wrangler.jsonc` for regular Static Assets deployment. The generated embedded-check config is for local tests only. Deployment target remains Worker `cung-xem-cinema-alpha`, account `966c7ceee358485648b935a07877ec45`, SQLite `RoomSlot`, migration `v1`. No data reset or new migration is needed for optional avatar metadata.

The current cloud session lacks Cloudflare authentication. A noninteractive deployment requires `CLOUDFLARE_API_TOKEN`, entered securely in Environment settings, scoped to the existing account with the needed Workers permissions. Never put its value in source or chat. Once configured, deploy from cinema/ with `CLOUDFLARE_ACCOUNT_ID=966c7ceee358485648b935a07877ec45 npx wrangler deploy --config wrangler.jsonc`, then verify production HTML/assets/models and room summaries read-only. Never run room mutation tests against production.

## Playlist approval and ordering

Hosts can move queued items up/down using keyboard-accessible 44px buttons; the current video/timeline is unchanged. Viewers can suggest at most three pending videos, with a 10-second per-member cooldown. Only the host may approve/reject; approval appends once through the existing commandId idempotency path. Reorder and current-client removal carry a queue revision, so a stale operation reports a conflict, fetches a fresh snapshot and waits for a new user action. It never silently replays the edit. Invalid submits retain the URL. Older room JSON defaults to an empty suggestion list and queue revision zero.

`node tests/playlist.integration.mjs` uses local slot 2, preserves pre-existing rooms and closes its own test room. `tests/playlist.test.ts` covers roles, cooldown/bounds, duplicate acceptance, stale/full queue behavior and cleanup on leave/kick/expiry. The browser report also records the actual foreground idle-render frame count while mocked video continues to advance; that is an on-demand rendering check, not a real-device FPS certification.

Head-control cancellation is verified for held D-pad blur and secondary-button pad dragging. Rig gaze interpolates in elapsed time and snaps to its exact target at rest; reduced-motion bypasses the interpolation. The browser suite checks changed/non-neutral head bones and matching diagnostics in the peer renderer. Current roadmap completion/gaps: [implementation plan](../docs/KE_HOACH_TRIEN_KHAI_HIEN_HANH.md).

## Shared video and audio files

The player accepts YouTube, public Google Drive file links, and direct HTTPS `.mp4`, `.webm`, `.ogv`, `.mov`, `.m4v`, `.mp3`, `.m4a`, `.ogg`, `.wav` URLs (including signed query strings). Other embed sites, HLS/DASH playlists and arbitrary URLs without a media extension are not supported. MOV is a container: H.264/AAC MOV was verified in Chromium; HEVC/ProRes and other codecs depend on the browser and are rejected visibly when unsupported. Media is never recompressed or upscaled; playback uses the original bytes and native browser buffering/range requests.

Hosts can select a local file to start or append to the queue. Files are limited to 100 MiB each and 250 MiB total held by the sender. Keep the sender tab open. The client attempts an ordered/reliable WebRTC DataChannel transfer with a public STUN server; no TURN service is configured. If UDP/NAT/policy prevents that, viewers can choose **Nhận qua phòng** for files up to 25 MiB. This explicit fallback relays 16 KiB binary chunks through authenticated room WebSockets, with 256 KiB acknowledgment windows, exact sequential offsets, size/session/owner/recipient checks and timeouts. Relay traffic consumes Worker/DO resources; production quotas and sustained multi-room file throughput have not been established. Playback begins after the receiver has the complete file, then catches up with the room. Use a public streaming URL for larger or long media.

The Worker stores **metadata only**, in the existing single room JSON row. There is no file/blob table, R2 bucket or upload object. `Next`/native `ended` replaces/removes the current item from persisted state, without adding a played-file history. The clients revoke the old Blob URL, release file/chunk references, stop the previous native media element and close transfer connections. Queue removal, leaving/closing a room and membership changes also prune resources. A reload loses local file handles: the original owner must select the same file again; completed recipients may keep playing until the item changes. Expiry/close clears the room state. The small command dedupe table remains bounded to 200 IDs and contains no file bytes or media metadata.

Google Drive may refuse browser playback because of CORS, download confirmation, quota or sharing rules. The supplied sample downloaded as a 9,610,467-byte H.264/AAC MP4, but actual Chromium playback was denied by missing CORS. The app offers an explicit Drive preview fallback: **each person controls that preview independently; it has no room synchronization or automatic ended/Next API**. Download a permitted file and share it locally, or use a direct public media URL, for the synchronized native player. Do not treat preview playback as synchronized.

Additional local checks (never target production):

```bash
node tests/media.cjs             # slot 3; ffmpeg + Chromium required
node tests/relay-security.cjs    # slot 2; binary transfer ACL/order/size/expiry
node tests/render-capacity.cjs   # slot 2; one real renderer, ten models; run alone
node --import tsx tests/media.test.ts
```

`media.cjs` decodes real generated WebM, MP3 and H.264 MOV in two isolated browser profiles, compares received bytes by SHA-256, checks native play/pause/seek/ended, mixed queue, speech-volume duck/restore, Blob URL revocation and removal from persisted room state. Drive failure/preview uses a controlled fixture. Managed Chromium disables non-proxied WebRTC UDP, so successful file transfer is verified through the explicit room relay; WAN WebRTC/TURN connectivity is not certified. `evidence/media.json` and `evidence/render-capacity.json` record these boundaries. The render smoke verifies idle stops rendering, and records software-renderer frame timings; its pass flag is not a physical-device FPS gate.
