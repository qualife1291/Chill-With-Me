# Kế hoạch triển khai và nghiệm thu hiện hành — 05/11/2026

Trạng thái source và evidence chuẩn: [PROJECT_STATE.md](../PROJECT_STATE.md). Lệnh chạy: [cinema/README.md](../cinema/README.md). Tài liệu này thay bảng trạng thái prototype ngày 02/11; các yêu cầu full-scope chưa đạt vẫn được giữ, không coi một phiên coding là hoàn tất toàn bộ roadmap.

## Phạm vi alpha đang thực hiện

3 phòng; host chọn 2–10 ghế kể cả host, phát ngay khi một mình. Người vào sau theo timeline. Duyệt trước khi nhận dữ liệu phòng; server giữ quyền host, kick/ban, epoch, commandId và lease. Không mic voice call, không NIM trial hoặc clone production khi chưa qua gate tài nguyên/quyền/budget.

Giao diện hiện tại có sảnh 3D, chọn/xem trước model nam/nữ KayKit CC0, bốn camera, chuyển camera có giảm chuyển động, kéo/vuốt/WASD/D-pad xoay đầu và đồng bộ pose. Native YouTube iframe giữ nguyên khi đổi góc. Chat và giọng thiết bị độc lập với lựa chọn avatar. Playlist có host reorder, viewer suggestions và host review; mỗi người tối đa 3 đề xuất chờ duyệt, cách nhau 10 giây, không tự phát video được đề xuất.

## Bảng đối chiếu plan với implementation

| Mốc | Source / test local | Phần chưa thể đánh dấu hoàn tất |
| --- | --- | --- |
| S0 source/build | Dependencies/lockfile; frontend và Worker TypeScript; Vite build; Worker dry-run; artifact gzip/GLB MIME có kiểm tra | CI đa nền tảng và runtime ngoài máy hiện tại chưa phải phạm vi đã kiểm chứng |
| S1 core invariants | Capacity 2–10, late join không reset, server role, Next/generation race, revocation, URL allowlist, queue revision | Không suy ra drift/quota production từ unit test |
| S2 Worker/API | SQLite DO, WebSocket; Origin guard, admission race, idempotency/epoch; avatar và playlist qua API integration | Hibernation/eviction qua hạ tầng Cloudflare thật cần quyền tài khoản |
| S3 UI/scene | Sảnh/cửa phòng; xem trước nam/nữ; rigged GLB, walk/sit/wave; first/overview/shoulder/social; chat/queue/approval | Usability pilot người thật, kiểm chứng tương phản/WCAG toàn diện chưa thực hiện |
| S4 browser realtime | Suite hai profile với backend local, YouTube/speech mô phỏng; nhập/kéo/phím, pose, queue, chat, voice và mobile layout | Không thay thế iOS/Android hardware, quảng cáo/autoplay/video nhúng thật |
| S5 lifecycle/hardening | Reserve 20s, reconnect 30s, pending TTL/cancel, takeover, designated successor/transfer, alarm/empty room; cookie và role guards | Invite có session chống link cũ, nhưng chưa có loại phòng riêng ẩn khỏi lobby; operator moderation/privacy/retention đầy đủ còn backlog |
| S6 graphics polish | Model CC0 có hash/manifest, tool tối ưu ngoài app deps, clone skeleton độc lập và disposal, demand render/DPR cap, reduced motion, fallback | Cổng GPU: cần số đo FPS/memory/thermal trên thiết bị thật, không lấy software WebGL của máy test làm kết quả mobile |
| S7 playlist/player QA | Reorder có revision, suggest/review bounded và host-only; stale edit refresh không tự replay; giữ URL khi lỗi; seek/ended/queue với stable iframe có test | Playlist import/batch/reorder drag/suggestions nâng cao và clock offset theo RTT chưa hoàn tất; actual YouTube/ad/autoplay/foreground drift vẫn cần pilot |
| S8 load/release | Short smoke 3×10 authenticated WS và broadcast, kiểm tra asset/gzip; có config/deploy artifact | Chưa có sustained media/GPU soak, quota/account/rollback drill; deploy bản mới bị chặn bởi Cloudflare auth |
| S9 full voice/cloning | Research/corpus và voice thiết bị fallback; không thu mic hoặc giả nút clone | Provider production phù hợp, credential/quota, consent/enrollment/delete, chất lượng/latency và signed audio đều chưa qua gate |

