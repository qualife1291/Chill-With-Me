# Resume state · 2026-11-14

Repo `qualife1291/Chill-With-Me`, app `cinema/`. Read this first, then one relevant row in [architecture](docs/ARCHITECTURE.md). [Runtime README](cinema/README.md) owns commands/limits; [roadmap](docs/KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) owns open acceptance; [read map](docs/INDEX.md) routes research. Do not preload archive/generated types or duplicate status documents.

## Contracts

- Three slots, 2–10 members including host; admission/session/epoch/connection guards, ACL, dedupe/CAS remain server-authoritative. Reserve 20s, reconnect 30s, lease 90s, pending 120s, room 24h. Expired host transfers only to designated live successor, otherwise closes; clock probes renew without heartbeat broadcasts.
- Pending sees no room; private summary/capability redaction stays intact. No media bytes/recordings/played history in DB/R2. Queue ≤50, import ≤20/16 KiB. Files ≤100 MiB/250 MiB sender-held; explicit WS relay ≤25 MiB, displayed source only, full receipt before play. Owner/tab required; cleanup on removal/end/leave. No TURN.
- Required initial activity can be media/document/game; approval preempts it. Keep native player mounted across camera/Hold/sheet. Hold mutes locally, never shared timeline; Drive preview is unsynchronized and cannot support Hold. Host film ACL/generation guards remain.
- Appearance immutable after admission; create-only space/seating. One depth-masked 8.8×4.95 world screen, no auto-dock; one demand renderer, idle/hidden stop, reduced motion and quality fallback. Main `sheet` owns all panels; reaction strip has its own lane. ≥44px controls, focus/modal/safe areas. No mic/call/clone production. Full limits live in runtime README.

## Current increment

**Games:** lazy 2D `GamePanel.tsx`; pure `shared/games/{oaq,loto}.ts`, protocol/roles/private DTO in `shared/games.ts`. [Rules](docs/GAME_RULES_V1.md): Ô two players + spectators; lô tô 2–10/private tickets/server crypto/90 numbers/≥3s draws, first complete row freezes and all simultaneous winners publish. CAS/ABA, pause, reconnect and departure handling; bounded current state, no history/media/Hold mutations. World GPU stops while sheet opens. Original CSS artwork and opt-in chime; number TTS/rule/device pilots remain open.

**Meta StyleX:** pinned runtime/compiler 0.19.2 + unplugin peer 2.3.11, shared semantic tokens/compiled GameRules pilot, runtime injection off, MIT notices. [Sources/decision](docs/DESIGN_SYSTEM.md); no whole-app speed claim. Pure rules/board extracted; unused locals/parameters fail TypeScript. [37 skills](docs/AGENT_SKILLS.md): 29 user archive, three pinned official, five project-authored game skills; official hashes preserved.

**Local playback diagnostics:** view sheet, explicit 8s native-video sample (resolution/buffer/frame counters + RTT), no polling/upload/URL display; close/hidden/source/exit cancel. Iframes/audio have unsupported messages.

Prior finite HLS, local VTT, Media Session/Wake Lock, audio priority/Hold/ambience, bounded PDF/image relay/raster/cleanup remain documented in README/architecture. Optional temp-media core remains unwired. [Security review](docs/SECURITY_REVIEW.md) includes game privacy/RNG/resources, StyleX/licenses and audit snapshot 0 advisories, not a pentest.

## Verification

**48/48 local stages, 130 logic cases**, one uninterrupted sequential run: [aggregate](cinema/evidence/verification.json). [Games](cinema/evidence/games.json): four groups/three profiles/four viewport sweeps, 53 actual-cadence lottery draws, own-ticket privacy/ACL/CAS, reload/host transfer, stable iframe/Hold. Pure tests: 80 seeded games/500 tickets. [HUD](cinema/evidence/hud-layout.json): 87 checks/89 screenshots, seven DPR-2 viewports; game phone/landscape images additionally inspected. [Media](cinema/evidence/media.json): 22 groups, real codecs/relay bytes, diagnostics sample/cancel; [presentation](cinema/evidence/presentation.json): eight groups. [Lease](cinema/evidence/lease-soak.json): 100s/30 sockets/300 clock replies, no heartbeat broadcasts. [Resources](cinema/evidence/render-capacity.json): ten avatars, 88 calls/35 geometries/12 textures, idle zero. [Artifact](cinema/evidence/artifact.json): 225 assets byte/gzip/MIME/404/header checks.

Boundaries: software GPU/emulated viewports and declared YouTube/speech/OS fixtures; real native codecs/HLS/PDF/bitmap/WebAudio. Internet TLS/tunnel failures are not provider certification. Physical iOS/Android/M1, battery/thermal/acoustics, WAN/quota/sustained media and rollback remain open. Historical camera-settlement timeout not reproduced; cause unconfirmed. Mutation tests local only, three free slots, no edits/build during browser/load. Entry: `npm run verify:local`.

## Release and next work

Public: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/ . Deployed source `168931f`, version `28a4a2fc-00a2-4e91-931f-2ae5bb585a03`; all 225 public assets match tested bytes, four security headers/three summaries pass. Source CI Node 22/24 passed [run](https://github.com/qualife1291/Chill-With-Me/actions/runs/43625797753). [Production](cinema/evidence/production.json), [release metadata](cinema/evidence/deployment-attempt.json). Previous verified version `6831cc53-d4e6-4fe4-a652-cb6509bc8f59` retained; rollback drill not performed. Metadata-only follow-up commits do not change the deployed runtime. Push alone does not deploy.

Deploy only Worker `cung-xem-cinema-alpha`, account `966c7ceee358485648b935a07877ec45`, ROOMS/RoomSlot, SQLite migration v1; normal `wrangler.jsonc` Static Assets. Embedded PDF build exceeds conservative 3 MiB free-code gzip guard: local tests only, retain `encodeBody:"manual"`. Preserve room data/bindings/billing/unrelated Workers. Verify all public bytes/four static headers/three summaries with read-only GET after deploy.

Next: shared focus timer, rule/device pilots and optional number TTS, conversation cards/mood; [seasonal research](docs/SEASONAL_EXPERIENCE.md) covers 18 occasions + realtime day/night, not enabled runtime. Theme Core/verified Vietnamese lunar registry/two-source audit/device budgets remain open. R2 activation 10042, suffix Dashboard 10036/10405, TURN/SFU/WAN, voice consent/provider/budget, moderation/privacy and CSP/provider compatibility remain gates. Never recover NVIDIA keys from chat; preserve old experimental stash rather than reapply over newer runtime.
