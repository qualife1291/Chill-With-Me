> Tài liệu lịch sử; không phải trạng thái source hiện tại. Tiếp tục từ [PROJECT_STATE](../../PROJECT_STATE.md).

# Kế hoạch phát triển rạp xem chung — v3

Cập nhật: 01/11/2026. Bản này thay thế quyết định tự host/VPS của v1 sau khi người dùng xác nhận không có máy server và yêu cầu chi phí miễn phí. Tài liệu v1 được giữ tại `docs/archive/KE_HOACH_V1_TU_HOST.md` chỉ để tham chiếu lịch sử.

> **Cập nhật v3 ngày02/11/2026:** [Đặc tả rạp3D hiện hành](../THIET_KE_RAP_3D_V3.md) có ưu tiên nếu phần v2 bên dưới khác biệt. Giới hạn50/150, timeline2D và playlist ngoài MVP đã bị thay thế; số liệu budget cũ chỉ còn tham khảo.

## 1. Mục tiêu và ràng buộc đã chốt

- Web nghe nhạc/xem video cùng nhau từ một link YouTube trong mỗi phòng.
- Tối đa3phòng; host chọn2–10ghế/phòng, tính cảhost, tối đa30người. Giao diện rạp3D, avatar, camera mắt người/sau nhân vật; playlist và duyệt vào/kick thuộc MVP.
- Chat realtime bằng chữ. TTS đọc tin bằng giọng cá nhân đã đăng ký, hoặc preset nam/nữ khi chưa có profile.
- Không hỗ trợ voice call bằng mic. Mic chỉ dùng trong màn hình đăng ký mẫu giọng, có thao tác bắt đầu/dừng rõ ràng.
- Không có máy cá nhân chạy backend. Không thuê VPS/GPU/API, không tự nâng gói trả phí.
- Ưu tiên ổn định phim/chat khi đông người; TTS chạy độc lập, có queue và quota.
- Có yêu cầu deploy web. Ở lượt hiện tại ưu tiên hoàn thiện tài liệu/stack/timeline; deployment vẫn nằm trong mốc bàn giao, chưa thực hiện.

## 2. Kết luận khả thi

Phần xem chung, chat và quản lý 3×50 có hướng triển khai phù hợp bằng Cloudflare free tier, nhưng vẫn phải đo tải và quota thực tế. Không relay video; mỗi người xem YouTube trực tiếp.

Nhân bản giọng tiếng Việt miễn phí có source phù hợp, nhưng tài nguyên inference hosted là điểm chưa xác minh. Không có căn cứ để cam kết cloning không giới hạn, độ trễ thấp, 24/7 và hoàn toàn 0đ cho 150 người.

Đường chính đề xuất: Cloudflare Workers + SQLite Durable Objects cho core; VieNeu-TTS trên ZeroGPU Space của dự án nếu tài khoản/quota/API vượt gate. Khi chưa đạt gate, chỉ phát hành alpha core có TTS thiết bị, ghi rõ chưa có cloning. Không coi alpha là hoàn thành toàn bộ yêu cầu.

## 3. Bộ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [Stack và kiến trúc](STACK_VA_KIEN_TRUC_V2.md) | Quyết định công nghệ, room actor, admission, timeline, protocol, dữ liệu, TTS pipeline |
| [Timeline, backlog, nghiệm thu](TIMELINE_BACKLOG_V2.md) | Mốc 7–9 tuần, task IDs, dependencies, gate, test và deploy |
| [Ngân sách free tier](../NGAN_SACH_FREE_TIER.md) | Quota đã tra, mô hình tải, giới hạn TTS, ngăn phát sinh phí |
| [Quét source](BAO_CAO_QUET_SOURCE_VA_TOI_UU.md) | Các repo và đoạn code đã đọc, license, hướng tái sử dụng |
| [Source snapshot manifest](../../SOURCE_SCAN_MANIFEST.json) | Tree/commit SHA của lần khảo sát |

## 4. Stack chốt để làm prototype

| Thành phần | Lựa chọn |
|---|---|
| Frontend | React + TypeScript + Vite; static assets trên Cloudflare |
| Backend | Worker gateway + native WebSocket |
| Realtime room | 1 SQLite Durable Object cho mỗi room slot, Hibernation API |
| Room data | SQLite trong DO; không Redis/Postgres cho từng event |
| Tài khoản/giọng/file | Supabase Free, private storage và RLS; quota giới hạn |
| TTS | VieNeu Turbo, thử Nano nếu cần; provider adapter, không gắn chặt một dịch vụ |
| Inference hosted | ZeroGPU có điều kiện; bắt buộc feasibility test |
| Fallback | Web Speech API, chỉ giọng khả dụng trên thiết bị |
| Testing | Vitest + Workers test pool + Playwright + WS load harness |

