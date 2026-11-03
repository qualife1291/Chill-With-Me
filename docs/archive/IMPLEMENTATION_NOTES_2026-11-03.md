## Kéo để nhìn quanh — 03/11/2026

Giữ chuột trái hoặc vuốt trực tiếp trên nền rạp để chỉnh yaw/pitch; không chặn tương tác iframe YouTube. Input gộp theo animation frame, hủy khi mất focus/capture và giới hạn góc cổ hiện có. Toolbar dùng icon với vùng bấm 44px; có nút đưa view về giữa. Camera dự phòng giữ tỉ lệ 16:9 và dành chỗ cho toolbar/controls. Bản mới đã build/typecheck; browser regression cho thay đổi này đang chờ chạy trước deploy.

## Rạp toàn màn hình và điều khiển game — 03/11/2026

Phòng xem phủ toàn bộ viewport; header/footer sảnh không xuất hiện. Thanh nhỏ mở Thông tin/Chat/Playlist/Mọi người/Góc nhìn; mặc định các bảng đều ẩn. Nút⛶ yêu cầu fullscreen bằng gesture. Desktop mởsidebar sẽ thu vùngrạp, mobile chia vùng theo chiều cao để không che video.

Góc nhìn: D-pad nhấn giữ, WASD/mũi tên khi focusrạp, kéo vùng giữa pad. Không bắt phím khi nhậptext/IME hoặc dialog. Clickrạp đặt focus để hoạt động sau khi chat. Hướng đầu gửi WebSocket cógiớihạn150ms; finalpose lưu riêng sau600ms, không ghiDB từngframe. RemoteAvatar chủ động invalidate khi nhậnlook, không phụthuộcroomrevision. Tóc/tai hỗtrợ nhìn thấy hướngđầu rõhơn.

Host chưa có current/queue bắtbuộc nhập link vàEnter hoặc đóngroom. KhôngĐểsau, Esc khôngẩnform; requestduyệt không được chen lêntrước form này. Sauvideo cuối vẫn nhắcbằnggiọngmộtlần.

IframeYouTube cưỡngchế phủ100% vùngchiếu kểcảinline size doAPIđặt. Tấmplaceholder xanh được thaybằngmặtđen đểkhông thànhhai lớpkhi dock. Queue điều khiển playback gửi tuần tự đểtránhseekHTTP cũ ghiđèseekmới.

## Góc cổ và mở video nhanh

Góc mặc định nhìn vào tâm màn chiếu; camera trên cao đặt giữa trục rạp. Góc cổ yaw±75°, pitch xuống45°/lên35°, torso quay180° khi nhìn sau. Đầu có mắt/mũi để thấy hướng quay; tư thế cuối được đồng bộ sau600ms dừng thao tác, không gửi từngframe.

Host chưa có current/queue: modal giữa màn hình, Enter gọi start nguyên tử cógeneration; chỉhost dùng được. Hết clip cuối: queueEndedAt trong room state, modal mở lại và voice nhắc host một lần theo event; start clip mới xóa dấu kết thúc. Thông báo giọng dùng voiceViệt đã chọn trên thiết bị, có fallback cảnh báo khi máy không hỗ trợ.

## Bản cập nhật tầng ghế / camera / chat

- Hai tầng cho5–8ghế, ba tầng cho9–10ghế. Avatar tự tới ghế khi WebSocket được nhận; Ngồi ngay hoàn tất đường đi. Góc sau là camera trên cao nhìn về sân khấu.
- Trái/phải: click1°, giữ35°/giây, camera nội suy. Scene demand-render có invalidation khi đổi camera hoặc vị trí, dừng khi đứng yên.
- Video được chiếu đủ bốn góc; nếu không fit hoặc quay sau, dock giữa vùng xem. Iframe giữ nguyên, không trích xuất video.
- Viewer controls0/disablekb1; server từ chối seek/next của viewer. Native videoId ngoài queue được phục hồi. Ended chỉ host gửi Next có generation; cả phòng nhận item tiếp theo của queue.
- Chat quaWebSocket, delta một tin, lưu trước fanout, commandId dedupe; UI pending ngay, timeout2,5s fallbackHTTP cùngID. Giữ5s polling cho pending hoặc khi WebSocket không kết nối. Chưa phải benchmark độ trễproduction.
- Giọng đọc chỉ chọn voice Việt, chờ voiceschanged, có selector và nghe thử, rate0,95. Không dùng giọng ngoại ngữ khi máy thiếu voice Việt. Chất lượng vẫn phụ thuộcOS/browser, chưa có hostedclone.
- Regression mới có test quyền viewer, click1°, chặn recommendation, kết thúc chuyển đúng queue ở cả2phiên, WSchat và volume duck/restore. YouTube/speech được stub; cần pilot với video/voice thật.

## Cập nhật sau phản hồi test — 02/11/2026

- Host tua trực tiếp trên iframe gửi seek về timeline; không bị bộ đồng bộ kéo về mốc cũ.
- Snapshot có revision chống response cũ ghi đè; tự đối chiếu state mỗi 5 giây khi joined. Link mời chỉ rõ slot và session, không chỉ về sảnh.
- Yêu cầu vào hiện dialog giữa màn hình, hỗ trợ focus/Tab/Escape; player không bị pause.
- PlayerDOM chiếu theo bốn góc màn3D; khi góc không phù hợp hoặc quá nhỏ, dock giữ player tương tác được.
- Camera có trái/phải/ngoái sau/nhìn màn chiếu. Không remount player khi đổi camera.
- Đọc chat qua giọng thiết bị: đọc được cả tin đầu tiên, queue tối đa5; giảm video còn25% trong lúc đọc và restore nếu user chưa tự đổi volume. Lỗi/timeout/tắt đọc giải phóng queue.
- `evidence/fixes.json` ghi phạm vi kiểm thử; API YouTube/speech được mô phỏng, chưa chứng minh chất lượng tiếng Việt trên mọi thiết bị.

