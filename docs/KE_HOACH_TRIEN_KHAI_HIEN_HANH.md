# Kế hoạch triển khai và nghiệm thu hiện hành — 05/11/2026

Trạng thái source và evidence chuẩn: [PROJECT_STATE.md](../PROJECT_STATE.md). Lệnh chạy: [cinema/README.md](../cinema/README.md). Tài liệu này thay bảng trạng thái prototype ngày 02/11; các yêu cầu full-scope chưa đạt vẫn được giữ, không coi một phiên coding là hoàn tất toàn bộ roadmap.

## Phạm vi alpha đang thực hiện

3 phòng; host chọn 2–10 ghế kể cả host, phát ngay khi một mình. Người vào sau theo timeline. Duyệt trước khi nhận dữ liệu phòng; server giữ quyền host, kick/ban, epoch, commandId và lease. Không mic voice call, không NIM trial hoặc clone production khi chưa qua gate tài nguyên/quyền/budget.

Giao diện hiện tại có sảnh 3D, chọn/xem trước model nam/nữ KayKit CC0, hai chế độ mắt người/tự do, gộp các góc nhìn ngoài nhân vật, chuyển camera có giảm chuyển động, một selector góc nhìn, kéo/vuốt/WASD xoay đầu, cuộn chuột thu/phóng và đồng bộ pose. HUD xã hội theo bố cục profile trái, các bảng cùng vị trí bên phải, menu cảm xúc ở hàng nút dưới. Video bám mặt phẳng màn chiếu rộng 8.8×4.95, không ẩn cả video khi một phần đi sau camera; bỏ tự chuyển khung nổi, dùng depth mask để đầu/ghế nằm trước video. Native YouTube iframe giữ nguyên khi đổi góc. Chọn màu tóc/quần áo và xem trước 3D chỉ ở bước trước khi tạo/xin vào phòng; không sửa trong phòng. Chat và giọng thiết bị độc lập với lựa chọn avatar. Trình phát native hỗ trợ video/audio qua link HTTPS và file local, cleanup metadata/Blob sau khi kết thúc; Drive preview có giới hạn không đồng bộ được ghi rõ trong README. Playlist có host reorder, viewer suggestions và host review; mỗi người tối đa 3 đề xuất chờ duyệt, cách nhau 10 giây, không tự phát video được đề xuất.

## Việc cần làm UI/UX — 06/11/2026

- [x] Chủ phòng nhận dialog duyệt/từ chối ở giữa màn hình ngay khi có yêu cầu mới, kể cả lúc chưa chọn phim; giữ hàng chờ và focus đúng khi nhiều người xin vào.
- [x] Khi chat đóng, tin nhắn mới từ người khác hiện ở góc dưới bên phải, có tên/nội dung và thao tác mở chat; không phát lại lịch sử khi vào/reconnect.
- [x] Người bị chọc nhận âm báo ngắn kèm tên người chọc; không phát lại khi snapshot/reconnect, tuân thủ quyền autoplay của trình duyệt.
- [x] Thêm tung hoa / vỗ tay / mếu / troll dùng chung cả rạp: ẩn tên người gửi, pháo bông và luồng emoji ở cạnh màn hình khoảng 3 giây, âm thanh phù hợp; chỉ thành viên đã duyệt, giới hạn tần suất, không tích lũy lịch sử hiệu ứng.
- [x] Test quyền, chống gửi lặp/cooldown, hết hạn, nhiều profile, chat đóng/mở, âm thanh, reduced motion, mobile và hồi quy media/camera; cập nhật evidence trước push/deploy.

## Việc cần làm thoát đột ngột — 06/11/2026

