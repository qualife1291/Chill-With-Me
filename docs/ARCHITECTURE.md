# Runtime architecture

Current behavior and open gates: [PROJECT_STATE](../PROJECT_STATE.md). Commands and limits: [runtime README](../cinema/README.md). Read only the row relevant to the task.

| Change | Entry points | Preserve |
| --- | --- | --- |
| Room/admission/roles | `shared/model.ts`, `worker/index.ts` | 3 fixed slots; host included in 2–10 capacity; approved-cookie membership; epoch/connection checks |
| Home / seating | main entry dialog, `shared/model.ts`, `worker/index.ts`, `Cinema.tsx` | No profile before intent; create-only seating choice; legacy cinema default; optional appearance chosen before admission, retained on reconnect; no in-room editor/command; shared sofa geometry retains seat anchors/capacity |
| Private invitations | `shared/model.ts` view/summary/requestJoin, `InvitationControls.tsx` | Redacted public summary; capability only in host DTO; invite token in URL fragment; rotation clears pending, keeps members |
| Playlist | `shared/playlist.ts`, model apply, `PlaylistImport.tsx` | Parse the whole batch before mutation; max 20/16 KiB; queue max 50; expected revision; no automatic stale-command replay |
| Playback | `Player.tsx`, `NativePlayer.tsx` | Native YouTube iframe remains interactive; changing camera never remounts media; only host mutates play/pause/seek/Next; generation rejects stale ended |
| Clock | `shared/clock.ts`, `useRoomClock.ts` | Nonce/socket/session-bound probes; monotonic midpoint/min-RTT estimate; bounded fresh samples; unpaired snapshots only bootstrap |
| Local media | `FileShare.ts`, `shared/fileSignal.ts`, `shared/fileRelay.ts` | No bytes in DB; owner/current-item/current-recipient guards; sequential cursor and backpressure; cleanup old blobs/handles/connections |
| 3D/view/actions | `Cinema.tsx`, `ModelAvatar.tsx`, `AvatarPreview.tsx`, `RoomControls.tsx`, `shared/avatar.ts`, `shared/projection.ts`, `useHeadDrag.ts` | Clone skeletons, share geometry; bounded/smoothed gaze; demand rendering; native player stays mounted; reduced motion/fallback; wheel zoom; one world screen with DOM below depth-masked WebGL; no automatic dock; floor-matched aisle path |
| Temporary storage foundation | `worker/temp-media.ts`, `tests/temp-media.test.ts` | Unwired optional core; current+next local references, 100/250 MiB bounds, private Range, 6h absolute TTL, durable deletion tombstones/retries; requires routes/client/binding/real R2 tests |
| Chat/device speech | main WS handlers, `useChatSpeech.ts` | Optimistic idempotent fallback; bounded history/seen IDs; cancelled speech cannot duck audio; restore manual volume safely |
| Panels/dialogs | main panel state, `useModalFocus.ts`, CSS | Nonmodal Escape/focus restoration; modal inert background and full keyboard loop, including details/textarea; required start cannot be deferred |

Paths above are relative to `cinema/src` unless prefixed `shared/` or `worker/`.

## Data and trust boundaries

The gateway issues an opaque HttpOnly cookie and hashes it to a public member ID. It overwrites forwarded identity headers and rejects cross-origin writes/WebSocket upgrades. Each SQLite Durable Object stores one current room JSON row, bounded command IDs/timestamps and a short throttle table. No uploaded media bytes or voice recordings are persisted. There is no migration for optional room metadata; legacy rooms default to public.

Private rooms use an independent random invitation capability, not the room epoch. The fixed lobby still reveals that a slot is occupied, but hides title/capacity/member count. Only a valid link can create a pending request; host approval remains mandatory. Existing admitted/pending cookie holders can resume. Explicit rotation cancels old pending requests; ordinary approved members receive no capability. This is capability-based admission, not end-to-end encryption or an account/login system.

Peer poses are ephemeral WebSocket data, cached in the browser by room epoch/member and refreshed every 2 seconds for late joiners. Older room snapshots cannot replace a live pose; identical heartbeats do not rerender. Poke commands use the normal authenticated command path, approved-peer targeting and a 3-second actor cooldown.

The Worker coordinates playback time and source identity, not codecs or decoding. Remote HTTPS media loads directly in each browser. Local files attempt reliable WebRTC; the explicit bounded WS fallback is tested where managed Chromium blocks UDP. The current file starts after full receipt, then catches up. Removing/finishing the item drops DB metadata and client resources. Drive preview is explicitly unsynchronized and has no ended API.

Clock estimates use the lowest RTT among up to eight samples younger than 60 seconds. Nonces are single-use and tied to socket plus epoch. Native and YouTube players read a stable monotonic server-time callback; camera/avatar wall-clock offsets are quantized to 10 ms to avoid idle redraws from tiny clock noise. Asymmetric network paths remain an estimation limit, not a certified drift bound.

The screen dimensions/plane/corners live in `shared/projection.ts`. The camera always applies homography to the single DOM player; invalid/behind-camera projections are hidden while media stays mounted. The Canvas has alpha enabled, an opaque scene background and a transparent NoBlending depth-writing screen plane; foreground geometry keeps its opaque pixels, so video cannot paint over heads. Canvas pointer events pass through to the native player. Light mode is explicitly flat. Avatar materials clone per instance, recolor only pinned atlas UV cells, and dispose clones without disposing shared maps/geometry.

## Verification boundaries

[Current plan](KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) separates implemented source from device/provider/deployment gates. Browser UI tests mock YouTube/speech; native media tests decode generated WebM, MP3 and H.264 MOV and compare transferred bytes. The 10-avatar SwiftShader test is a rendering smoke, not a device FPS gate. Capacity tests cover 30 backend sockets, not 30 rendered media devices. All mutation tests run locally.

Keep `encodeBody: "manual"` in the optional embedded gzip release. Deploy only the existing Worker/account in PROJECT_STATE; never reset production rooms or change billing to run a test. The older proposed stack is [archived](archive/STACK_VA_KIEN_TRUC_V2.md).
