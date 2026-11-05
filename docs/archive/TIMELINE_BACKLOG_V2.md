> Tài liệu lịch sử; không phải trạng thái source hiện tại. Tiếp tục từ [PROJECT_STATE](../../PROJECT_STATE.md).

# Timeline, backlog và tiêu chí nghiệm thu v2

> Trạng thái implementation cập nhật 05/11/2026 nằm ở [plan hiện hành](../KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) và [PROJECT_STATE](../../PROJECT_STATE.md). Timeline v2 dưới đây là lịch sử; các gate full-scope chưa đạt vẫn còn, không phải báo cáo “đã hoàn tất”.


> **V3 supersedes,02/11/2026:** [Đặc tả hiện hành](../THIET_KE_RAP_3D_V3.md): rạp3D, host chọn2–10ghế,3phòng/tối đa30người; playlist và approval/kick trong MVP. Các mức50/150, lựa chọn2D-only và timeline cũ bên dưới là baseline lịch sử, không phải yêu cầu mới. Budget/quality/security còn áp dụng khi không xung đột; xem v3 để biết luồng, số liệu và timeline thay thế.

Ước lượng cho một full-stack có kinh nghiệm, hỗ trợ QA/ML bán thời gian. Ngày công không đồng nghĩa ngày lịch; không giả định có nhiều agent/dev làm song song. Chưa cam kết ngày phát hành khi cổng tài nguyên TTS còn mở.

## 1. Milestones

| Mốc | Ngày công | Dự kiến tuần | Bàn giao | Phụ thuộc/gate |
|---|---:|---|---|---|
| M0: feasibility và free quota | 4–6 | 1 | Prototype YouTube 3–5 thiết bị, kết quả quyền tạo ZeroGPU/API quota, thử hai preset và clone | Bắt buộc quyết định tính khả thi TTS trước khi đầu tư module lớn |
| M1: nền tảng cloud | 4–5 | 2 | Repo, static frontend, Worker/DO, guest session, lobby, 3 slot, admission | G0-core đạt; namespace staging riêng |
| M2: xem chung | 5–7 | 3 | Host control, clock offset, drift, late join/reconnect, hibernation recovery | M1; unit/integration protocol pass |
| M3: chat và quản trị | 3–4 | 4 | Chat idempotent, history, kick/ban/xóa, responsive | M2; quyền không rò giữa phòng |
| M4: TTS đầy đủ | 7–10 | 5–6 | Enrollment/preview/delete, preset, clone, queue, quota, audio playback | G0-TTS đạt; thiếu tài nguyên thì mốc này blocked |
| M5: tải và pilot | 5–7 | 7–8 | 3×50, 2 giờ soak, quota model, thiết bị thật, lỗi provider | M3 cho core; M4 cho release đầy đủ |
| M6: release và runbook | 2–3 | 8–9 | URL production, rollback, hướng dẫn host, dashboard, báo cáo nghiệm thu | M5 đạt và tài nguyên còn quota |

Tổng: **30–42 ngày công**, thường **7–9 tuần** nếu các gate đạt. Nếu tài khoản HF mới phải chờ đủ điều kiện hoặc không có tài nguyên TTS phù hợp, ngày lịch của bản đầy đủ kéo dài tương ứng. Không cộng thời gian chờ vào năng lực lập trình giả định.

**Alpha core:** cuối M3 có thể deploy web xem chung/chat + TTS local fallback. Đây là bản thử, chưa hoàn thành yêu cầu cloning và preset đồng nhất. **Release đầy đủ:** chỉ sau M4–M6.

## 2. Gate M0

### G0-core

- Xác nhận Cloudflare plan/quota và không bật dịch vụ tính phí mới; API kết nối hiện tại đọc được account/scripts nhưng endpoint billing trả 403, nên chưa xác minh plan thực tế bằng kết nối này.
- Worker + SQLite DO thử nghiệm nhận WebSocket, hibernate rồi resume đúng state.
- YouTube embed hoạt động trên desktop/iOS/Android; có UX autoplay blocked và video không cho nhúng.
- Không sử dụng server/máy cá nhân, không phụ thuộc domain trả phí.

### G0-TTS