- [x] Hết 30 giây giữ chỗ khi chủ ngắt kết nối: chỉ chuyển cho người kế nhiệm được chỉ định còn kết nối hợp lệ; nếu không thì đóng phòng, không để chủ rỗng. Chặn yêu cầu mới khi đang chờ chủ trở lại.
- [x] Lease heartbeat 90 giây chống socket chết âm thầm; tận dụng clock probe hiện có, gộp ghi trạng thái tối đa mỗi 30 giây/kết nối, không broadcast heartbeat hoặc polling mới.
- [x] Reconnect có backoff, giới hạn request, phục hồi sau offline/online, bỏ callback của socket cũ; đóng phòng/hết chỗ giữ/tab bị thay thế có thông báo rõ và dừng retry.
- [x] Test đóng tab/browser, socket câm, refresh, mất mạng, host/guest, kế nhiệm online/offline, takeover và stale epoch; hồi quy toàn bộ rồi push/deploy.

## Sửa HUD và hiệu ứng — 12/11/2026

- [x] Dùng một trạng thái chung cho mọi bảng; cố định hàng nút, giữ khoảng cách với sheet, kiểm tra đóng/mở liên tiếp.
- [x] Đổi emoji sang luồng nổi ở cạnh màn hình như thả tim; bỏ biểu tượng lớn ở giữa, giữ âm thanh, TTL và reduced motion.
- [x] Giảm rủi ro nháy lớp WebGL/DOM (MSAA, backdrop blur); kiểm tra pixel/video và context qua các lần bật/tắt. Chrome Mac M1 thật vẫn cần pilot.
- [x] Chụp và xem ma trận phone/tablet/desktop/landscape; kiểm tra vùng bấm bị che, tràn khung và cân xứng; hồi quy tổng hợp đạt trước release (source/version deploy xem PROJECT_STATE).

## Bảng đối chiếu plan với implementation

| Mốc | Source / test local | Phần chưa thể đánh dấu hoàn tất |
| --- | --- | --- |
| S0 source/build | Dependencies/lockfile; strict TypeScript/build/dry-run; CI source checks Node 22/24; runner nghiệm thu local tuần tự; link docs/artifact gzip/GLB có kiểm tra | CI cấu hình khác với kết quả CI đã quan sát; thiết bị/OS ngoài môi trường local vẫn cần kiểm chứng |
| S1 core invariants | Capacity 2–10, late join không reset, server role, Next/generation race, revocation, URL allowlist, queue revision | Không suy ra drift/quota production từ unit test |
| S2 Worker/API | SQLite DO, WebSocket; Origin guard, admission race, idempotency/epoch; avatar và playlist qua API integration | Hibernation/eviction qua hạ tầng Cloudflare thật cần quyền tài khoản |
| S3 UI/scene | Sảnh/cửa phòng; xem trước nam/nữ; rigged GLB, walk/sit/wave/poke; ghế đối xứng 1–3 hàng, lối đi theo sàn; eye/orbit liên tục; chat/queue/approval | Usability pilot người thật, kiểm chứng tương phản/WCAG toàn diện chưa thực hiện |
| S4 browser realtime | Suite hai profile với backend local, YouTube/speech mô phỏng; nhập/kéo/phím, pose, queue, chat, voice và mobile layout | Không thay thế iOS/Android hardware, quảng cáo/autoplay/video nhúng thật |
| S5 lifecycle/hardening | Reserve 20s, reconnect 30s, pending TTL/cancel, takeover, designated successor/transfer, alarm/empty room; cookie/role guards; phòng riêng có capability fragment, summary ẩn, host-only key, thu hồi lời mời/pending | Operator moderation/privacy/retention đầy đủ còn backlog |
| S6 graphics polish | Model CC0 có hash/manifest, tóc nam gắn theo xương đầu, skeleton dùng chung trong từng avatar, ghế instancing, tool tối ưu ngoài app deps, clone skeleton độc lập và disposal, demand render/DPR cap, reduced motion, fallback | Cổng GPU: cần số đo FPS/memory/thermal trên thiết bị thật, không lấy software WebGL của máy test làm kết quả mobile |
| S7 playlist/player QA | Video/audio/file cleanup; import TXT/M3U/batch atomic (20 link/16 KiB); drag/up/down CAS; suggest/review bounded; RTT theo nonce/socket/epoch và monotonic player clock; giữ native iframe | HLS VOD hữu hạn đã hỗ trợ; không coi playlist URL bất kỳ là tương thích; actual YouTube/ad/autoplay/foreground drift và mạng bất đối xứng vẫn cần pilot |
| S8 load/release | Short smoke 3×10 authenticated WS và broadcast, kiểm tra asset/gzip; có config/deploy artifact | Chưa có sustained media/GPU soak, quota/account/rollback drill; source/version và kết quả GET asset/API xem PROJECT_STATE; R2 chưa bật (10042) |
| S9 full voice/cloning | Research/corpus và voice thiết bị fallback; không thu mic hoặc giả nút clone | Provider production phù hợp, credential/quota, consent/enrollment/delete, chất lượng/latency và signed audio đều chưa qua gate |

