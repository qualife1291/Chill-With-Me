# Roadmap và acceptance · 14/11/2026

Trạng thái/source/version và bằng chứng: [PROJECT_STATE](../PROJECT_STATE.md). Lệnh/giới hạn: [runtime README](../cinema/README.md). [Architecture](ARCHITECTURE.md) chỉ tới code/test theo task. Lịch sử mốc đã đóng nằm trong Git; archive/V2/V3 là đề xuất lịch sử.

## Hợp đồng release

3 phòng, 2–10 người gồm host; server giữ admission, cookie/session/epoch/connection, host/player ACL, dedupe và revision CAS. Native media giữ identity qua camera/Hold/sheet. Không byte media/recording/history trong DB; tài nguyên client được thu hồi. UI một sheet, ≥44px với nút thao tác, keyboard/focus/modal và safe-area. Mutation tests chỉ local, ba slot trống; build và browser/load chạy tuần tự. Push không tự deploy.

Release đúng Worker/account/binding trong PROJECT_STATE, không reset phòng, đổi billing hoặc tác động Worker khác. Chỉ xác nhận release sau CI và GET byte/header/API khớp artifact. Test giả lập/GPU phần mềm không thay pilot phần cứng hay quota/WAN.

## Lát cắt game + StyleX hiện tại

- [x] Năm skill game có provenance, áp dụng với planner/frontend/QA/security/clean code; validator kiểm 37 skill và checksum upstream.
- [x] Rule packs `oaq-cwm-1` và `loto-cwm-1` có [luật chuẩn](GAME_RULES_V1.md), phân biệt nguồn văn hóa/house rules; Ô 2 người + khán giả, lô tô 2–10, không tiền/thưởng.
- [x] Pure rules, RNG server, DTO giấu deck/vé khác kể cả host, host/player ACL, CAS/ABA, pause/resume, disconnect/reload/host succession và cleanup.
- [x] UI lazy 2D, bàn Ô dọc trên phone, lô tô auto-mark/Kinh, game sound opt-in; không thêm renderer, không remount video hay đổi Hold. Giao diện dùng palette gỗ/nỉ/đá do dự án tạo, không lấy asset thiếu license.
- [x] 16 test luật/security: golden fixtures, 80 seeded legal-game simulations bảo toàn quân, 500 vé hợp lệ, RNG/deck, atomic failure, lifecycle và media invariants.
- [x] Tìm đúng Meta StyleX, pin compiler/runtime/peer, áp dụng [pilot tokens/luật game](DESIGN_SYSTEM.md), CSS biên dịch và runtime injection tắt; giữ MIT notices.
- [x] Thêm chẩn đoán native video theo yêu cầu, một mẫu 8 giây, không telemetry nền; dừng khi đóng/hidden/đổi nguồn/rời.
- [x] Nghiệm thu bản cuối nhiều profile, mobile/landscape/keyboard/reduced motion, chat/admission, reload/transfer, player/Hold, actual native diagnostics và toàn bộ hồi quy local.
- [ ] Review diff/license/security, docs links/skill hashes, push, CI Node 22/24, deploy đúng Worker và GET verification.
- [ ] Pilot luật với người chơi quen Ô ăn quan/lô tô; usability và pin/thermal trên thiết bị thật. Không gọi game là đã được chuyên gia văn hóa chứng nhận.

## Khả năng đã có source và test local

| Nhóm | Phạm vi | Chủ sở hữu chi tiết |
|---|---|---|
| Room/lifecycle/private | 3 slot, approve/kick/ban, invitation rotation/redaction, reserve/reconnect/silent lease/TTL, designated successor, takeover | architecture + runtime README |
| UI/3D | KayKit CC0 nam/nữ, appearance trước admission, cinema/sofa 1–3 hàng, cinema/lounge/rooftop, eye/free orbit, touch/pinch/keyboard, một world screen 8.8×4.95, depth mask và stable iframe | architecture + model manifest |
| Resource control | demand renderer, hidden pause, batching/rig cache, personal Auto/Economy/Detail, reduced motion/context-loss fallback; không cam kết FPS/pin từ software GPU | runtime README + evidence |
| Media/queue | native HTTPS/local audio/video, finite HLS VOD, Drive preview có giới hạn, import/reorder/suggest CAS, server clock/RTT, cleanup ended/Next/remove/leave | runtime README |
| Social/audio | centered approval dialog, closed-chat preview, recipient poke, anonymous bounded emotions/fireworks, device TTS, priority ducking, personal Hold/ambience/lights | runtime README |
| Watching/presentation | opt-in camera pulse/Wake Lock, host-only Media Session, local VTT, lazy PDF/ảnh + bounded raster/relay/cancel/cleanup, explicit return to film | runtime README + presentation tests |
| Security/developer | strict types/unused checks, URL/body/relay guards, static headers, pinned dependencies/licenses, sequential full runner and Node 22/24 CI | security review + evidence |

