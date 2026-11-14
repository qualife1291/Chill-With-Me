# Chill With Me · Cùng Xem

Rạp xem phim/nghe nhạc cùng bạn bè: 3 phòng, mỗi phòng 2–10 người, avatar 3D nam/nữ, chat và đọc tin bằng giọng thiết bị. Source alpha; bản public có thể cũ hơn source.

**Tiếp tục công việc:** [PROJECT_STATE](PROJECT_STATE.md) → đọc đúng mục trong [kiến trúc](docs/ARCHITECTURE.md). [Roadmap](docs/KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) ghi rõ việc đã làm và cổng nghiệm thu chưa đạt; nghiên cứu cũ nằm trong archive.

- Host phát ngay, duyệt/kick thành viên, quản lý playlist. Có phòng riêng và link mời thu hồi được.
- YouTube, link media HTTPS và file local; MP3/M4A/WAV, MP4/WebM/MOV tùy codec. File phát xong được bỏ metadata khỏi DB và giải phóng tài nguyên client. Drive preview có giới hạn không đồng bộ.
- Sảnh 3D, model KayKit CC0, hai chế độ góc nhìn, walk/sit/wave và xoay đầu; chế độ nhẹ và giảm chuyển động. Native player giữ nguyên khi đổi camera.
- Trình chiếu PDF/ảnh đồng bộ, Hold riêng, cảm xúc, Ô ăn quan và lô tô trong cùng phòng. Luật có phiên bản, server kiểm quyền và giữ kín vé lô tô của người khác.
- Playlist import nhiều link/TXT/M3U, kéo thả hoặc nút bàn phím/chạm; xử lý chỉnh sửa đồng thời. Đồng hồ dùng RTT và thời gian monotonic.

```bash
cd cinema
npm ci
npm run build
npm run serve
# Terminal khác, sau khi cả ba phòng local trống:
npm run verify:local
```

Lệnh nghiệm thu tổng hợp cần Playwright/Chromium và ffmpeg; xem [runtime README](cinema/README.md). Không chạy test thay đổi phòng trên production.

Public: https://cung-xem-cinema-alpha.hoanglonglea1mtl.workers.dev/ . Source/version và kết quả deploy hiện hành chỉ ghi tại [PROJECT_STATE](PROJECT_STATE.md). Push GitHub không tự deploy. [Mục lục theo task](docs/INDEX.md) giúp đọc chọn lọc; roadmap giữ các gate thiết bị thật, WAN/quota, R2 và full voice còn mở.