## Acceptance cho UI/UX và độ mượt

- Yaw đầu ±75°, pitch −45°/+35°; thân ngồi giữ thẳng theo ghế, đầu xoay độc lập. Kéo nền/vuốt/phím không bắt sự kiện khi đang nhập chat, không remount iframe. Pose kiểm qua WebSocket và quaternion rig giữa host/guest; góc đầu có nội suy theo thời gian, dừng đúng đích và không cộng dồn trên frame idle. Phím giữ mất focus phải dừng; chuột phải không điều khiển vùng kéo. Pose live theo epoch không bị snapshot cũ ghi đè, heartbeat 2 giây cho người mới vào; pose trùng không render lại.
- Mục tiêu chạm từ 44 px cho toolbar/queue controls; form lỗi giữ nội dung; viewer không có nút quản lý queue; stale queue hiển thị thông báo và snapshot mới. Không tự chọn lại thứ tự khi người dùng đang thao tác với danh sách cũ.
- Độ mượt có hai phép nghiệm thu khác nhau: (1) cảnh idle ở foreground không render liên tục trong khi video vẫn phát; (2) FPS/frame time/input latency/thermal của 10 avatar trên thiết bị thật. Chỉ (1) được đo tự động ở môi trường này. Không tuyên bố 60 FPS hoặc GPU pilot đã đạt.
- Kết quả/count/đo idle hiện hành nằm trong `cinema/evidence/verification.json` và `fixes.json`, tránh sao chép số đo sang nhiều tài liệu. Đây không phải benchmark FPS phần cứng.
- Thêm smoke mười model thật trong một SwiftShader renderer và kiểm thử ACL/cursor/size của relay. Không suy ra FPS thiết bị thật hoặc thông lượng production. Report hiện hành: [browser](../cinema/evidence/fixes.json), [capacity](../cinema/evidence/capacity.json), [artifact](../cinema/evidence/artifact.json). Giới hạn mô phỏng ghi trong từng report/README.

## Việc tiếp theo và điều kiện mở khóa

1. **Deploy đúng Worker hiện tại:** đã xác thực token; source/version và kiểm tra asset/API chỉ đọc xem PROJECT_STATE; account `966c7ceee358485648b935a07877ec45`, Worker `cung-xem-cinema-alpha`, ROOMS/RoomSlot, migration `v1`. Đã có authorization của người dùng; không dùng temporary account, không reset dữ liệu hoặc đổi billing. Chỉ xác nhận deploy sau khi API thành công và public HTML/JS/CSS/GLB khớp artifact.
2. **Nghiệm thu tổng hợp local:** `npm run verify:local` là điểm vào chuẩn; không chạy source build đồng thời với browser/load. Report `cinema/evidence/verification.json`. Bộ này không thay thế cổng thiết bị/production.
3. **Pilot thiết bị/media:** iOS Safari + Android Chrome + desktop, thực tế autoplay/ads/embed restrictions, voice Việt và touch/background. Checklist trong README; không tạo view bot.
4. **Release gate:** sustained 3×10, reconnect/eviction, memory và quota theo account; rollback/recovery drill và vận hành. Chưa có credential/budget/thiết bị phù hợp thì giữ trạng thái chưa xác minh.
5. **Full scope:** phòng riêng, batch/import, drag và RTT đã có implementation/test local. Privacy/retention/moderation vận hành, VOICE/TTS provider chỉ đánh dấu hoàn tất khi có implementation và bằng chứng tương ứng. Không đổi backlog full-scope thành “done” chỉ vì alpha đã chạy local.

