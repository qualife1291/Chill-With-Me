# Bảo mật, riêng tư và vận hành — 02/11/2026

> **V3 supersedes,02/11/2026:** [Đặc tả hiện hành](THIET_KE_RAP_3D_V3.md): rạp3D, host chọn2–10ghế,3phòng/tối đa30người; playlist và approval/kick trong MVP. Các mức50/150, lựa chọn2D-only và timeline cũ bên dưới là baseline lịch sử, không phải yêu cầu mới. Budget/quality/security còn áp dụng khi không xung đột; xem v3 để biết luồng, số liệu và timeline thay thế.

Đây là thiết kế kiểm soát và kế hoạch xác minh, **không phải kết quả pentest hoặc chứng nhận bảo mật**. Chưa có app/backend production. Mục tiêu: bảo vệ session, quyền host, mẫu giọng và ngân sách trong 3 phòng ×50 người.

## 1. Trust boundaries và dữ liệu

Browser là không tin cậy; Worker xác thực session; Room DO quyết định membership/role/revision; storage kiểm tra quyền; provider chỉ nhận text/reference tối thiểu. YouTube iframe là bên thứ ba, không cho truy cập dữ liệu chat/giọng của ứng dụng. Client không được quyết định userId, ownerId, host, giá quota hoặc tên object storage.

| Dữ liệu | Người được đọc | Lưu giữ đề xuất | Xóa/giới hạn |
|---|---|---|---|
| Guest session token | Cookie HttpOnly và backend | Idle2h, absolute24h; room lease riêng | Rotate khi đổi quyền; revoke logout/ban/session reset |
| Chat | Thành viên room session hiện tại | ≤500 tin/phòng hoặc7ngày | Xóa nội dung khi đóng phòng; tombstone event; không log text |
| Voice reference | Owner qua API, backend, provider cần thiết | Khi profile còn active | Profile inactive/quá trình đăng ký bỏ dở purge24h; yêu cầu xóa revoke ngay, purge mục tiêu24h |
| Generated audio | Thành viên hợp lệ được cấp quyền | TTL1h hoặc đóng room, mốc sớm hơn | Signed URL TTL60s; file đã tải không thu hồi được |
| Idempotency/job metadata | Backend | 24h hoặc session policy | Không chứa reference/text đầy đủ không cần thiết |
| Security logs | Operator được phép | 7ngày mặc định | ID giả danh, error code; không token/audio/chat body |
| Consent | Owner và operator cần thiết | Theo vòng đời profile và nhu cầu chứng minh thực tế | Chốt chính sách trước release; không tự đặt lưu vĩnh viễn |

Các TTL là lựa chọn thiết kế ban đầu, phải test alarm/cleanup/quota. Delete không có nghĩa provider chắc chắn xóa ngay; phải kiểm tra điều khoản retention từng provider và công bố khác biệt. Không sao lưu mẫu giọng vào repo, log hoặc analytics.

## 2. Threat model và test bắt buộc

| ID | Rủi ro cụ thể | Kiểm soát | Test phải đạt |
|---|---|---|---|
| SEC01 | Cross-site WebSocket hijacking qua cookie | WSS, exact Origin allowlist tại handshake, session server-side; từ chối missing/null Origin cho client browser route | Origin attacker/suffix giả/null không upgrade |
| SEC02 | Viewer gửi lệnh host | Kiểm tra role **mọi message**, gắn session epoch và membership | Tự sửa role/userId/client event không điều khiển được |
| SEC03 | Session cũ sống sau ban/logout | Revoke record, đóng socket; kiểm tra lại trước lệnh và job completion | Socket cũ không gửi chat/nhận event sau revoke |
| SEC04 | Lộ giọng/audio chéo phòng | RLS owner cho reference, ACL room cho generated audio; path random server cấp | A không preview/delete/sample B; room khác không cấp URL audio |
| SEC05 | XSS từ chat/title/nickname | Text rendering; không HTML/Markdown raw; URL link chỉ http/https và rel an toàn | Payload script/onerror/javascript không chạy |
| SEC06 | SSRF từ YouTube URL/referenceURL | Parse allowlist host + videoID; không generic fetch URL; không nhận remote referenceURL | localhost/private IP/redirect/userinfo/suffix giả bị chặn |
| SEC07 | File giả/giải mã tốn tài nguyên | Byte cap2MB trước đọc body, allowlist PCM WAV, parse header/frames với bounds, reject duration vượt model | MIME/extension giả, chunk length tràn, stereo/rate lạ, decompression bomb không tới provider |
| SEC08 | Spam hết quota/chiếm3slot | Per-session/IP/room/global budgets, create cooldown, slot lease, idle release, khóa mời | Guest đổi tên không reset budget; một room không chiếm TTS toàn hệ thống |
| SEC09 | Replay/race double charge | Idempotency key+transaction; quota reserve/settle/refund, unique job | Retry/mất ACK không sinh clip/trừ budget hai lần |
| SEC10 | Leaked API key | Secret chỉ server, environment tách, không query token trong URL/log | Scan bundle/source/log không chứa key; rotate không cần đổi frontend |
| SEC11 | Callback giả mạo và job cũ | Signature nếu provider hỗ trợ; nếu không poll authenticated server-side; kiểm tra job lease/profile version/epoch | Callback sai hoặc sau delete không activate audio |
| SEC12 | Supply-chain dependency | Lockfile, pin version/commit, review scripts/license, CI ít quyền | Build tái lập; không chạy upstream install script chưa review |

