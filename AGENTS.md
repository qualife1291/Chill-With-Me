# Resume protocol

Read `PROJECT_STATE.md` first. Then use `rg` and the relevant file/row in `docs/ARCHITECTURE.md`. `cinema/README.md` owns commands/limits; the roadmap owns open acceptance gates. Do not preload research/archive docs or generated Worker types.

Preserve: 3 slots, 2–10 members including host, admission/role/session/connection guards; private capabilities only to host; atomic/revision-guarded queue edits. Keep native YouTube interactive and mounted across camera changes. Preserve embedded `encodeBody: "manual"`. No media bytes/recordings/credentials/build/runtime directories in Git. Never recover NVIDIA keys from chat. No billing changes or unrelated Workers.

All mutation tests are local. `npm run verify:local` needs a local Worker on 8787 and three free slots; runs stages sequentially. Do not edit/build concurrently with browser/load tests. Distinguish mocks, native codecs, software GPU, backend load and actual devices/production.

At handoff update changed facts in PROJECT_STATE, not duplicate status/memory files. Keep it concise, with pointers to evidence; never call the whole roadmap done while external/device/provider gates remain open.
