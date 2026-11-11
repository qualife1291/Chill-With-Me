# Advanced experience · implementation decisions

Current facts: [state](../PROJECT_STATE.md). Commands/limits: [runtime](../cinema/README.md). This is a feature design and acceptance map; a proposed row is not a shipped feature.

| Priority | Feature | Implementation / acceptance |
| --- | --- | --- |
| Done | Fireworks | Three timed launches, 54 capped sparks; whoosh/boom/chime/crackle; mute cancels pending sources; no replay on duplicate/rejoin; reduced motion; offline waveform + two-client checks |
| Next | HLS VOD | Native HLS where available; lazy hls.js/MSE fallback; HTTPS/CORS only; adaptive/manual rendition selection local to each viewer; host playback ACL/timeline retained; engine/worker/buffers destroyed on source change; real generated multi-rendition and failing-manifest tests |
| Next | Camera presets | Close screen / balanced cinema / whole room, preserving eye/free-orbit; bounded transforms, smooth transitions, no iframe remount; portrait/landscape and touch/key tests |
| Next | Device-aware effects | Personal Auto/Full/Quiet; fewer particles on compact touch/Save-Data; quiet/reduced-motion retain status; no continuous 3D loop; verify actual DOM/animation budgets |
| Next | Playful reactions | Bounded floating meme captions + staccato cue for existing troll reaction; no new wire enum or directed abuse; cooldown, mute, expiry and reduced motion unchanged |
| Later | Live HLS/DVR | Requires stable shared time origin/PDT, seekable-window reconciliation, discontinuity/rollover handling and late-join semantics. Do not advertise normal VOD position sync as live sync |
| Later | DASH/other providers | Assess Shaka/provider SDK per service; DRM/auth/ads/embedding permissions remain provider-specific; no universal extraction proxy |
| Later | Adaptive 3D pressure | Sample active rendering only; exclude demand-idle gaps, context recovery and background frames; degrade Auto only with hysteresis, respect explicit quality; actual-device FPS/thermal pilot remains required |
| Later | Media diagnostics | Decoder/codec hints, dropped frames, buffer/RTT summaries on demand. Capability hints cannot certify this device's real playback or source format; no continuous telemetry upload |

## Source decisions (primary references, checked 2026-11-11)

- [hls.js official repository](https://github.com/video-dev/hls.js): browser MSE/ManagedMediaSource client with native Safari alternative. Every requested manifest/segment/key must be fetchable with appropriate CORS; no server-side transcoding is created by adding the player. Load it only for HLS and preserve native media identity.
- [hls.js configuration](https://hlsjs.video-dev.org/api-docs/hls.js.hlsconfig) and [live sync position](https://hlsjs.video-dev.org/api-docs/hls.js.hls.livesyncposition): live safety delay/edge differs from a finite room position. VOD is the first supported streaming scope; live/PDT/DRM are explicit later gates.
- [MDN MediaCapabilities](https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo): supported/smooth/power-efficient are configuration hints; browsers can initially report optimistic values. Check actual decode and buffering before claiming smoothness.
- [MDN video frame callbacks](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback): compositor frame callbacks help validate native video progress; do not draw YouTube into canvas or extract its streams.
- [R3F performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance): keep demand rendering, shared geometry/materials and instancing. Idle elapsed time is not evidence of low FPS; do not switch renderers or add a second avatar loop for effects.
- [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay): retain explicit unlock/retry paths for audible media/WebAudio. Do not silently queue blocked fireworks or restart muted background audio.

## Verification / cost boundaries

Three rooms, 2–10 members, native YouTube, private capabilities, host-only shared timeline and no microphone remain fixed. Personal quality, camera and effects do not mutate room playback. Downloads remain direct browser-to-provider; room storage holds metadata only. No billing/R2/provider provisioning or recovered NVIDIA keys.

All mutations stay local. Verify helpers, actual generated codec bytes, real MSE/native media lifecycle, two-client sync/ACL, slow network/error recovery, WebAudio cleanup and bounded CSS/3D work separately. Headless fixtures do not certify iOS/Android decoder quirks, speakers, thermal behavior, provider ads or WAN synchronization. Existing browser TLS/tunnel and Cloudflare upload-auth blocks remain separate environment/deployment gates.
