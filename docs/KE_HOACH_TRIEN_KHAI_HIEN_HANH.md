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
- [x] Review diff/license/security, docs links/skill hashes, push, CI Node 22/24, deploy đúng Worker và GET verification.
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
2. **Game polish:** pilot rule packs, animate sowing with accessible/reduced alternatives; device number/festive calling and 3D are implemented. Next: recorded-call pack with license/loudness/codec checks, optional richer finite sow traces; pause/host transfer stay guarded. Chưa nhập engine multiplayer/WebGL thứ hai.
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

## Game 3D và hô lô tô · 15/11/2026

- [x] Nghiên cứu R3F/Three.js, Tone.js/Howler, Web Speech và source hô số; ghi rõ license/nguồn đọc được, không giả là có gói hát tiếng Việt sẵn.
- [x] Chế độ bàn 3D dùng lại một renderer/context; Ô có quân nổi/ô chọn, lô tô có lồng cầu/bóng số/vé chính mình. Bàn phẳng và điều khiển ≥44px/bàn phím vẫn dùng được; không đổi luật/DTO/CAS.
- [x] Camera/viewport game độc lập thao tác cá nhân, native player/Hold/volume giữ identity; demand/finite motion/hidden/context-loss và reduced motion có fallback, không loop physics hay thêm renderer.
- [x] Hô số hoặc hô vui opt-in, lời gốc/nhạc tổng hợp hữu hạn; chỉ số mới nhất, không đọc lại snapshot/hidden/reconnect. Shared speech ownership để hô/chat không hủy nhầm nhau; mute/priority/pause/leave cleanup.
- [x] Fixture lời hô 1–90/variants và speech ownership/race; multi-profile privacy/ACL, 3D picking/rotation, desktop/320px/landscape, idle/resources/player identity, âm thanh thật với voice fixture được khai báo.
- [x] Hồi quy local, review UI/security/code/docs, push/CI và deploy/GET đúng Worker. Gói hát thu âm và pilot giọng/thiết bị thật vẫn cần bằng chứng riêng.

## Sảnh chọn game, âm nhạc và hiệu suất · 15/11/2026

- [x] Đo trước/sau cùng workload: chọn ô và 16 pose của người khác khi game 3D mở; giữ snapshot cảnh rạp ẩn, chỉ animate lô tô khi có số mới, không GPU loop cho thay đổi tĩnh.
- [x] Sảnh chọn Xem chung / Ô ăn quan / Lô tô; chọn slot rồi mới nhập profile; tạo room + game lobby nguyên tử, legacy watch mặc định, public badge đúng game và private không lộ hoạt động.
- [x] Nhạc nền gốc opt-in, buffer mono 12s/24kHz ≤1.2MB steady, loop native không timer từng nhịp; cùng AudioContext, mute/voice duck/priority/hidden/pause/session cleanup; không provider/billing.
- [x] Âm chọn ô/rải/ăn/gọi số/kết quả hữu hạn, toggle cá nhân; gọi số mới không làm chat chờ bị khởi động rồi hủy nhầm.
- [x] Unit/schema/privacy/atomic create; browser nhiều profile, mobile/keyboard/hitbox, nhạc/voice/cleanup/context/player identity và phép đo lặp lại. Hồi quy đầy đủ đạt 52/52 bước, 147 ca logic; review docs/code, push/CI Node 22/24, deploy đúng Worker và GET 226 public assets đều đạt.

## Ma trận trình duyệt/thiết bị · 15/11/2026

- [x] Khảo sát engine và phần cứng thực có; chạy Chromium/Firefox/WebKit Linux nếu khởi động được. Không gắn UA/viewport giả lập thành Safari/iPhone/Mac thật; không provision dịch vụ thiết bị trả phí.
- [x] Ma trận phone hẹp/phone lớn/ngang/tablet/laptop/desktop/DPR 1–3, pointer chạm/chuột/bàn phím; sảnh, tạo/phê duyệt phòng, từng sheet/cảm xúc, game phẳng/3D, chat/composer khi viewport thấp, reduced motion/layout tương đương zoom (không giả là OS/browser zoom thật). Chụp ảnh, đo hitbox/overflow/overlap và giữ player/context.
- [x] Đo có lặp lại: navigation/resource timing, frame thừa khi idle/đổi sheet/chọn ô, CPU/heap/DOM khi có API, buffer/decoder native, nhạc/hidden/resume. Chromium có workload CPU/network hạn chế được ghi rõ mô phỏng; không suy ra pin/FPS phần cứng.
- [x] Tái hiện và sửa lỗi có bằng chứng, kiểm tra trước/sau và hồi quy liên quan; cập nhật evidence/tài liệu/runner ngắn gọn. Nếu có runtime fix thì chạy đủ release gate, push/CI/deploy/GET Worker hiện có.
- [ ] Pilot vật lý iOS Safari, Android Chrome và macOS M1: FPS/pin/thermal/acoustics, keyboard/IME/safe area/OS autoplay. Chưa có thiết bị kết nối thì giữ gate mở và cung cấp cách đo tái lập.

### Rút ngắn vào game (ưu tiên theo góp ý)

- [x] Một nút trên thẻ hoạt động mở tạo phòng ngay; form game hiển thị tên và CTA trước, nhân vật/cấu hình phòng trong disclosure, chỉ tải preview khi mở. Watch giữ tương thích; ngoại hình vẫn chốt trước admission.
- [x] Public game card có Chơi cùng / Vào xem. Intent chơi rõ ràng gắn với game ID ở server lúc xin vào; duyệt thì join ván lobby nguyên tử nếu còn chỗ. Không tự join sau khi đổi ván hoặc ván bắt đầu; không bỏ duyệt khách, không tự start. Lời mời/private không lộ game trong summary.
- [x] Giao diện lobby ván có một CTA chính Bắt đầu, thông báo chờ bạn rõ; các lựa chọn nâng cao không tranh chỗ CTA. Test đếm bước/không cần mở menu, spectator/round-race/capacity/ACL + ma trận trình duyệt bên trên.