- Tài khoản chủ dự án thật sự tạo được Space miễn phí; xác minh provider cho phép luồng API dự định dùng, cách tính quota của caller và cơ chế lưu riêng tư.
- Chạy được VieNeu preset và reference cloning; nghe câu mới, không chỉ phát lại sample.
- Đo end-to-end gồm queue, cold start, inference, upload và client playback; tối thiểu 100 câu thử ở vài mức dài và các mẫu giọng tự nguyện.
- Tạo một clip rồi chia sẻ cho nhiều người theo quyền; không cần 50 API calls.
- Tính số tin/ngày phục vụ được trước quota và egress; đặt mức TTS hạn chế công khai.
- Kết quả: PASS, PASS_WITH_LIMITS hoặc BLOCKED. Nếu BLOCKED, không bật nút thu giọng giả và không tuyên bố “clone miễn phí đã có”.

## 3. Backlog có thể giao việc

| ID | Ưu tiên | Công việc | Acceptance |
|---|---|---|---|
| INF-01 | P0 | Monorepo, lockfile, CI/build, config Worker/DO | Build tái lập, secrets ngoài source |
| INF-02 | P0 | Static asset routing + workers.dev | Assets không qua SSR/Worker không cần thiết |
| ROOM-01 | P0 | Ba slot với roomSessionId | 10 create tranh chấp chỉ tối đa 3 phiên hoạt động |
| ROOM-02 | P0 | Admission, guest credential, lease | 100 join cùng phòng chỉ 50 được cấp chỗ |
| ROOM-03 | P0 | Reconnect, takeover tab, host grace | Không seat rác/2 host, không giành session bằng clientId |
| SYNC-01 | P0 | Timeline + revision + idempotent commands | Fake-clock test, stale/repeated command đúng |
| SYNC-02 | P0 | YouTube adapter + generation guard | Đổi link liên tiếp không áp callback video cũ |
| SYNC-03 | P0 | Drift correction, cooldown, resync | Không seek loop; người buffering không dừng phòng |
| CHAT-01 | P0 | ACK, cursor, dedupe, safe rendering | Retry mất ACK không trùng tin, không XSS |
| MOD-01 | P0 | Host role, kick/ban/xóa/chuyển quyền | Server từ chối lệnh viewer và truy cập chéo phòng |
| UI-01 | P0 | Lobby, player, chat, member states | Mobile dùng được, empty/error/loading/full rõ ràng |
| VOICE-01 | P0-full | Owner profile + consent + recording validation | Chỉ thu khi user bấm; reference không public |
| VOICE-02 | P0-full | Preview/activate/delete và preset nam/nữ | Giọng đúng owner, xóa hủy được job/cache liên quan |
| TTS-01 | P0-full | Provider adapter submit/poll/status | Giới hạn timeout/retry, không block room coordinator |
| TTS-02 | P0-full | Fair queue, idempotency, quota reservation | Không double synthesis, một phòng không chiếm hết quota |
| TTS-03 | P0-full | Audio signed access, schedule, TTL | Không cấp URL mới cho người ngoài; URL đã cấp TTL≤60s; mute không tải |
| PERF-01 | P0 | Native WS load + hibernation tests | 150 client, reconnect burst, memory bounded |
| PERF-02 | P0-full | TTS load/quota/cache benchmark | Báo số liệu thực, không dùng benchmark README thay thế |
| OPS-01 | P0 | Budget alerts và trạng thái quota | Hết TTS quota không làm chết phim/chat |
| OPS-02 | P0 | Deploy/rollback/recovery runbook | Smoke test và diễn tập phục hồi thành công |

P0-full là yêu cầu bắt buộc của sản phẩm hoàn chỉnh, chỉ không chặn alpha core. P2: playlist, reaction phức tạp, lịch chiếu, vote, livestream/DVR, app native.

## 4. Ma trận kiểm thử và chỉ số

