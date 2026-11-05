> Tài liệu lịch sử; không phải trạng thái source hiện tại. Tiếp tục từ [PROJECT_STATE](../../PROJECT_STATE.md).

# Quét source và phương án không thuê dịch vụ

> **Cập nhật v2 sau khi người dùng xác nhận không có máy server:** kết quả quét source ở mục 1–4 vẫn là bằng chứng khảo sát. Khuyến nghị local ở mục 5–6 và bước cần máy ở mục 10 đã bị thay thế bởi `docs/STACK_VA_KIEN_TRUC.md`. Phần giới hạn HF CPU miễn phí ở mục 7 cần đọc cùng `docs/NGAN_SACH_FREE_TIER.md`: CPU Basic không phí theo giờ nhưng tạo compute Space hiện có điều kiện paid plan; ZeroGPU free là nhánh có điều kiện riêng. Cấu hình snapshot timer và CPU quota TTS ở mục 8–9 chỉ là mô hình cũ, không phải cấu hình chốt. Hướng mới ưu tiên tham khảo Together/DO hơn fork WatchParty nguyên bản.

Ngày: 01/11/2026. Phạm vi đã chốt: 3 phòng × 50 người, YouTube đồng bộ, chat chữ và TTS bằng giọng cá nhân/preset nam–nữ. Không voice call, không WebRTC/SFU/TURN. Mic chỉ phục vụ thu mẫu giọng khi người dùng chủ động đăng ký.

## 1. Mức độ khảo sát

Đã lấy cây thư mục của 6 repo qua GitHub API, đọc chọn lọc code phòng/sync/TTS, LICENSE và README; đối chiếu thêm WatchParty đã nghiên cứu. Revision khảo sát ghi trong `SOURCE_SCAN_MANIFEST.json` (tree SHA hoặc commit SHA, có phân biệt). Đây là review tĩnh, không phải audit toàn bộ hay benchmark. Không chạy script upstream, không triển khai dịch vụ, không tải model lớn.

Danh sách dưới đây gồm 7 repo đã xem code liên quan; VoxCPM2 và XTTS là đối chiếu tài liệu/model card từ lượt trước. Chưa thấy repo nào trong phạm vi đọc đáp ứng sẵn toàn bộ yêu cầu 3×50 + cloning tiếng Việt + không mất phí hosting.

## 2. So sánh source xem chung