## Lịch sử và tài liệu nền

[V3](THIET_KE_RAP_3D_V3.md) là thiết kế sản phẩm gốc; [timeline v2](archive/TIMELINE_BACKLOG_V2.md) giữ các mốc 50/150 người và ước lượng cũ để tham chiếu lịch sử. Chúng không ghi trạng thái source hiện tại. Cấu hình/test/runbook thực thi nằm trong README và PROJECT_STATE.

## Nâng cấp tiếp theo — nghiên cứu ngày 11/11/2026

Nguồn dưới đây đã đọc từ tài liệu chính thức; Media Session, Wake Lock và phụ đề local đã có implementation; nghiệm thu và giới hạn xem PROJECT_STATE. Những phần còn lại vẫn là kế hoạch. Giữ một roadmap tại đây, trạng thái chạy/test chỉ ở PROJECT_STATE và evidence.

| Ưu tiên | Công nghệ / tính năng | Phạm vi và điều kiện nghiệm thu |
| --- | --- | --- |
| P1 | [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API): nút media hệ thống, tên bài/video | Chỉ đăng ký play/pause/seek cho host; viewer không có đường điều khiển vượt ACL. Thử MP3/native, dọn handler khi rời phòng; YouTube tùy iframe, có fallback nút hiện tại. |
| P1 | [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API): giữ sáng khi xem | Người dùng bật tùy chọn; chỉ giữ khi đang phát và trang visible; nhả khi pause/leave/hidden, xin lại khi visible nếu vẫn bật; feature detection, không ngăn khóa máy ngoài ý muốn. |
| P2 | [WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API): phụ đề cho file/video trực tiếp | Giới hạn dung lượng/encoding, kiểm CORS, đồng bộ theo media clock và cleanup Blob; không hứa chèn phụ đề tùy ý vào YouTube/Drive iframe. |
| P2 | Chất lượng tự thích ứng + HUD chẩn đoán tùy chọn | Đo frame time lúc có hoạt động, hạ DPR trước, hysteresis chống nhấp nháy; không chạy benchmark nền liên tục; nghiệm thu điện thoại thật trước bật mặc định. |
| P3 | [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) cho cảnh nâng cao | Chưa chuyển renderer: khả năng hỗ trợ, chi phí migrate và depth-mask DOM/native iframe cần thử riêng. Giữ WebGL tối ưu làm baseline; không đưa thêm shader nặng vào bản mobile hiện tại. |

Chưa mở khóa: R2/account activation và upload resumable; TURN/WAN file relay cần thử và dự trù quota; full voice provider/consent; pilot iOS/Android thực, soak/quota/rollback. Không coi các gate này đã xong vì test giả lập đạt.

## Nâng cấp hiệu suất đa thiết bị — 11/11/2026

- [x] Chính sách tài nguyên dùng chung: Auto tiết kiệm trên tablet/touch, Save-Data hoặc CPU/RAM thấp; thiếu API vẫn có fallback; lựa chọn thủ công giữ ưu tiên.
- [x] Cấu hình GPU ban đầu nhẹ cho thiết bị hạn chế, cùng chính sách cho sảnh và preview; không tạo lại renderer khi xoay máy/chọn chất lượng.
- [x] Dừng dựng 3D khi hidden và khôi phục khi visible, giữ nguyên native player/transport; dừng polling sảnh khi hidden.
- [x] Test giả lập CPU/RAM/touch, desktop/tablet/phone, đổi chất lượng, hidden/visible, renderer/media identity và hồi quy tổng hợp; không suy ra FPS/thermal thiết bị thật.

