# Chill With Me · Cùng Xem

Rạp xem YouTube cùng nhau với phòng 3D, nhân vật, playlist và chat realtime. Bản hiện tại là **public alpha**, dành cho kiểm thử.

**Dùng thử:** https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/?v=cinema5

## Tính năng hiện có

- Tối đa 3 phòng; chủ phòng chọn 2–10 chỗ. Chủ phòng có thể phát ngay khi ở một mình; người vào sau tiếp tục theo timeline chung.
- Chỉ chủ phòng điều khiển phát, tua và chuyển video trong playlist của phòng. Duyệt vào phòng, kick, chuyển quyền chủ phòng và xử lý mất kết nối.
- Rạp phủ viewport; chat, playlist, thành viên và thông tin chỉ mở khi bấm. Ghế phân tầng, avatar, góc mắt người và góc trên cao phía sau nhân vật.
- Điều khiển hướng đầu bằng D-pad, WASD/mũi tên hoặc kéo pad; đồng bộ hướng đầu qua WebSocket.
- Chủ phòng phải nhập link ban đầu; Enter phát ngay. Hết playlist có thông báo và lời nhắc thêm link.
- Chat realtime; đọc tin bằng giọng tiếng Việt có sẵn trên thiết bị, giảm âm lượng video trong lúc đọc. Không có cuộc gọi mic realtime.

## Công nghệ và cấu trúc

React 19, TypeScript, Vite, Three.js/React Three Fiber; Cloudflare Workers và SQLite Durable Objects cho room state, quyền và WebSocket. Video dùng YouTube IFrame API trên từng máy, không tải lại hay phát lại stream qua server.

| Thư mục | Nội dung |
| --- | --- |
| [`cinema/`](cinema/) | Source frontend, backend, giao thức, test và kết quả kiểm thử |
| [`docs/`](docs/) | Kế hoạch, kiến trúc, bảo mật, đồ họa, ngân sách và nghiên cứu NIM |
| [`assets/sources.json`](assets/sources.json) | Danh mục nguồn asset tham khảo; chưa phải bộ model đã tải |
| [`design/`](design/) | Prototype thiết kế ban đầu; giao diện thực tế nằm trong `cinema/src` |
| [`scripts/nim-smoke.mjs`](scripts/nim-smoke.mjs) | Công cụ đánh giá NIM riêng, không tích hợp vào production |
| [`testing/nim/`](testing/nim/) | Corpus và trạng thái nghiên cứu giọng nói |

Các tài liệu nghiên cứu ghi lại nhiều giai đoạn. Tính năng hiện tại xem README này và [`cinema/README.md`](cinema/README.md); tài liệu cũ có thể mô tả đề xuất chưa triển khai hoặc giới hạn đã được sửa.

## Chạy local

Node.js 22 trở lên:

```bash
cd cinema
npm ci
npm run build
npm run serve
```

Mở địa chỉ Wrangler hiển thị, thường là `http://localhost:8787`. Dùng hai browser profile hoặc cửa sổ ẩn danh để thử nhiều người. `/?demo` là mô phỏng local, không kết nối những người khác.

Để phát triển frontend, giữ Wrangler chạy ở port 8787 rồi chạy `npm run dev` trong terminal khác. Cấu hình proxy nằm trong `cinema/vite.config.ts`.

## Kiểm thử và deploy

```bash
cd cinema
npm test
npm run cf:types
npx tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler worker/index.ts worker-configuration.d.ts
npm run worker:check
```

API integration và browser regression cần local server đang chạy; xem [`cinema/README.md`](cinema/README.md). Không chạy các bài test tạo/xóa phòng trên production.

Deploy vào tài khoản Cloudflare đã đăng nhập và còn quota phù hợp:

```bash
cd cinema
npx wrangler login
npm run build
npx wrangler deploy
```

`wrangler.jsonc` cấu hình Static Assets, binding `ROOMS` và migration SQLite `v1`. Đổi tên Worker khi triển khai bản riêng. Push lên GitHub **không tự deploy**; repo chưa cấu hình CI/CD hay chứa thông tin đăng nhập Cloudflare.

## Phạm vi đã kiểm chứng và giới hạn

20 ca logic về quyền, timeline, playlist, vòng đời phòng và phép chiếu đã chạy đạt trước khi xuất bản repo. [`cinema/evidence/fixes.json`](cinema/evidence/fixes.json) ghi phạm vi browser regression: hai phiên, host seek, quyền viewer, chat, hướng đầu, modal bắt buộc và bố cục mobile. YouTube và speech được mô phỏng trong browser regression; vẫn cần thử video thật, quảng cáo, autoplay/iOS và chất lượng giọng trên thiết bị thực tế.

Giọng đọc hiện dùng Web Speech API, phụ thuộc giọng tiếng Việt của OS/browser. Chưa có clone giọng hoặc NIM production; không có API key trong repo. Rạp/nhân vật là geometry tự dựng, chưa phải asset rig/animation hoàn chỉnh. Chưa có benchmark 30 người đồng thời hay cam kết độ lệch đồng bộ dưới 1 giây. Free tier có quota; không thể cam kết miễn phí vô hạn.

Guest session dùng cookie HttpOnly; backend kiểm quyền chủ phòng, origin, giới hạn phòng, dữ liệu đầu vào và command idempotency. Bản alpha vẫn cần kiểm thử thực địa, audit và hoàn thiện vận hành trước khi phát hành production.
