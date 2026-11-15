# Security review · 13/11/2026

Review phạm vi thay đổi PDF/ảnh, file relay, cảm xúc, dependencies và đường phục vụ asset. Dùng `security-best-practices` (React/browser), `api-security`, `dependency-supply-chain` và `privacy-data-governance`; đây là code review và kiểm thử local, không phải pentest toàn hệ thống. Bằng chứng nghiệm thu cuối ở [verification](../cinema/evidence/verification.json); header/asset public chỉ được xác nhận khi [production](../cinema/evidence/production.json) khớp source phát hành.

## Đã sửa · mức cao

**01 · Advisory Zod về tiêu thụ bộ nhớ khi validate collection có giới hạn.** Bản Zod 3 trước nâng cấp nằm trong dải ảnh hưởng của [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Đã pin `4.6.7`, cập nhật lockfile và kiểm lại schema/API thay vì dùng `npm audit fix --force`. [package.json](../cinema/package.json). Advisory xác định rủi ro thư viện, không chứng minh đã khai thác được qua request của ứng dụng. Snapshot `npm audit --json` sau sửa báo **0 advisory cho toàn cây**, gồm runtime và dev, tại lần kiểm tra ngày này; không phải bảo đảm không có lỗ hổng mới.

## Đã sửa / giảm thiểu · mức vừa

**02 · Sai lệch header giữa embedded artifact và Static Assets đang chạy.** GET public trước sửa thiếu `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; header nằm trong bundler không tự áp dụng cho Static Assets đi thẳng qua Cloudflare. Thêm [public/_headers](../cinema/public/_headers), bundler đọc cùng policy, verifier kiểm header trên URL public. Không bật HSTS hoặc CSP chưa thử nhà cung cấp. Không suy ra đã deploy chỉ từ file cấu hình.

**03 · Tài liệu nhỏ theo byte vẫn có thể tạo canvas/bitmap quá lớn.** [presentation.ts](../cinema/shared/presentation.ts), [imageDimensions](../cinema/shared/presentation.ts), [documentRasterSize](../cinema/shared/presentation.ts): 20 MiB, 200 trang, đọc kích thước ảnh trước decode, tối đa 16M pixel; canvas chặn cả hai cạnh và diện tích, kể cả tỉ lệ cực đoan. Không nhận HTML/SVG; WebP động bị từ chối. [PDF loader](../cinema/src/presentationDocument.ts): giới hạn ảnh/canvas, tắt XFA, không render annotations/link widgets hoặc gắn scripting UI; load/render có cancel và timer, destroy worker khi đổi/thoát. PDF.js 6 không còn option `isEvalSupported` của các bản cũ; không ép kiểu để thêm option không tồn tại. Đây là giảm thiểu, **không phải sandbox hay quota bộ nhớ cứng cho mọi PDF độc hại**. PDF.js vẫn là parser cần được cập nhật/giám sát advisory.

**04 · Mở rộng relay sang hai nguồn có thể làm attachment vượt 2 KiB.** Review thiết kế phát hiện nếu giữ cursor cho cả phim và PDF với key dài, 9 người nhận có thể vượt ngân sách attachment. Chỉ nguồn **đang hiển thị** được relay bằng [sharedFile](../cinema/shared/presentation.ts); giữ key recipient cũ, tối đa 9 cursor. Phim nhận xong vẫn giữ Blob cục bộ; transfer chưa xong tạm dừng rồi nối lại sau deck. [Worker](../cinema/worker/index.ts) và [source](../cinema/worker/index.ts) giữ owner/recipient/session/connection/offset/size/backpressure guards. Không relay file chỉ vì nằm trong queue. [Regression](../cinema/tests/presentation.test.ts) đo attachment 9 cursor và throttle fields. Lỗi thiết kế này được xử lý trước release, không phải sự cố production đã quan sát.

**05 · Callback WebRTC cũ có thể đóng transfer mới.** Sau chuyển PDF → phim, promise lỗi của peer cũ không được hủy peer thay thế. [FileShare](../cinema/src/FileShare.ts) cùng các callback kiểm identity/file trước fail/close. [Regression](../cinema/tests/presentation.test.ts) tái hiện promise cũ lỗi sau khi movie transfer đã được tạo lại.

## Đã sửa · mức thấp

**06 · Bitmap giải mã xong sau abort chưa được đóng rõ ràng.** Nếu rời phòng trong lúc `createImageBitmap` chưa trả về, cleanup đã đánh dấu resource đóng; bitmap trả về muộn từng bị bỏ qua bởi guard idempotent, phải chờ GC. [presentationDocument](../cinema/src/presentationDocument.ts) đóng bitmap trước guard và xóa reference. Browser regression giữ một bitmap giải mã thật, đóng phòng rồi mới thả kết quả, kiểm `close()` đúng một lần và PDF worker đã dừng. Đây là sửa vòng đời tài nguyên; chưa có bằng chứng khai thác hoặc đo rò rỉ kéo dài trên thiết bị thật.

## Các ranh giới đã review

- Người chưa duyệt không được nhận tên/file metadata; DTO pending không chứa room. Host/session/generation/revision được enforce ở reducer/Worker, không dựa vào việc ẩn nút. Start/slide/stop có CAS; revision vẫn tăng sau stop để tránh ABA; video command trễ bị chặn khi deck đang hoạt động. File UUID không được trùng media đang phát/queue. [model](../cinema/shared/model.ts), [tests](../cinema/tests/presentation.test.ts).
- Reaction variant là allowlist và phải khớp kind cũ; DTO chỉ id/kind/time/variant, không actor/name. Cooldown/TTL/dedupe giữ nguyên. [model](../cinema/shared/model.ts), [tests](../cinema/tests/presentation.test.ts).
- Không tìm thấy `dangerouslySetInnerHTML`, `innerHTML`, `eval()` hoặc `new Function` trong `src/worker/shared` của ứng dụng ở lần quét này. Không phải chứng minh các thư viện không dùng API tương tự. Tên file/chat render như text; không chèn tài liệu vào DOM HTML.
- SQLite chỉ có metadata nguồn hiện tại, không byte PDF/media/recording. Stop/owner leave/expiry/room close thu hồi tài liệu. Peer vẫn nhận file được chia sẻ sau approval; người nhận có thể lưu hoặc chụp nội dung, nên không hứa E2EE hay ngăn sao chép.
- PDF.js lazy, pin version và giữ license; fonts/decoder tải từ asset của dự án. Ba skill mới pin commit/checksum/license, validator phát hiện file lệch hash; chỉ là hướng dẫn agent, không code chạy trên trình duyệt. [Provenance](../.agents/official-skills.json).

## Còn mở · chưa phải chứng nhận an toàn

1. CSP enforce cần inventory và pilot YouTube/Drive/HLS/WebRTC/PDF worker/font/WASM trước khi bật. Native YouTube API là script nhà cung cấp mutable; chưa có SRI cố định. Không gắn một CSP chặn nhầm playback để lấy dấu “đã bật”.
2. Parser/resource limits, STUN/direct transfer và byte relay local không chứng minh an toàn/throughput/quota mọi file hoặc WAN. Cần pilot thiết bị và kiểm tài nguyên kéo dài; bundle embedded hiện vượt guard free-code nên release dùng Static Assets, không đổi billing.
3. Operator moderation/privacy/retention quy trình, full voice consent/provider và thông báo ngoài phòng vẫn là gate trong [roadmap](KE_HOACH_TRIEN_KHAI_HIEN_HANH.md). Không có mic/recording/provider mới được bật qua bản này.

Không kiểm thử tấn công hoặc thay đổi phòng production. Chỉ GET/HEAD kiểm artifact/header và đọc room summaries khi release. Mọi test mutation dùng Worker local.

## Review bổ sung · game và StyleX · 14/11/2026

- [Protocol](../cinema/shared/games.ts) nằm sau admission/session/epoch/dedupe hiện hữu, kiểm host/player và revision tăng kể cả close/open. Clone trước khi mutate bảo toàn atomic khi random/luật lỗi. Không nhận seed, ticket, score hoặc số gọi do client chọn.
- [DTO](../cinema/shared/games.ts) luôn bỏ `secrets`, kể cả host; chỉ gửi bản sao vé của chính viewer. Pending vẫn không nhận room. Deck và vé khác chỉ ở snapshot server hiện tại, không tạo lịch sử ván. RNG dùng `crypto.getRandomValues`, rejection sampling có giới hạn; vé/deck riêng, không tiền/cá cược. Tests phủ out-of-turn, CAS/ABA, lỗi atomic, privacy, draw cooldown, đồng thắng và rời phòng.
- [Ô ăn quan](../cinema/shared/games/oaq.ts) chặn 500 lượt/4096 lần rải một lượt, bảo toàn quân; lô tô ≤10 vé/90 số, retries hữu hạn. Phần tử trang trí bị chặn số lượng; game lazy 2D, không thêm renderer. Đóng bảng vẫn giữ native media; khi mở ngừng world GPU.
- StyleX runtime/compiler/peer pin trong lockfile; CSS biên dịch, runtime injection tắt. MIT notices ship cùng asset; không nhập HTML/CSS từ người dùng. Audit toàn cây sau cài báo 0 advisory tại lần kiểm tra, không phải chứng nhận thư viện luôn an toàn. Năm skill mới do dự án viết có provenance, không giả là skill Meta.
- [Chẩn đoán](../cinema/src/PlaybackDiagnostics.tsx) chỉ đọc native video khi người dùng yêu cầu, một timer 8 giây; dừng khi hidden/đóng/đổi nguồn/rời, không đọc URL ra UI, không ghi DB/upload/recording. Các số đo không vượt iframe origin để giả lập thống kê YouTube.

Rule pilot với người biết luật, phần cứng thật và mọi gate vận hành/provider nêu trên vẫn mở. Chỉ kiểm thử mutation trên local.

## Review bổ sung · 3D/hô số · 15/11/2026

- Không đổi schema, role/CAS hoặc rút số; 3D chỉ render DTO đã duyệt và vé chính viewer, bóng trang trí không chứa bộ tương lai. CanvasTexture chỉ nhận số/lời gốc nội bộ, không HTML/URL/asset từ người dùng. Không thấy thêm dynamic HTML/eval hoặc raw global Speech cancel ngoài broker.
- `speechBus.ts` phân owner, chặn callback cũ sau cancel/preempt, giữ queue chờ hữu hạn; lỗi speak đồng bộ được xử lý. Hô số snapshot/reconnect/hidden/paused không phát lại, mute/exit dọn music/voice; bài/giọng nghệ sĩ chưa nhập. Không thêm provider, credentials, dependency hoặc thay đổi billing.
- Một context/renderer; geometry, bounded original textures và sáu oscillator được giải phóng. Camera fit được kiểm bằng Three.js projection độc lập; browser kiểm picking, 320px/landscape, idle/reduced, mode cycling, private cards, Hold và media identity. Không suy ra phần cứng, acoustic quality hoặc recorded-song rights từ fixtures.