## Hành động nhanh và touch — 11/11/2026

- [x] Nút hành động/cảm xúc nổi, bảng chọn nhỏ; tách khỏi thiết lập góc nhìn, Escape/tap ngoài để đóng.
- [x] Hiệu ứng không khung/nhãn/tên; nhiều icon bay đa hướng, pháo bông xuất phát đa hướng, cùng âm hiện có và giới hạn hạt/reduced motion.
- [x] Chế độ nhìn quanh trên video cho mobile, kéo 1 ngón/pinch 2 ngón, zoom +/- và reset dễ chạm; không remount hoặc tự đổi native video.
- [x] Test popup, chạm thật qua CDP, pinch, cancel/blur, đồng bộ cảm xúc/âm thanh và hồi quy trước deploy.

## Nâng cấp trải nghiệm và agent skills — 13/11/2026

- [x] Nhập 29 skill có provenance, giữ hợp đồng dự án; validation cấu trúc và review theo skill được chọn.
- [x] Hiệu ứng cảm xúc/pháo bông dày hơn, ở giữa màn hình, không tên/khung; giới hạn hạt theo thiết bị, reduced motion và TTL vẫn áp dụng. Nâng lớp âm thanh tổng hợp, kiểm peak/cancel/cleanup.
- [x] Ưu tiên âm thanh cá nhân: video / tương tác / cân bằng; duck video khi hiệu ứng hoặc TTS, giữ thay đổi âm lượng thủ công và phục hồi khi mute/leave/đổi nguồn. Warning khi trình duyệt không hỗ trợ hoặc chặn âm.
- [x] Trải nghiệm rạp opt-in: rung camera nhẹ theo tương tác, giữ video bám màn chiếu; Off mặc định, tôn trọng reduced motion, giới hạn biên độ/thời gian, không hứa video lập thể hay phân tích âm thanh YouTube.
- [x] Media Session theo quyền host, Wake Lock opt-in theo phát/visible, phụ đề WebVTT local có validate dung lượng/encoding/timestamp và cleanup; fallback rõ cho iframe/thiết bị thiếu API.
- [x] Test unit, browser/multi-profile/mobile, ảnh UI, audio nodes/duck/restore, idle/visibility, native media, 100s local lease soak 3×10; hồi quy tổng hợp đạt trước release (source/version deploy xem PROJECT_STATE). Rollback: tắt tùy chọn cá nhân hoặc quay lại version trong PROJECT_STATE; không reset phòng.

Giới hạn vẫn giữ: pilot vật lý/GPU, sustained WAN/quota/rollback production, R2 activation/billing, TURN, full voice provider/consent và WebGPU depth-mask compatibility chưa được coi là đạt bằng giả lập. Số đo resource/idle hiện hành trong evidence là baseline, không phải FPS thiết bị thật.

## Hold cá nhân và thanh cảm xúc — 13/11/2026

- [x] Hold cho host/viewer: mute video cục bộ, giữ volume/mute trước đó, tiếp tục timeline, chat/voice/action/lease; giữ Hold khi đổi nguồn trong cùng phiên, reset khi rời/đổi phòng. Native và YouTube dùng mute API; Drive preview không cung cấp mute API nên phải có chặn/warning rõ trước khi mở.
- [x] Tách menu cảm xúc thành thanh icon ngang trong hàng nút dưới, tách hành động nhân vật; không che bảng/chat/transport, hỗ trợ bàn phím, Escape, giảm chuyển động và cooldown hiện có. Nghiên cứu preset thêm nhưng chưa đổi wire enum cho client cũ.
- [x] Kiểm tra host/viewer, nguồn mới, mute sẵn, volume thủ công, ducking, menu mở cùng bảng, 320px/landscape, zoom một tay và cleanup; hồi quy cuối đạt 44/44 bước, 102 logic cases, HUD 87 checks/89 ảnh. Bằng chứng và source/version release xem PROJECT_STATE.
- [x] Nghiên cứu nguồn chính thức và ghi phương án/rủi ro/acceptance cho screen share, slide, Spotify/Zing/phim, cảm giác mạnh và loto/ô ăn quan; ưu tiên đồ họa nhẹ, pin, codec, quyền nội dung và thiết bị thật.