Bảng này không nhân bản kết quả/count/source release. Các report current nằm trong PROJECT_STATE và `cinema/evidence/`.

## Công việc tiếp theo có thể triển khai

1. **Shared focus timer:** host start/pause/reset, deadline từ room clock, chỉ broadcast transitions, không ghi mỗi giây; reconnect/hidden/transfer/CAS và Hold. Giao diện gọn, completion im lặng mặc định.
2. **Game polish:** pilot rule packs, animation rải hữu hạn giữ accessibility/reduced motion; TTS gọi số opt-in dùng hàng đợi riêng có ưu tiên và cancel để không đè chat; pause/host transfer được kiểm lại. Chưa nhập engine multiplayer/WebGL thứ hai.
3. **Conversation cards/mood opt-in:** không suy đoán cảm xúc, không lịch sử riêng tư, chọn đề tài và bỏ qua dễ dàng; xem [product direction](ADVANCED_EXPERIENCE.md#chill-with-me-product-direction--researched-2026-11-13).
4. **StyleX mở rộng chọn lọc:** component có lợi ích variants/theming rõ ràng, kiểm cold-load tokens/CSS scope/bundle và keyboard/mobile. Không rewrite toàn app chỉ đổi cú pháp.

## Lễ và ngày/đêm realtime

- [x] Nghiên cứu 18 chủ đề, lịch dương/âm, nguồn/license, timezone/clock, ưu tiên trùng dịp, UI và budget tại [SEASONAL_EXPERIENCE](SEASONAL_EXPERIENCE.md).
- [ ] Core theme opt-in/version/registry, Classic/Manual/Auto; đầu tiên ngày/đêm/Noel/Tết dương, one-minute visible timer và rollback Classic.
- [ ] Palette dịp Việt; registry lịch âm chỉ sau đối chiếu hai nguồn/version. Không coi Intl Chinese hay lịch nghỉ là lịch âm Việt; không tự suy giới tính/ý nghĩa cá nhân theo dịp.
- [ ] Prototype nhiều profile, stable player/Hold/camera, 320px/landscape/keyboard/contrast, asset/GPU/idle; pilot pin/thiết bị trước nâng mặc định.

Đây là nghiên cứu, chưa bật tự động runtime. Gate và phương án rõ ở tài liệu sở hữu; không gắn một ngày chưa kiểm chứng làm ngày lễ production.

## Gate còn mở

| Gate | Điều kiện để đóng |
|---|---|
| Thiết bị/UX | iOS Safari, Android Chrome, Chrome macOS M1, autoplay/ads/embed/caption/volume/touch/background, contrast/WCAG và người dùng thật; software GPU không thay được |
| Load/operations | sustained media/GPU/WAN/quota, DO hibernation/eviction, recovery và rollback drill thật; moderation/privacy/retention process |
| Account/domain/R2 | Suffix cần Dashboard, ảnh hưởng Worker khác; R2 cần activation. Không đổi account/billing. Optional temp-media core chưa wired route/binding/client |
| Full voice | provider/quota/budget, consent/enrollment/delete, signed audio và pilot quality/latency; không mic/call/clone production |
| External providers/share | rights/auth/CORS/device cho Spotify/Zing/Vimeo/phim; screen share cần TURN/SFU/WAN/quota plan; không extraction/DRM/ad bypass |
| Security policy | CSP/provider inventory và compatibility trước enforce; không lấy audit 0 làm pentest/chứng nhận |
| Advanced renderer | WebGPU/depth-mask/native DOM compatibility và hardware pilot; giữ WebGL nhẹ hiện hành |

Nguồn nghiên cứu ngoài game và acceptance: [ADVANCED_EXPERIENCE](ADVANCED_EXPERIENCE.md), [VIETNAMESE_GAMES](VIETNAMESE_GAMES.md). Gate chưa có quyền/tài nguyên vẫn được giữ mở, không đánh dấu toàn bộ roadmap hoàn tất.