Không coi Origin là danh tính: non-browser có thể giả Origin, vẫn cần session/role/rate limits. IP chung NAT không đại diện một người; giới hạn IP chỉ lớp phụ. Guest ban không thể ngăn tuyệt đối người tạo phiên mới; phòng riêng/invite rotation và moderation hỗ trợ.

## 3. Authentication và authorization

Cookie đề xuất `__Host-session`, Secure, HttpOnly, SameSite=Lax, Path=/, không Domain. State-changing HTTP kiểm tra Origin và CSRF token; CORS exact origins, không wildcard với credential. Invite token đủ entropy ≥128bit, server lưu hash; exchange sau kiểm tra quyền rồi bỏ khỏi URL bằng history.replaceState. Không đưa token vào analytics/referrer; invite là quyền xin vào, không phải quyền host.

Room tạo mới: chủ phòng là identity từ server transaction, không lấy client role. Chuyển quyền xác minh host hiện tại + target membership; rotate credential/quyền theo thiết kế. Host grace30s; deadline xử lý server. Auth Supabase JWT phải verify signature/issuer/audience/expiry; không decode-only; không dùng user-editable metadata làm admin. Service-role bypass RLS nên mọi server call cũng cần kiểm tra owner explicit.

Session cookie và Supabase account là hai lớp cần mapping rõ. Không biến token Supabase dài hạn thành query WebSocket. Login/logout phải invalidate mapping phù hợp và không mất quyền host ngoài chủ ý; integration test guest → account → logout.

## 4. Upload và mic

Chỉ xin mic tại `/voice` sau click, release mọi MediaStreamTrack khi stop/cancel/route change/error. Permissions-Policy cho microphone self ở route enrollment; camera=(), geolocation=(); room không xin mic. MediaRecorder có thể xuất WebM/Opus hoặc MP4 thay vì WAV: bước chuyển sang PCM16 mono theo model là task bắt buộc, phải đo CPU/mobile; không chỉ đổi extension.

UI hướng dẫn thu10–15s để chọn đoạn sạch; adapter NIM dùng3–10s (mục tiêu5s), provider khác theo contract. Nếu không có converter phù hợp/free hoặc model chưa sẵn sàng, không mở enrollment production. Không upload giọng chưa được nghe lại và đồng ý; consent flag không chứng minh pháp lý tuyệt đối nhưng luồng phải rõ owner tự nguyện.

Validate reference hai lớp: client cho UX, server là quyết định cuối. Byte/duration/rate cap theo adapter, tên file random, bucket private, không SVG/HTML/avatar upload ở MVP. Signed upload URL phải bind object key owner, size/type policy nếu nền tảng hỗ trợ, rồi validate lại trước inference.

## 5. HTTP headers, CSP và YouTube

Baseline: CSP `default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`; script/frame/connect/img/media chỉ thêm origin thực sự cần từ kiểm thử YouTube/Supabase. Inline script không dùng trong app production; nonce/hash nếu bắt buộc. Preview HTML cục bộ có inline script minh họa, không phải CSP production mẫu.

Dùng CSP Report-Only staging để tìm origin cần thiết rồi enforce; không dùng wildcard để làm hết lỗi. `X-Content-Type-Options: nosniff`; HTTPS/HSTS sau xác minh deployment; referrer policy `strict-origin-when-cross-origin`. Không áp `no-referrer` đại trà: YouTube có thể yêu cầu HTTP Referer/client identity và báo lỗi153 khi thiếu. Invite secret đã exchange và xóa trước khi load iframe.