| Nhóm | Bài thử | Điều kiện đạt đề xuất |
|---|---|---|
| Capacity | 3×50; người 51; room thứ 4 | Không vượt limit ở server, kể cả race/reconnect |
| Sync | Host play/pause/seek/đổi video; join muộn | p95 drift ≤1s khi foreground và player phát ổn định |
| Control | Host command trong lúc chat/TTS burst | p95 ACK ≤500ms với RTT ≤150ms |
| Recovery | Disconnect 10–30s, DO eviction, deploy | Snapshot mới, không replay command cũ, không tăng seat sai |
| Fairness | Một phòng spam TTS | Hai phòng khác vẫn gửi control/chat; queue TTS bounded |
| Audio | Client đã preload và unlock autoplay | p95 lệch audio start ≤500ms; chậm thì skip có thông báo |
| TTS quality | 10–20 người tự nguyện, câu mới | Mục tiêu ≥80% chấp nhận giọng, độ rõ trung bình ≥4/5 |
| TTS latency | Tin ≤120 code points NFC | Đo trước rồi đặt SLO; không hứa ≤3s trên ZeroGPU free |
| Privacy | Dùng profile/audio của người/phòng khác | Từ chối; sample không có URL public |
| Browser | Chrome/Firefox/Edge, Safari iOS, Chrome Android | Player/chat hoạt động, fallback audio trung thực |
| Soak | 150 WS ×2h, chat và TTS trong quota | Không memory leak, queue/disk/DB tăng vô hạn |
| Free budget | Replay mô hình lưu lượng ngày | Không vượt 70% ngân sách dự án đã phân bổ ở mức dùng công bố |

Chỉ số p95 sync phải đi kèm tỷ lệ thời gian ads/buffering/autoplay block. Load 150 socket giả không chứng minh 150 player YouTube; dùng mock cho load, pilot người thật cho player. Không tạo view bot.

## 5. Deploy và vận hành

1. Build/verify local; upload staging namespace và static assets; không đụng app đang có trong account.
2. Test auth/admission/sync/hibernate, browser thật và đo quota. Staging cũng tiêu quota chung, không chạy soak sát giới hạn ngày.
3. Deploy production bằng config pin version; ghi artifact/commit/model revision và migration version.
4. Smoke test hai trình duyệt, ba phòng, chat và TTS nếu được bật; giữ rollback version đã biết tốt.
5. Chỉ báo đã deploy khi API xác nhận thành công và có URL thật. Chỉ báo đã kiểm chứng browser/load khi có bằng chứng tương ứng.

Hết quota: frontend static còn mở được nếu assets routing đúng; API/DO có thể trả lỗi cho đến reset. Hiển thị trạng thái rõ, không loop retry. Tắt nhận TTS trước khi cạn quota audio; không tự nâng gói.

Backup/export schema/state có giới hạn, không dump sample giọng vào repo. Mục tiêu phục hồi và quyền truy cập backup phải được chứng minh trên gói miễn phí, không mặc định có managed daily backup.

## 6. Tài liệu phải có khi bàn giao

PRD; ADR stack/free hosting; event schema; data ownership; TTS provider contract; quota spreadsheet; source/license manifest; báo cáo G0; benchmark report; QA matrix; deploy/rollback guide; privacy/retention; hướng dẫn host và người xem.

Tại mốc tài liệu 02/11, mới có nghiên cứu/kế hoạch và chưa có source/URL/benchmark. Trạng thái mới đã được cập nhật trong plan hiện hành và PROJECT_STATE, không dùng câu lịch sử này làm trạng thái triển khai.

## G0/QA bổ sung: NVIDIA NIM

[Chi tiết 7–9 ngày công kiểm thử](../NVIDIA_NIM_NGHIEN_CUU_VA_KE_HOACH_KIEM_THU.md), chồng một phần vào G0/QA hiện tại, chưa cộng cứng vào tổng. Ba gate độc lập: preset Việt, clone đạt chất lượng, provider được phép production0đ. Không dùng kết quả dry-run thay benchmark. Thời gian chờ quyền Zeroshot chưa xác định.

## Review UI/security02/11/2026

Dự phòng thiết kế/usability/license và hardening/privacy thêm3–5ngày nếu chưa nằm trong các milestone: baseline30–42, có reserve33–47ngày công. Xem [review tổng thể](REVIEW_VA_BAN_GIAO_2026-11-02.md), [UI/UX](../UI_UX_VA_TAI_NGUYEN.md), [bảo mật](../BAO_MAT_VA_VAN_HANH.md). Không cộng đôi thời gian NIM.

### Bổ sung mới nhất

[Kế hoạch đồ họa và công nghệ3D](../DO_HOA_VA_CONG_NGHE_RAP_3D.md) cập nhật bố cục, asset pipeline, latejoin không chờ và timeline. Host một mình phát được;2chỉ là capacity nhỏ nhất.