Phương án, nguồn/giấy phép, thứ tự triển khai và acceptance chi tiết: [Shared activities proposal](ADVANCED_EXPERIENCE.md#shared-activities-proposal--researched-2026-11-13). Các mục đề xuất chưa phải tính năng đã phát hành.

## Trình chiếu và cảm xúc mở rộng — 13/11/2026

- [x] PDF/ảnh đồng bộ theo trang do host điều khiển; nội dung-mode riêng, không dùng seek video. Giữ native player mounted, tạm dừng phim khi bắt đầu; trở lại phim theo thao tác rõ ràng. Host/epoch/revision/dedupe vẫn áp dụng.
- [x] PDF.js lazy/pinned, tối đa 20 MiB/200 trang, ảnh raster giới hạn pixel; validate trước khi phát, giới hạn canvas hiện tại + trang tiếp, cancel/destroy/revoke khi đổi nguồn/thoát. Không đưa bytes vào DB.
- [x] Mở rộng file transfer theo allowlist tài liệu riêng; giữ đường media hiện hành, owner/current-recipient/connection guards, relay/backpressure và giới hạn tài nguyên; file/chunk/Blob cũ được giải phóng.
- [x] Thêm preset tim/cười/ngạc nhiên/chúc mừng/cảm ơn bằng variant của kind hiện có; strip cuộn gọn với nút đóng luôn nhìn thấy, âm thanh tổng hợp riêng, TTL/cooldown/reduced motion giữ nguyên.
- [x] Unit/server/security + hai profile PDF thật, lỗi/password/file quá lớn, thay trang nhanh, late join, đứt kết nối, đổi file/phòng, native player identity, audio cleanup và ma trận mobile; hồi quy đầy đủ trước push/deploy.

Các đợt tiếp theo và gate nhà cung cấp/thiết bị: [shared activities](ADVANCED_EXPERIENCE.md#shared-activities-proposal--researched-2026-11-13). Bản này hoàn thiện lát cắt slide và preset trước; chưa đánh dấu screen share, SDK nhạc hay game đã triển khai.

## Hướng phát triển Chill With Me — nghiên cứu 13/11/2026

- [x] Bổ sung ba skill chính thức có license/commit/SHA-256; áp dụng thiết kế, browser QA và bảo mật cùng các skill clean code/mobile hiện có. Validator kiểm cả cấu trúc và checksum, tổng 32 skill.
- [x] Mở rộng nghiên cứu ngoài game: timer tập trung, mood opt-in, thẻ trò chuyện, hẹn lịch/chia sẻ, chẩn đoán media, khoảnh khắc, bảng ý tưởng, PWA cache chọn lọc, lyric và Vimeo. Nguồn chính thức/ưu tiên/acceptance ở [product direction](ADVANCED_EXPERIENCE.md#chill-with-me-product-direction--researched-2026-11-13).
- [x] Đặc tả nghiên cứu luật/biến thể, nguồn, đồ họa, mobile, license và test cho [Ô ăn quan, lô tô, cờ gánh](VIETNAMESE_GAMES.md); không nhập engine thiếu kiểm chứng.
- [ ] Đợt sau bản PDF: triển khai chẩn đoán media cục bộ + timer chung, rồi thẻ trò chuyện/mood và prototype game có rule pack được kiểm chứng. Các tính năng này mới là kế hoạch, không đánh dấu đã phát hành.
