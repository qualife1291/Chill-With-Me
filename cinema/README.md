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

To see all 20 individual test results in the research environment:

```bash
node --import tsx tests/model.test.ts
node --import tsx tests/lifecycle.test.ts
node --import tsx tests/projection.test.ts
```

With local Wrangler running and room slots free:

```bash
node tests/api.integration.mjs
node tests/fixes.cjs
```

Browser scripts currently require Playwright at the absolute path declared at their top and Chromium `/usr/bin/chromium`; adapt these to your machine. They mock YouTube and speech, while exercising the local backend and real DOM iframe geometry. Never run destructive room tests on production. Older `browser.cjs`/`realtime.cjs` predate the fullscreen UI; `fixes.cjs` is the current regression suite.

## Deployment

After Cloudflare authentication: `npm run build` then `npx wrangler deploy`. Config: `wrangler.jsonc`; SQLite migration `v1`; `ROOMS` binding. Change Worker name for an independent deployment. GitHub push alone does not deploy.

The current public alpha instead uses `scripts-bundle.mjs` and the connected Cloudflare API. That script embeds gzip assets; preserve `encodeBody: "manual"`. Requests for these assets count against Worker quota. Static Assets through Wrangler is the intended regular deployment path.

No production credentials or voice recordings belong in Git. Scene/avatar geometry is procedural; the asset catalog is a shortlist, not downloaded licensed assets.
