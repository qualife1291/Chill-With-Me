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

To see all 23 individual test results in the research environment:

```bash
node --import tsx tests/model.test.ts
node --import tsx tests/lifecycle.test.ts
node --import tsx tests/projection.test.ts
node --import tsx tests/avatar.test.ts
```

With local Wrangler running and room slots free:

```bash
node tests/api.integration.mjs
node tests/fixes.cjs
node tests/capacity.cjs
```

Browser scripts prefer a local Playwright installation, then the cloud runtime installation. Set `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_EXECUTABLE_PATH` to override these; without a system Chromium they use Playwright’s browser. Keep generated evidence outside the checkout: create `/workspace/review-chill/evidence`, change to `/workspace/review-chill`, then run `node /workspace/Chill-With-Me/cinema/tests/fixes.cjs`. The local Worker must already be running. They mock YouTube and speech, while exercising the local backend and real DOM iframe geometry. Never run destructive room tests on production. Older `browser.cjs`/`realtime.cjs` predate the fullscreen UI; `fixes.cjs` is the current regression suite.

## Deployment

After Cloudflare authentication: `npm run build` then `npx wrangler deploy`. Config: `wrangler.jsonc`; SQLite migration `v1`; `ROOMS` binding. Change Worker name for an independent deployment. GitHub push alone does not deploy.

The current public alpha instead uses `scripts-bundle.mjs` and the connected Cloudflare API. That script embeds gzip assets; preserve `encodeBody: "manual"`. Requests for these assets count against Worker quota. Static Assets through Wrangler is the intended regular deployment path.

No production credentials or voice recordings belong in Git. Scene/avatar geometry is procedural; the asset catalog is a shortlist, not downloaded licensed assets.

## Quality checks and device pilot

The scene uses an original articulated procedural avatar (no third-party model download): walk along the aisle, turn into the row, blend into sitting, and wave via the shared room state. The centered overview uses a wider lens and lower aim to show the room. First-person hides the local avatar; light mode retains the same YouTube player.

`node tests/capacity.cjs` requires all three **local** slots free. It opens 30 independent cookie sessions/WebSockets, verifies room capacity and chat broadcast, rejects an extra guest, and closes its own rooms. Its timing excludes real video, 3D rendering, WAN latency and sustained-load behavior.

Before calling the alpha production-ready, run on actual iOS Safari and Android Chrome: join using separate devices, tap playback after autoplay is blocked, test pause/seek/reconnect/background/foreground, an embed-restricted video and an ad, then select a Vietnamese voice, read several chat messages, stop speech midway and confirm video volume restores. Test touch dragging, first-person/overview/light views and landscape controls. Automated YouTube/speech mocks do not prove those device behaviors.