Không chọn Socket.IO server thường trực của bản cũ. Không cần SSR, voice server, Kubernetes hay video transcoding. URL production dự kiến dùng workers.dev; chưa có URL đã deploy.

## 5. Source ưu tiên

1. Together: tham khảo room actor/WebSocket và mobile UI; phải sửa hibernation, không dùng nguyên stack nhiều dịch vụ.
2. WatchParty: tham khảo luồng host/player/chat, không bê virtual browser và media ngoài YouTube.
3. OpenTogetherTube: tham khảo tách state private/syncable, gửi delta; code AGPL cần tuân thủ license nếu tái sử dụng.
4. SyncTube và WatchSync: tham khảo timer/seek cooldown; không áp dụng cơ chế một viewer lag làm cả phòng pause.
5. VieNeu-TTS: thử giọng Việt preset/cloning; pin code/model và test thực, không lấy benchmark tác giả làm kết quả dự án.
6. SyncTV: tham khảo fanout/version; không chuyển sang cả stack Rust chỉ vì giả định sẽ nhanh hơn.

Repo đã được review tĩnh chọn lọc. Chưa fork, chưa chạy upstream, chưa audit toàn bộ security/dependency.

## 6. Trải nghiệm người dùng

Lobby → chọn/tạo một trong ba phòng → nhập tên → bấm vào xem để unlock media → nhận timeline hiện tại → xem/chat.

Host nhập link và điều khiển play/pause/seek/đổi video. Viewer chỉ đổi volume/quality riêng; có nút đồng bộ lại. Người vào muộn theo vị trí phòng. Chủ phòng có quyền moderation và đóng phòng.

TTS: chọn preset nam/nữ hoặc profile đã được nghe thử → gửi tin và chọn đọc → thấy trạng thái queued/ready/failed/quota → audio phát lần lượt. Mỗi người có quyền tắt nghe TTS riêng.

Đăng ký giọng: đăng nhập, thu mẫu của chính mình, nghe thử câu khác, lưu hoặc thu lại; có xóa profile. Không đưa reference giọng ra public hoặc cho các viewer tải.

## 7. Nguyên tắc chống lag

- Gửi lệnh và state thay đổi; client tự ngoại suy thời gian, không broadcast currentTime liên tục.
- Phân phòng ở server; chỉ fanout cho tối đa 50 người liên quan.
- Native WebSocket có hibernation; không timer nền giữ DO thức, không chờ inference trong handler room.
- Tin nhắn/queue/buffer/DOM có giới hạn; client chậm bị resync thay vì tích RAM vô hạn.
- Một TTS job sinh một clip cho cả phòng; fair queue, cache theo profile version; không sinh 50 lần.
- Player không remount theo chat, seek có tolerance và cooldown.
- Người buffering tự bắt kịp; không kéo cả phòng dừng theo.
- Ưu tiên control > chat > TTS; hết quota TTS giữ phim/chat hoạt động trong quota core.

## 8. Roadmap

| Mốc | Ngày công | Bàn giao |
|---|---:|---|
| M0 | 4–6 | Feasibility YouTube, Free plan/quota, preset/cloning |
| M1 | 4–5 | Cloud foundation, lobby, session, 3×50 admission |
| M2 | 5–7 | Playback sync/reconnect/hibernation |
| M3 | 3–4 | Chat, moderation, responsive; alpha có thể deploy |
| M4 | 7–10 | Giọng cá nhân/preset, queue/audio/quota; cần TTS gate |
| M5 | 5–7 | Tải 150, soak, thiết bị thật, pilot |
| M6 | 2–3 | Deploy production, runbook, rollback, nghiệm thu |

Tổng 30–42 ngày công, khoảng 7–9 tuần với 1 full-stack có hỗ trợ QA/ML bán thời gian, nếu điều kiện tài nguyên đạt. Thời gian chờ account/provider là phụ thuộc ngoài ước lượng. Bản đầy đủ không có ngày cố định trước khi vượt G0-TTS.

## 9. Release gates

