# Kế hoạch triển khai và nghiệm thu hiện hành — 05/11/2026

Trạng thái source và evidence chuẩn: [PROJECT_STATE.md](../PROJECT_STATE.md). Lệnh chạy: [cinema/README.md](../cinema/README.md). Tài liệu này thay bảng trạng thái prototype ngày 02/11; các yêu cầu full-scope chưa đạt vẫn được giữ, không coi một phiên coding là hoàn tất toàn bộ roadmap.

## Phạm vi alpha đang thực hiện

3 phòng; host chọn 2–10 ghế kể cả host, phát ngay khi một mình. Người vào sau theo timeline. Duyệt trước khi nhận dữ liệu phòng; server giữ quyền host, kick/ban, epoch, commandId và lease. Không mic voice call, không NIM trial hoặc clone production khi chưa qua gate tài nguyên/quyền/budget.

Giao diện hiện tại có sảnh 3D, chọn/xem trước model nam/nữ KayKit CC0, bốn camera, chuyển camera có giảm chuyển động, kéo/vuốt/WASD/D-pad xoay đầu và đồng bộ pose. Native YouTube iframe giữ nguyên khi đổi góc. Chat và giọng thiết bị độc lập với lựa chọn avatar. Trình phát native hỗ trợ video/audio qua link HTTPS và file local, cleanup metadata/Blob sau khi kết thúc; Drive preview có giới hạn không đồng bộ được ghi rõ trong README. Playlist có host reorder, viewer suggestions và host review; mỗi người tối đa 3 đề xuất chờ duyệt, cách nhau 10 giây, không tự phát video được đề xuất.

## Bảng đối chiếu plan với implementation

| Mốc | Source / test local | Phần chưa thể đánh dấu hoàn tất |
| --- | --- | --- |
| S0 source/build | Dependencies/lockfile; strict TypeScript/build/dry-run; CI source checks Node 22/24; runner nghiệm thu local tuần tự; link docs/artifact gzip/GLB có kiểm tra | CI cấu hình khác với kết quả CI đã quan sát; thiết bị/OS ngoài môi trường local vẫn cần kiểm chứng |
| S1 core invariants | Capacity 2–10, late join không reset, server role, Next/generation race, revocation, URL allowlist, queue revision | Không suy ra drift/quota production từ unit test |
| S2 Worker/API | SQLite DO, WebSocket; Origin guard, admission race, idempotency/epoch; avatar và playlist qua API integration | Hibernation/eviction qua hạ tầng Cloudflare thật cần quyền tài khoản |
| S3 UI/scene | Sảnh/cửa phòng; xem trước nam/nữ; rigged GLB, walk/sit/wave; first/overview/shoulder/social; chat/queue/approval | Usability pilot người thật, kiểm chứng tương phản/WCAG toàn diện chưa thực hiện |
| S4 browser realtime | Suite hai profile với backend local, YouTube/speech mô phỏng; nhập/kéo/phím, pose, queue, chat, voice và mobile layout | Không thay thế iOS/Android hardware, quảng cáo/autoplay/video nhúng thật |
| S5 lifecycle/hardening | Reserve 20s, reconnect 30s, pending TTL/cancel, takeover, designated successor/transfer, alarm/empty room; cookie/role guards; phòng riêng có capability fragment, summary ẩn, host-only key, thu hồi lời mời/pending | Operator moderation/privacy/retention đầy đủ còn backlog |
| S6 graphics polish | Model CC0 có hash/manifest, tool tối ưu ngoài app deps, clone skeleton độc lập và disposal, demand render/DPR cap, reduced motion, fallback | Cổng GPU: cần số đo FPS/memory/thermal trên thiết bị thật, không lấy software WebGL của máy test làm kết quả mobile |
| S7 playlist/player QA | Video/audio/file cleanup; import TXT/M3U/batch atomic (20 link/16 KiB); drag/up/down CAS; suggest/review bounded; RTT theo nonce/socket/epoch và monotonic player clock; giữ native iframe | Không phát HLS/playlist URL tuỳ ý; actual YouTube/ad/autoplay/foreground drift và mạng bất đối xứng vẫn cần pilot |
| S8 load/release | Short smoke 3×10 authenticated WS và broadcast, kiểm tra asset/gzip; có config/deploy artifact | Chưa có sustained media/GPU soak, quota/account/rollback drill; deploy bản mới bị chặn bởi Cloudflare auth |
| S9 full voice/cloning | Research/corpus và voice thiết bị fallback; không thu mic hoặc giả nút clone | Provider production phù hợp, credential/quota, consent/enrollment/delete, chất lượng/latency và signed audio đều chưa qua gate |