Không proxy/tải lại video, không che controls/logo/ads, không tách audio YouTube thành stream riêng. Player kích thước tối thiểu200×200 theo API; vùng mobile16:9 quá thấp phải tăng chiều cao. Xử lý video error100/101/150/153, autoplay blocked và quảng cáo như trạng thái có giải thích. Đồng bộ không vượt được chặn vùng hoặc quyền nhúng.

## 6. Signed URL và giới hạn thu hồi

Generated audio signed URL là bearer capability: người có URL có thể dùng đến hết hạn, kể cả vừa bị kick. Sửa tiêu chí “người ngoài phòng không tải” thành: **người ngoài không được cấp URL mới; URL đã cấp có cửa sổ tồn tại tối đa60s; audio đã tải không thu hồi**. Không gửi reference URL cho room.

Nếu cần revoke gần tức thì, dùng authenticated streaming proxy kiểm tra mỗi request; phải đo Worker requests/egress/Range và quota trước khi chọn. Không tự chuyển sang proxy cho150 người khi chưa budget. Private file không cache bằng URL công khai; CDN/cache key và expiry phải test thực tế. Sự kiện xóa chặn new playback nhưng không bảo đảm xóa file ở thiết bị khách.

## 7. Quota và chống lạm dụng

Session/chat/TTS/create/upload có budget riêng; giới hạn payload WS4KB, chat500code points, TTS120code points NFC, queue5/room/30s. Giới hạn concurrent sockets/membership kể cả reconnect; incoming quota/check trước DB write nặng. TTS global1 lúc đầu, tăng tối đa3 sau đo. Enrollment/preview có budget chặt vì chi phí inference vẫn tồn tại dù chưa vào room.

Phòng công khai cho guest có rủi ro chiếm chỗ; đề xuất private mặc định, create1slot/session, cooldown tạo1phút, phòng không người release sau60s, slot chưa có viewer/video release sau5phút. Các giới hạn phải dựa lease/activity đáng tin, không để heartbeat spam giữ phòng trống vô hạn. Operator có quyền revoke slot qua route bảo vệ riêng, có audit. Không bật dashboard admin công khai chỉ bằng URL khó đoán.

Challenge như Turnstile chỉ thêm khi cần chống bot và quota phù hợp; không coi là thay thế auth. Request bị chặn ở Worker vẫn có thể tiêu quota; free tier không bảo đảm chống cạn ngân sách do tấn công. Khi quota thấp: chặn TTS/enrollment trước, giữ core trong budget; không auto-upgrade.

## 8. Vận hành và ứng phó

- Deploy: staging namespace riêng; migration backward-compatible; lưu commit/artifact/version; smoke2browser trước promotion. Không sửa/xóa Worker của app khác.
- Rollback: app version có thể quay lại nhưng DB schema/data không tự quay lại; ưu tiên expand/contract migration, test rollback trước.
- Monitoring: join reject reason, active seats, WS reconnect, command latency, drift sample, TTS queue/errors/quota, row writes/egress. Không label metric theo raw text hoặc tên người.
- Incident key leak: disable adapter → rotate key → revoke affected sessions nếu cần → tìm phạm vi bằng metadata → kiểm tra bundle/log → phục hồi với quota hạn chế.
- Incident lộ reference: ngừng enrollment/read affected objects → revoke URLs/keys theo phạm vi → xác định object/user liên quan → xử lý và thông báo theo nghĩa vụ áp dụng; không hứa thu hồi bản sao đã tải.
- Provider down: circuit breaker và text fallback; không retry mọi room đồng loạt. DO/Worker quota hết: frontend hiển thị thông báo, jitter/backoff reconnect có trần.
- Backup: chỉ export cấu hình/schema cần thiết, mã hóa nơi phù hợp; chưa có dịch vụ backup được xác minh free. MVP có thể chọn chat tạm thời không restore; phải công bố RPO/RTO sau diễn tập, không ghi SLA giả.

## 9. Release gate bảo mật

Không còn lỗi critical/high chưa xử lý trong auth/ACL/secret/upload/quota. Test cross-room/host spoof/replay/XSS/Origin trên staging pass; cleanup/delete và URL expiry có bằng chứng. Dependency audit không đồng nghĩa pentest. Chỉ chạy security/load tests trên tài nguyên dự án được phép; không stress NVIDIA/YouTube.

## 10. Nguồn chính

- [OWASP WebSocket](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [Session](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- [OWASP Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality), [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