# Public alpha

URL: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev

Bản thử công khai ngày 02/11/2026. Assets gzip được đóng gói trong Worker khi upload qua connector; asset requests hiện tiêu Worker quota. Cấu hình Wrangler vẫn là hướng Static Assets dài hạn. Không có clone giọng.

Vòng đời mới: reservation 20s, reconnect grace 30s, pending TTL 120s, phòng trống đóng sau 60s; host có thể chuyển quyền hoặc chỉ định người kế nhiệm đang online. Alarm dùng chung cho mọi deadline. Các giới hạn cũ tương ứng bên dưới được thay thế bởi cập nhật này.

# Cùng Xem — implementation alpha 0.1

Bắt đầu triển khai02/11/2026. App có backend Cloudflare Durable Objects, chế độ demo cục bộ và public alpha theo URL ở trên; chưa phải release production.

## Chạy

Node22+:

```bash
npm ci
npm run build
npm run serve
```

Mở URL Wrangler in ra, thường `http://localhost:8787`. Backend, WebSocket và static assets cùng origin. Hai browser profile/incognito là hai khách khác nhau. `/?demo` chỉ mô phỏng local, không kết nối người khác.

Phát triển frontend: chạy Wrangler ở8787 rồi `npm run dev`; proxy API ở Vite. Test realtime khuyến nghị cùng origin Wrangler. Nếu môi trường không ghi được thư mục config mặc định, cấu hình XDG_CONFIG_HOME và WRANGLER_LOG_PATH tới thư mục writable của môi trường; không thay HOME.

```bash
npm test
npm run cf:types
npx tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler worker/index.ts worker-configuration.d.ts
npm run worker:check
node tests/api.integration.mjs
```

Integration cần Wrangler đang chạy và slot3 trống; chỉ dùng local test. Browser tests dùng Playwright có sẵn ở môi trường nghiên cứu và Chromium `/usr/bin/chromium`; đường dẫn runner cần chỉnh nếu chạy máy khác. Không đưa các test tạo/kick/close vào production.

## Đã có

-3slot, capacity2–10, host phát ngay, quản lý seat server-side.
-Guest session cookie HttpOnly, token ngẫu nhiên; public identity là hash token, không phát raw credential vào room.
-Host duyệt/từ chối, guest chờ không nhận chat/video, kick và ban trong phiên.
-Playlist thêm/xóa, Next, play/pause, anchor timeline, generation guard; YouTube iframe riêng, không trích xuất video/audio.
-Chat realtime WebSocket hibernation; state persisted SQLite; command session epoch và bounded idempotency log.
-Rạp procedural, đúng sốghế, avatar hìnhkhối, camera first/third, đường đi tới ghế, seat map fallback.
-TTSthiết bị opt-in, không mic/voicecall/clone. Không chứa API key NVIDIA.

## Giới hạn còn lại trước production

- Chưa benchmark 30 người trong 3 phòng suốt 2 giờ, chưa cam kết drift dưới 1 giây. Cần pilot YouTube thật với quảng cáo, autoplay, iOS, lỗi vùng và video không cho embed.
- Chưa có import/reorder playlist, private invite token, tài khoản người dùng hoặc operator moderation hoàn chỉnh. Room name hiện công khai ở lobby.
- Chat đã dùng delta WebSocket và optimistic UI; snapshot phòng vẫn được gửi cho các thay đổi state khác. Cần đo quota và fanout trong tải thật.
- Scene đã demand-render và có neck controls, projection/dock fallback. Avatar vẫn là geometry tự dựng, chưa có rig và animation ngồi/đi hoàn chỉnh hoặc collision phức tạp.
- Speech queue, giọng Việt tùy chọn và duck/restore đã có; chất lượng giọng phụ thuộc thiết bị. Chưa có hosted clone hoặc NIM production.
- Cần tiếp tục audit bảo mật, chính sách dữ liệu, moderation, quan sát lỗi, rollback và budget/anti-abuse. Free tier có quota, không bảo đảm miễn phí vô hạn.

Reservation 20s, reconnect grace 30s, pending TTL 120s, host transfer/successor và đóng phòng trống sau 60s đã được triển khai; không còn là backlog như ở tài liệu giai đoạn đầu.

## Evidence

`evidence/browser.json`, `evidence/realtime.json` và screenshots ghi phạm vi chạy thật. Node tests kiểm logic; API integration chạy runtime cục bộ, không chỉ mock. `wrangler deploy --dry-run` chỉ bundle/validate, không publish.

## Assets

Scene/avatars là geometry tự dựng; không dùng modelZIP chưa kiểmlicense. UI dùng Lucide package, giữ noticesISC/MIT củadependency. Font BeVietnamPro được gọi từGoogleFonts ở prototype; production nên selfhost cóOFL hoặc dùngsystemfont. Sourcecatalog ở `../docs/NGUON_FILE_DO_HOA.md` là shortlist, không bằng chứng đã tải.