## Acceptance cho UI/UX và độ mượt

- Yaw đầu ±75°, pitch −45°/+35°; thân ngoái 180°. Kéo nền/vuốt/phím không bắt sự kiện khi đang nhập chat, không remount iframe. Pose kiểm qua WebSocket và quaternion rig giữa host/guest; góc đầu có nội suy theo thời gian, dừng đúng đích và không cộng dồn trên frame idle. Giữ D-pad mất focus cũng phải dừng; chuột phải không điều khiển vùng kéo pad.
- Mục tiêu chạm từ 44 px cho toolbar/queue controls; form lỗi giữ nội dung; viewer không có nút quản lý queue; stale queue hiển thị thông báo và snapshot mới. Không tự chọn lại thứ tự khi người dùng đang thao tác với danh sách cũ.
- Độ mượt có hai phép nghiệm thu khác nhau: (1) cảnh idle ở foreground không render liên tục trong khi video vẫn phát; (2) FPS/frame time/input latency/thermal của 10 avatar trên thiết bị thật. Chỉ (1) được đo tự động ở môi trường này. Không tuyên bố 60 FPS hoặc GPU pilot đã đạt.
- Kết quả hiện hành: 53 test logic/asset, 44 checks UI, 18 checks media thật và 15 checks roadmap trình duyệt; đo foreground 0 frame render thêm trong 1.205 giây, video mô phỏng tiến 1.206 giây. Đây không phải benchmark FPS phần cứng.
- Thêm smoke mười model thật trong một SwiftShader renderer và kiểm thử ACL/cursor/size của relay. Không suy ra FPS thiết bị thật hoặc thông lượng production. Report hiện hành: [browser](../cinema/evidence/fixes.json), [capacity](../cinema/evidence/capacity.json), [artifact](../cinema/evidence/artifact.json). Giới hạn mô phỏng ghi trong từng report/README.

## Việc tiếp theo và điều kiện mở khóa

1. **Deploy đúng Worker hiện tại:** cần `CLOUDFLARE_API_TOKEN` được cấp qua Environment settings; account `966c7ceee358485648b935a07877ec45`, Worker `cung-xem-cinema-alpha`, ROOMS/RoomSlot, migration `v1`. Đã có authorization của người dùng; không dùng temporary account, không reset dữ liệu hoặc đổi billing. Chỉ xác nhận deploy sau khi API thành công và public HTML/JS/CSS/GLB khớp artifact.
2. **Nghiệm thu tổng hợp local:** `npm run verify:local` là điểm vào chuẩn; không chạy source build đồng thời với browser/load. Report `cinema/evidence/verification.json`. Bộ này không thay thế cổng thiết bị/production.
3. **Pilot thiết bị/media:** iOS Safari + Android Chrome + desktop, thực tế autoplay/ads/embed restrictions, voice Việt và touch/background. Checklist trong README; không tạo view bot.
4. **Release gate:** sustained 3×10, reconnect/eviction, memory và quota theo account; rollback/recovery drill và vận hành. Chưa có credential/budget/thiết bị phù hợp thì giữ trạng thái chưa xác minh.
5. **Full scope:** phòng riêng, batch/import, drag và RTT đã có implementation/test local. Privacy/retention/moderation vận hành, VOICE/TTS provider chỉ đánh dấu hoàn tất khi có implementation và bằng chứng tương ứng. Không đổi backlog full-scope thành “done” chỉ vì alpha đã chạy local.

## Lịch sử và tài liệu nền

[V3](THIET_KE_RAP_3D_V3.md) là thiết kế sản phẩm gốc; [timeline v2](archive/TIMELINE_BACKLOG_V2.md) giữ các mốc 50/150 người và ước lượng cũ để tham chiếu lịch sử. Chúng không ghi trạng thái source hiện tại. Cấu hình/test/runbook thực thi nằm trong README và PROJECT_STATE.