| Source | License đã đối chiếu | Phần phù hợp | Khoảng cách với dự án | Kết luận |
|---|---|---|---|---|
| [WatchParty](https://github.com/howardchung/watchparty) | MIT công bố trên repo, xem lượt trước | React/TS, Socket.IO, phòng/chat/điều khiển | Nhiều phần media/virtual browser ngoài phạm vi; chưa có cloning Việt tích hợp được xác minh | Ưu tiên làm mẫu tích hợp cho stack TS |
| [OpenTogetherTube](https://github.com/dyc3/opentogethertube) | LICENSE AGPL-3.0 | Multiroom, sync state, quyền, queue | Redis và kiến trúc rộng; phải tuân thủ AGPL nếu sửa/tái sử dụng code | Ưu tiên học thiết kế sync; ứng viên fork nếu chọn AGPL |
| [SyncTube](https://github.com/RblSb/SyncTube) | LICENSE MIT | Đồng bộ và chat, server timer rõ ràng | Một channel; source Haxe, cần sửa quản lý đa phòng hoặc chạy 3 instance | Phù hợp prototype tối giản, không phải nền TS thuận tiện nhất |
| [Together](https://github.com/chtnnh/together) | LICENSE Apache-2.0 | Room state, chat buffer, điều khiển theo quyền, mobile UI | Next.js + Cloudflare DO + PostgreSQL và tùy chọn Supabase; phải đánh giá quota/chi phí riêng | Tham khảo UI và room actor; không chọn nguyên stack cho phương án local |
| [WatchSync](https://github.com/Houdini99/WatchSync) | README ghi MIT; cây khảo sát không có LICENSE riêng | Rust/React, player adapter, chống seek lặp, room chat | Buffer-aware có thể dừng cả phòng; có HLS/proxy/resolver dư nhu cầu | Tham khảo; cần làm rõ giấy phép trước khi copy/fork |
| [SyncTV](https://github.com/synctv-org/synctv) | LICENSE tại snapshot hiện tại là MIT | Room/member/playback, fanout có event identity và version | Workspace Rust nhiều module, tích hợp provider và triển khai phức tạp | Tham khảo backend; không ưu tiên cho MVP 3 phòng |

Lưu ý: tài liệu cũ về SyncTV ghi AGPL nhưng LICENSE của snapshot vừa đọc là MIT. Khi tái sử dụng phải pin đúng revision và kiểm tra nguồn gốc từng phần, không suy giấy phép chỉ từ kết quả tìm kiếm.

## 3. Những phát hiện trực tiếp trong code

- **WatchParty:** `server/room.ts` có admission, reconnect, play/pause/seek và chat. Dùng làm mẫu luồng, nhưng cần bổ sung/hardening riêng cho room slot và membership nguyên tử theo yêu cầu. [Source](https://github.com/howardchung/watchparty/blob/master/server/room.ts).
- **OpenTogetherTube:** `server/room.ts` dùng `_dirty`, chọn trường syncable, debounce 50ms rồi gửi phần thay đổi; `docs/synchronization.md` tách state lưu trữ khỏi state gửi client. Nên áp dụng ý tưởng delta + không lộ state riêng. Không copy debounce trailing vô hạn: thiết kế mới cần giới hạn thời gian gom sự kiện và ưu tiên lệnh playback. [Source](https://github.com/dyc3/opentogethertube/blob/master/server/room.ts), [thiết kế sync](https://github.com/dyc3/opentogethertube/blob/master/docs/synchronization.md).
- **SyncTube:** `VideoTimer.hx` tách timeline khỏi handler; `Main.hx` xử lý sự kiện và broadcast. Một channel là hạn chế kiến trúc cần sửa cho lobby 3 phòng. [Timer](https://github.com/RblSb/SyncTube/blob/master/src/server/VideoTimer.hx).
- **Together:** `room-do.ts` có room state, chat giới hạn bộ đệm và kiểm tra quyền điều khiển. Phiên WebSocket trong file dùng `ws.accept()`; không thấy `acceptWebSocket()` trong file đã đọc, nên không được mặc định tuyên bố đã tối ưu WebSocket hibernation. [Source](https://github.com/chtnnh/together/blob/main/services/realtime/src/room-do.ts).
- **WatchSync:** `SyncEngine.ts` có seek cooldown, drift tolerance, xử lý buffering; README mô tả cả phòng dừng theo người bị stall. Với 50 người, đề xuất chỉ báo trạng thái người lag và cho họ bắt kịp. Điều chỉnh tốc độ nhỏ trong HTML5 không được bê nguyên sang YouTube nếu rate không được hỗ trợ. [Source](https://github.com/Houdini99/WatchSync/blob/main/frontend/src/sync/SyncEngine.ts).
- **SyncTV:** `fanout.rs` có prepared event, event identity/version và test định tuyến theo phòng. Có thể học cách giới hạn fanout đúng room; chưa benchmark để kết luận Rust của repo nhanh hơn lựa chọn TS. [Source](https://github.com/synctv-org/synctv/blob/main/synctv-api-common/src/fanout.rs).

## 4. Source TTS nên thử

**Ưu tiên VieNeu-TTS v3 Turbo chạy ONNX/CPU**, với hai preset nam/nữ và profile của người gửi. Code LICENSE và model card đều công bố Apache-2.0; vẫn pin đúng model/codec khi triển khai. Chưa cần GPU nếu máy hiện có vượt bài đo. [Repo](https://github.com/pnnbao97/VieNeu-TTS), [model card Turbo](https://huggingface.co/pnnbao-ump/VieNeu-TTS-v3-Turbo).

**VieNeu v3 Nano là ứng viên tiết kiệm CPU, không mặc định chọn chỉ vì nhanh.** Đã đọc `src/vieneu/v3nano.py`: ONNX CPU, giới hạn reference, hàm prepare_reference và thread count. Model card ghi preview, chất lượng thấp hơn Turbo, hỗ trợ cloning ở SDK mới. Card vẫn có đoạn cũ nói chưa release encoder trong khi phần cập nhật nói có; cần pin SDK/model rồi thử enrollment thật để giải quyết mâu thuẫn. [Code](https://github.com/pnnbao97/VieNeu-TTS/blob/main/src/vieneu/v3nano.py), [model card Nano](https://huggingface.co/pnnbao-ump/VieNeu-TTS-v3-Nano).

VoxCPM2 giữ làm đối chứng nếu giọng Turbo chưa đạt, không chọn mặc định cho máy yếu. Không lấy số RTF/first-audio upstream làm thời gian end-to-end của dự án. Không bật quantization int8 khi chưa kiểm tra hỗ trợ CPU và độ rõ tiếng nói.

Không triển khai model lớn trên tất cả điện thoại trong MVP: tải model, pin/bộ nhớ và tranh CPU với player có thể khiến trải nghiệm xấu hơn. Không gửi reference giọng riêng tư cho 50 client để họ tự clone. Web Speech API chỉ là fallback preset theo máy, không đáp ứng cloning và cặp giọng Việt đồng nhất.

## 5. Chọn hướng tái sử dụng

Khuyến nghị codebase TS gọn theo kế hoạch hiện tại, tham khảo luồng WatchParty và thiết kế sync của các repo; tích hợp VieNeu qua worker riêng. Chỉ fork WatchParty nếu thử nghiệm cho thấy việc bỏ các module dư và thêm TTS nhanh hơn xây phần lõi.

Nếu ưu tiên có giao diện chạy ngay: chạy thử WatchParty đầu tiên trong môi trường dev. Nếu muốn fork OpenTogetherTube, chấp nhận license AGPL và cân nhắc Redis/stack vận hành trước. Không ghép nguyên nhiều repo vào cùng dự án.

Gate chọn fork hay xây lõi: trong 2 ngày spike, đo thời gian dựng được 3 phòng, quyền host, late join/reconnect; liệt kê dependency bắt buộc và phần phải sửa. Chưa đủ dữ liệu để cam kết fork tiết kiệm bao nhiêu ngày công.

## 6. Kiến trúc không thuê dịch vụ

Phương án không trả phí API/hosting khả thi nhất là **chạy trên máy sẵn có**, với điều kiện máy đủ tài nguyên và đường truyền truy cập được. Chưa có thông tin phần cứng người dùng nên đây là kiến trúc có điều kiện.

```text
Trình duyệt ── YouTube trực tiếp
     │
     ├── HTTPS/WebSocket ── Node room coordinator
     │                            │
     │                        PostgreSQL local
     │                            │ job queue giới hạn
     │                        Python TTS worker
     │                            │
     └── HTTPS audio ───── thư mục audio riêng tư + web server
```

- Frontend build static và backend chạy cùng máy; không bắt buộc thuê CDN.
- PostgreSQL chạy local, không dùng DB trial hết hạn; chưa cần Redis.
- Audio/reference lưu disk local có quyền truy cập; web server phát audio sau kiểm tra membership, hỗ trợ Range và TTL. Không bắt buộc mua S3.
- Model load một lần, warm worker; giới hạn CPU/RAM để giữ headroom cho socket/player control. Cùng máy nhưng khác process.
- Không có dịch vụ voice call, GPU thuê, API TTS trả phí, tự động nâng gói hay overage.
- Để truy cập ngoài LAN cần đường vào HTTPS: IP/router phù hợp hoặc tunnel đủ quota và cho phép loại lưu lượng. Chưa chốt tunnel khi chưa biết NAT và điều kiện mạng; không hứa tên miền/tunnel luôn miễn phí.
- Máy tắt/ngủ thì phòng không hoạt động. Điện và Internet vẫn là tài nguyên có chi phí thực dù không có hóa đơn cloud mới.

Nếu không có máy để chạy: các free tier có thể dùng làm demo, nhưng chưa có bằng chứng đáp ứng ổn định đồng thời 150 người và cloning. Không thay đổi tiêu chí thành “chắc chắn miễn phí và không lag” khi chưa có tài nguyên.

## 7. Giới hạn dịch vụ miễn phí đã kiểm tra

| Lựa chọn | Điều kiện thực tế | Vai trò phù hợp |
|---|---|---|
| Render Free | Idle 15 phút thì sleep; WebSocket inbound được tính hoạt động; filesystem không bền; free Postgres hết hạn 30 ngày; có quota/bandwidth | Demo socket, không chọn làm dữ liệu giọng lâu dài |
| Hugging Face Spaces Free | Có tài nguyên CPU miễn phí; cần kiểm tra sleep/storage/quota; không có bằng chứng throughput cho tải này | Thử model trên Space do mình sở hữu, không gọi ké demo công cộng |
| Colab Free | Tài nguyên không bảo đảm; FAQ hạn chế web/media hosting không gắn interactive compute | Không dùng làm backend production |
| Máy sẵn có | Phụ thuộc CPU/RAM/upload/uptime | Lựa chọn ưu tiên để không thuê dịch vụ |

Nguồn: [Render Free](https://render.com/docs/free), [HF Spaces](https://huggingface.co/docs/hub/spaces-overview), [HF hardware](https://huggingface.co/docs/hub/spaces-gpus), [Colab FAQ](https://research.google.com/colaboratory/faq.html).

## 8. Thiết kế hiệu năng cho 150 người

### Realtime

1. Một authoritative coordinator; chỉ broadcast đúng phòng. Không gửi timestamp từng viewer cho mọi viewer.
2. Client tự ngoại suy timeline. Snapshot 5 giây/lần là điểm khởi đầu; lệnh host gửi ngay. 3×50/5 = 30 lượt gửi snapshot/giây, không phải 150×150.
3. Snapshot mục tiêu ≤1 KB cho playback, tách danh sách người/chat; khoảng 30 KB/s payload theo giả định trên, chưa overhead và event khác.
4. Presence delta gom tối đa 100–250ms; playback không bị chờ batch chat. Typing indicator tắt ở bản đầu hoặc throttle.
5. Telemetry drift chỉ gửi mẫu mỗi 10–15 giây; không ghi DB vị trí từng frame. Heartbeat/admission lease cập nhật theo batch có giới hạn.
6. Client chậm: giới hạn outgoing buffer, gộp state mới thay state cũ; quá ngưỡng disconnect và reconnect bằng snapshot. Chat đã lưu có cursor để tải lại, không giữ hàng đợi RAM vô hạn.
7. JSON schema, payload size và rate limit được áp dụng trước xử lý tốn CPU. Không dùng đồng bộ file I/O hoặc inference trong Node event loop.

### TTS

1. Một tin → một clip, tối đa 50 lượt tải. Cache scoped theo owner/profile version/text/model, không sinh mỗi người một bản.
2. Worker warm, reference embedding cache có giới hạn và invalidation khi xóa giọng. Không load model/encode reference lại mỗi tin.
3. CPU: bắt đầu một job inference toàn worker, round-robin ba phòng; tăng concurrency chỉ sau benchmark. Không mặc định tạo 150 thread hoặc 3 model copies.
4. Mỗi phòng một audio đang đọc, queue tối đa 5 tin/30 giây; admission theo cả số tin lẫn tổng thời lượng dự kiến. Cắt quyền nhận thêm job khi ước lượng tải vượt capacity.
5. Giới hạn ban đầu 6 tin đọc/phút/phòng, tối đa khoảng 5 giây/tin cho profile miễn phí trên CPU; điều chỉnh theo kết quả đo và UX. Chat chữ vẫn độc lập. Tin dài cho chọn đọc đoạn ngắn, không lặng lẽ bỏ nội dung.
6. Lỗi TTS/queue đầy → thông báo và chat chữ; không pause phim, không retry vô hạn. Fair queue để phòng nhiều người chat không chặn hai phòng khác.
7. Nén audio mono khoảng 32–48 kbps theo codec được browser hỗ trợ; có fallback codec, tránh phát WAV dung lượng lớn cho cả phòng. Giữ chất lượng mẫu đầu vào theo yêu cầu engine.

### Frontend

1. Virtualize lịch sử chat, giới hạn 100–200 tin trong DOM; load older bằng cursor.
2. Player không remount mỗi khi chat/member count thay đổi. Store playback tách chat; subscribe theo slice.
3. Animate reaction có giới hạn; tránh render 50 avatar mỗi tick. Giảm hiệu ứng trên mobile.
4. Giữ seek cooldown; một người buffering không tự pause 49 người khác. Rejoin chỉ áp snapshot mới nhất.
5. Audio/TTS off không tải clip nếu không cần; ngừng listener/audio/object URL khi rời phòng.

## 9. Bài đo bắt buộc trước khi gọi là tối ưu

- 3 phòng × 50 socket liên tục 2 giờ; burst 150 join, 150 chat; reconnect cùng lúc; người 51 bị từ chối.
- Trộn TTS và control: khi worker chạy hết tải, p95 ACK play/pause vẫn mục tiêu ≤500ms với RTT ≤150ms; theo dõi event-loop delay và disk latency.
- Đo model trên chính máy định dùng: Turbo fp32 trước, Nano đối chứng, int8 chỉ khi phù hợp. Ghi cold/warm latency, RTF, RSS, thread count và chất lượng giọng.
- 18 clip/phút × 5 giây = 90 giây audio cần sinh/phút. Một worker tuần tự có RTF 0,5 cần 45 giây tính toán/phút (75% sử dụng trước overhead), nên headroom mỏng; target tải ≤60% hoặc giảm quota TTS. Đây là phép tính minh họa, không phải kết quả benchmark.
- Với 48 kbps, mỗi clip 5 giây khoảng 30 KB. 18 clip/phút × 50 người ≈27 MB/phút, khoảng 3,6 Mbps upload trung bình; cần headroom cho burst/preload và HTTP. Không giả định mạng nhà nào cũng đủ.
- Target p95 drift ≤1 giây ở player foreground đang phát ổn định; báo cả tỷ lệ quảng cáo/buffering/autoplay block. Test thật ít nhất desktop, Android, iOS; socket giả không chứng minh chất lượng video.
- Soak kiểm tra hàng đợi RAM, TTL audio, xóa profile, disk đầy, TTS crash và client mạng yếu. Không tăng số người vượt 150 trước khi xác nhận khả năng.

## 10. Thứ tự triển khai tiếp theo

1. Xác nhận máy có sẵn và khả năng nhận kết nối Internet; không đăng ký gói trả phí.
2. Pin source/model/LICENSE, dựng prototype room/control/chat bằng nguồn tham khảo đã chọn.
3. Benchmark Turbo/Nano bằng preset và mẫu tự nguyện, không cần voice call.
4. Chọn mức TTS admission theo máy; triển khai queue/caching/cancellation.
5. Test 150 socket cùng tải TTS, rồi pilot player thật.

Nếu máy không vượt bài đo, phải giảm tần suất TTS hoặc đổi tài nguyên; không đánh đổi độ ổn định phim/chat để cố đọc mọi tin. Chưa có kết quả chạy thực tế trong báo cáo này.