- Không vượt 3 phòng hoặc 50 membership/phòng kể cả requests đồng thời.
- Viewer không điều khiển chung, dùng giọng người khác hoặc đọc dữ liệu phòng khác.
- Mục tiêu p95 drift ≤1 giây trong điều kiện player foreground đang phát ổn định; không hứa đồng bộ quảng cáo.
- Mục tiêu p95 ACK control/chat ≤500ms với RTT ≤150ms trong profile tải công bố.
- TTS thực sự tạo câu mới bằng đúng profile hoặc preset; không âm thầm dùng preset rồi báo clone.
- Số TTS/ngày và giờ hoạt động nằm trong free budget đã đo, không chỉ thử một lần thành công.
- 150 WS soak 2 giờ và pilot player thật pass; không claim load test từ số liệu README.
- URL chỉ ghi là live khi deploy trả thành công; browser/QA status báo riêng.

## 10. Trạng thái và điều kiện còn thiếu

Đã hoàn thành nghiên cứu source/tài liệu và thiết kế v2. Đã đọc được tài khoản Cloudflare kết nối cùng danh sách Worker; chưa có quyền billing để xác nhận plan. Chưa có source ứng dụng, chưa deploy, chưa có benchmark.

Cần xác minh khi bắt đầu M0: Cloudflare plan/quota còn lại, tài khoản HF đủ điều kiện miễn phí, API quota identity, số giờ dùng/ngày và số tin muốn đọc. Nếu không có inference free phù hợp, cloning bị blocked; không tự yêu cầu user trả tiền hoặc có máy server.

## 11. Nguồn chính

[YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [YouTube policies](https://developers.google.com/youtube/terms/developer-policies), [Cloudflare DO](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [HF ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu), [HF Spaces](https://huggingface.co/docs/hub/spaces-overview), [Supabase Free](https://supabase.com/pricing), [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS).

Skills đã dùng cho nghiên cứu: cloud-environment-runtime; vercel:create-a-backend ở v1; cloudflare, durable-objects, workers-best-practices và supabase ở v2. Skill sites đã được đọc khi chuẩn bị deploy; helper không có trong môi trường nên hướng dự kiến chuyển sang Cloudflare connector. Chưa thực hiện xuất bản qua bất kỳ hướng nào.

## Bổ sung nghiên cứu NVIDIA NIM — 01/11/2026

Đã thêm [nghiên cứu NIM, source và kế hoạch kiểm thử chi tiết](../NVIDIA_NIM_NGHIEN_CUU_VA_KE_HOACH_KIEM_THU.md), [corpus](../../testing/nim/corpus.json) và [smoke harness](../../scripts/nim-smoke.mjs). Magpie là ứng viên đánh giá preset/clone, chưa có kết quả inference vì thiếu credential. NVIDIA API trial chỉ dành cho thử nghiệm theo terms đã đọc, không chọn làm backend production miễn phí. Kiểm chứng codec là gate bắt buộc vì WAV PCM có egress cao hơn giả định Opus.

## Bộ review và thiết kế02/11/2026

- [Review tổng thể, findings và backlog bổ sung](REVIEW_VA_BAN_GIAO_2026-11-02.md).
- [UI/UX, nguồn đồ họa và license](../UI_UX_VA_TAI_NGUYEN.md).
- [Bản bố cục tương tác cục bộ](../../design/cinema-preview.html).
- [Threat model, bảo mật, riêng tư và vận hành](../BAO_MAT_VA_VAN_HANH.md).

Preview dùng dữ liệu giả, không có backend. Timeline có reserve33–47ngày công nếu tính thêm3–5ngày thiết kế/hardening ngoài baseline. Full cloning vẫn phụ thuộc provider production0đ được xác minh.

## Quy tắc phát và kế hoạch đồ họa mới nhất

Host được phát ngay khi ở một mình; người mới được duyệt vào xem tiếp timeline hiện tại. Không đợi đủ2người hoặc animation. [Kế hoạch đồ họa, bố cục và công nghệ](../DO_HOA_VA_CONG_NGHE_RAP_3D.md) mô tả renderer/playerDOM, camera, assets, hiệu năng và phân rã triển khai mới nhất; các ước lượng cũ là lịch sử.

## Đã bắt đầu implementation —02/11/2026

[Review và trạng thái triển khai hiện hành](../KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) · [Source và hướng dẫn chạy](../../cinema/README.md). Đã có app alpha/backendcục bộ; các đoạn trước nói chưa cósource là trạng thái lịch sử. Chưa có publicdeployment hoặc cloneproduction.
