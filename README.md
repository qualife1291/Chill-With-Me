# Chill With Me · Cùng Xem

Rạp xem YouTube cùng nhau: 3 phòng, mỗi phòng 2–10 người; video đồng bộ, avatar 3D, chat và đọc tin bằng giọng thiết bị. **Public alpha**, chưa phải production.

**Web:** https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/?v=cinema6

**Đọc tiếp dự án:** [`AGENTS.md`](AGENTS.md) → [`PROJECT_STATE.md`](PROJECT_STATE.md). Hai file này ghi quy tắc, kiến trúc, tình trạng kiểm thử và việc tiếp theo; không cần đọc lại toàn bộ nghiên cứu.

## Tính năng

- Chủ phòng phát ngay; người vào sau xem tiếp timeline. Host duyệt vào/kick và điều khiển phát, tua, chuyển playlist.
- Rạp phủ màn hình; bảng chat, thành viên, playlist chỉ hiện khi bấm. Ghế phân tầng, hai góc camera và đầu nhân vật đồng bộ.
- Source mới có kéo chuột/vuốt nền rạp để nhìn quanh, D-pad/WASD, nút về giữa và toolbar gọn. Trạng thái đã deploy hay chưa: xem `PROJECT_STATE.md`.
- Bắt buộc host nhập link đầu tiên; hết playlist có nhắc thêm link. TTS giảm âm video khi đọc; không có gọi mic, NIM production hoặc clone giọng.

## Chạy local

Node.js 22+:

```bash
cd cinema
npm ci
npm run build
npm run serve
```

Mở URL Wrangler hiển thị, thường `http://localhost:8787`. Hai browser profile để thử realtime. `/?demo` chỉ mô phỏng local.

React/TypeScript/Vite/Three.js; backend Cloudflare Workers + SQLite Durable Objects + WebSocket. Video qua YouTube IFrame API riêng trên mỗi máy.

Lệnh test/deploy: [`cinema/README.md`](cinema/README.md). Tài liệu tham khảo chọn lọc: [`docs/INDEX.md`](docs/INDEX.md). Asset catalog là danh sách ứng viên; model hiện tại tự dựng bằng geometry.

## Giới hạn

23 test logic đã đạt. Browser regression dùng YouTube/speech mô phỏng; không thay thế pilot video thật, quảng cáo, autoplay/iOS và giọng tiếng Việt trên thiết bị. Chưa benchmark 30 người, chưa cam kết drift dưới 1 giây hay miễn phí vô hạn. Free tier có quota. Khóa API và dữ liệu giọng không nằm trong repo; push GitHub không tự deploy.