## Acceptance cho UI/UX và độ mượt

- Yaw đầu ±75°, pitch −45°/+35°; thân ngoái 180°. Kéo nền/vuốt/phím không bắt sự kiện khi đang nhập chat, không remount iframe. Pose kiểm qua WebSocket và quaternion rig giữa host/guest; góc đầu có nội suy theo thời gian, dừng đúng đích và không cộng dồn trên frame idle. Giữ D-pad mất focus cũng phải dừng; chuột phải không điều khiển vùng kéo pad.
- Mục tiêu chạm từ 44 px cho toolbar/queue controls; form lỗi giữ nội dung; viewer không có nút quản lý queue; stale queue hiển thị thông báo và snapshot mới. Không tự chọn lại thứ tự khi người dùng đang thao tác với danh sách cũ.
- Độ mượt có hai phép nghiệm thu khác nhau: (1) cảnh idle ở foreground không render liên tục trong khi video vẫn phát; (2) FPS/frame time/input latency/thermal của 10 avatar trên thiết bị thật. Chỉ (1) được đo tự động ở môi trường này. Không tuyên bố 60 FPS hoặc GPU pilot đã đạt.
- Kết quả hiện hành: 35 test logic/asset và 44 browser checks; đo foreground 0 frame render thêm trong 1.205 giây, video mô phỏng tiến 1.206 giây. Đây không phải benchmark FPS phần cứng.
- Report hiện hành: [browser](../cinema/evidence/fixes.json), [capacity](../cinema/evidence/capacity.json), [artifact](../cinema/evidence/artifact.json). Giới hạn mô phỏng ghi trong từng report/README.

## Việc tiếp theo và điều kiện mở khóa

1. **Deploy đúng Worker hiện tại:** cần `CLOUDFLARE_API_TOKEN` được cấp qua Environment settings; account `966c7ceee358485648b935a07877ec45`, Worker `cung-xem-cinema-alpha`, ROOMS/RoomSlot, migration `v1`. Đã có authorization của người dùng; không dùng temporary account, không reset dữ liệu hoặc đổi billing. Chỉ xác nhận deploy sau khi API thành công và public HTML/JS/CSS/GLB khớp artifact.
2. **Pilot thiết bị/media:** iOS Safari + Android Chrome + desktop, thực tế autoplay/ads/embed restrictions, voice Việt và touch/background. Checklist trong README; không tạo view bot.
3. **Release gate:** sustained 3×10, reconnect/eviction, memory và quota theo account; rollback/recovery drill và vận hành. Chưa có credential/budget/thiết bị phù hợp thì giữ trạng thái chưa xác minh.
4. **Full scope:** phòng riêng, queue/import nâng cao, RTT clock, privacy/retention/moderation và VOICE/TTS provider chỉ đánh dấu hoàn tất khi có implementation và bằng chứng tương ứng. Không đổi backlog full-scope thành “done” chỉ vì alpha đã chạy local.

## Lịch sử và tài liệu nền

[V3](THIET_KE_RAP_3D_V3.md) là thiết kế sản phẩm gốc; [timeline v2](TIMELINE_BACKLOG_VA_NGHIEM_THU.md) giữ các mốc 50/150 người và ước lượng cũ để tham chiếu lịch sử. Chúng không ghi trạng thái source hiện tại. Cấu hình/test/runbook thực thi nằm trong README và PROJECT_STATE.
