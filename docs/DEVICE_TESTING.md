# Browser/device testing

Results belong in [PROJECT_STATE](../PROJECT_STATE.md) and `cinema/evidence/device-matrix*.json`; this file owns reproduction and interpretation. [Runtime commands](../cinema/README.md) own installation/start instructions. Mutations are restricted to localhost:8787; keep three slots free. No edits/builds during browser/load tests.

## Reproduce

Use the QA Playwright install described in the runtime README; install the requested browser binaries and their OS libraries. App dependencies/lockfile do not need Playwright. `tests/browser-runtime.cjs` supports the managed install or `PLAYWRIGHT_MODULE_PATH`; `CHROMIUM_EXECUTABLE_PATH` selects an existing Chromium/Chrome binary.

```sh
cd cinema
npm run build
# Separate terminal: npm run serve -- --local --ip 127.0.0.1 --port 8787
node tests/device-matrix.cjs
npm run verify:devices
node tests/device-matrix.cjs --engines=firefox,webkit --profiles=laptop
```

Default: three Chromium profiles; extended: 12 viewport/input profiles on three engines plus one constrained Chromium profile (37 total). Explicit `--profiles=` selects known profiles. Run sequentially. Firefox uses a configured DISPLAY when present; on Linux, headless Firefox may lack WebGL, so use a desktop/Xvfb for the 3D gate. Linux WebKit requires its platform libraries. Missing engines/dependencies or zero profiles fail, never count as a pass.

Current managed run uses temporary browser binaries/libraries, Xvfb and an isolated PulseAudio null sink in `/tmp`. Firefox's AudioContext stayed suspended with no audio output even after a real click; the virtual sink made it run with normal autoplay policy. This proves graph/lifecycle behavior, not audible quality. `PLAYWRIGHT_BROWSERS_PATH`, DISPLAY, library paths and PULSE_SERVER are QA environment settings, not app/runtime requirements. Do not infer Apple hardware from WebKit's privacy-masked `Apple GPU` renderer string on Linux.

## Matrix and observations

| Profile | CSS viewport | DPR/input |
|---|---|---|
| phone320 / phone360 | 320×568 / 360×800 | 2, emulated touch |
| phone390 / phone430 | 390×844 / 430×932 | 3, emulated touch |
| landscape | 844×390 | 2, emulated touch |
| tablet / tablet-landscape | 768×1024 / 1024×768 | 2, emulated touch |
| laptop / retina-size / wide | 1366×768 / 1512×982 / 1920×1080 | 1 / 2 / 1, mouse/keyboard |
| zoom200-equivalent | 640×450 | 2, mouse; layout equivalent to 1280×900 at 200%, not browser/OS zoom |
| reduced-motion | 360×640 | 2, emulated touch, reduced motion |
| constrained (Chromium only) | 360×740 | 2, touch; 4× CDP CPU delay, 150ms latency/3Mbps, 2-core/2GiB/Save-Data hints |

Two real browser contexts per profile use the actual local Worker. Check single-click activity entry, one required name input/no optional preview renderer, explicit play intent/host approval, one Start button, game/return shortcut, exclusive sheets, ≥44px targets, viewport/overlap/hit tests, chat/reactions, flat/3D picking controls, one-hand zoom buttons on small layouts, real mouse-wheel zoom on desktop and finite GPU frames. Chromium phone320 also dispatches native CDP two-finger pinch/one-finger drag and verifies camera movement without page zoom; this still does not emulate phone hardware/OS gestures. After resize, wait for the app’s rAF/visualViewport geometry update, then assert the same strict bounds/hit targets; record initial/settled heights. Portrait resize simulates keyboard space; it does not emulate an OS keyboard or IME. The laptop scenario additionally uploads/decodes original generated H.264/AAC 1280×720, keeps native video/renderer/Hold identity, samples a separate visible playback window, then tests music/pause/hidden and lô tô 3D.

Timings: local TTFB/DCL/FCP and create-click→game wall time include automation and software GPU. p50/p95 over the matrix are descriptive, not a production CWV/speed comparison between engines. Chromium reports CDP heap/task/layout counters and long tasks; unsupported counters are null. GPU object counts and idle/selection/peer-pose frames are structural measurements. Native startup totals and the separate visible-frame window have different meanings; neither certifies physical playback FPS or battery. Diagnostics are enabled; visibility/resource hints are declared fixtures. JSON records base commit/worktree dirty state and index build hash for attribution before the evidence commit.

## Regressions covered

- Quick create buttons/input below 44px; short landscape footer covering optional settings → entry target/size/hit/alignment checks and screenshots.
- Fast game entry while the automatic walk-to-seat is still active → hidden avatar rigs must stop frame work immediately, rather than waiting for their five-second intro to finish. Camera/game/native media remain mounted; returning to the cinema resumes the current pose.
- Empty video source + a queued item required opening View to find Next → host can start directly from Playlist. Contextual return button opens the active game in one click without adding a second sheet.
- `AudioContext.resume()` can stay pending without an output device → bounded/cancellable shared resume helper, one pending sound-unlock attempt, visible music retry; dedicated pending/late-resolution fixture and pure cancellation tests.

QA synchronization: Hold measurements await both initial persisted-gaze responses; spectator CTA locators wait for summaries after reload. WebKit resize regression and three-repeat evidence: `cinema/evidence/viewport-resize.json`. These waits synchronize known async work; they do not remove command/revision/bounds assertions.

## Physical pilot still required

Run on actual iOS Safari, Android Chrome and macOS M1 Chrome/Safari. Record model/OS/browser/build, real keyboard/IME and notch/safe areas, one/two-finger gestures and page zoom, autoplay/interruptions/audio routing, foreground/background/reconnect, 10-member scene and repeated game/media switching. Measure median/p95 input/presentation frames, battery/thermal over a sustained session and perceived audio quality using the same workload. A viewport, UA, virtual audio device or software renderer is not this pilot. Existing WAN/provider/quota/rollback gates remain separate.
