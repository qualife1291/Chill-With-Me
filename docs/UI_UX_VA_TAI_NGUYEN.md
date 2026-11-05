# Thiết kế trải nghiệm, giao diện và tài nguyên — cập nhật 05/11/2026

## UI/UX đã triển khai — 05/11/2026

- Sảnh 3D có chọn cửa bằng chuột/bàn phím, thông tin chỗ ngồi và xem trước nhân vật nam/nữ; có chế độ nhẹ. Model KayKit có rig và CC0, manifest/hash tại `cinema/public/models`.
- Bốn camera, xoay đầu bằng kéo/vuốt/WASD/mũi tên/D-pad, ngoái thân, về giữa; camera mượt/reduced-motion, giữ nguyên YouTube iframe.
- Chat theo tin mới mà không kéo người đang đọc lịch sử; cảnh báo voice/autoplay, ổn định volume duck/restore. Không voice call/cloning.
- Host sắp xếp bằng nút có keyboard/touch 44px; viewer gửi đề xuất để host duyệt. URL được giữ khi lỗi, các thao tác cũ được báo và cập nhật lại danh sách.
- Layout mobile/landscape và idle demand-render có browser checks; usability/thiết bị thật/WCAG tổng thể chưa được nghiệm thu. Tham chiếu [plan hiện hành](KE_HOACH_TRIEN_KHAI_HIEN_HANH.md), [state/evidence](../PROJECT_STATE.md).

## Specification lịch sử ngày 02/11

Phần dưới là phương án/HTML preview trước implementation; không dùng các câu “chưa có app realtime” hoặc capacity 50 làm trạng thái hiện tại.

> **V3 supersedes,02/11/2026:** [Đặc tả hiện hành](THIET_KE_RAP_3D_V3.md): rạp3D, host chọn2–10ghế,3phòng/tối đa30người; playlist và approval/kick trong MVP. Các mức50/150, lựa chọn2D-only và timeline cũ bên dưới là baseline lịch sử, không phải yêu cầu mới. Budget/quality/security còn áp dụng khi không xung đột; xem v3 để biết luồng, số liệu và timeline thay thế.

Trạng thái tại ngày 02/11: specification và bản bố cục HTML để review; khi đó chưa có app realtime. [Xem bản bố cục](../design/cinema-preview.html). Tên tạm “Cùng Xem”; chưa kiểm tra thương hiệu/domain. Phạm vi giữ nguyên 3 phòng, 50 chỗ/phòng, YouTube, chat và TTS có điều kiện; không gọi mic trực tiếp.

## 1. Tham khảo và lựa chọn

Đã đọc trang/tài liệu chính chủ; chưa đăng nhập hoặc dùng thử tất cả sản phẩm, không gọi đây là usability audit trực tiếp.

| Nguồn | Áp dụng | Phần không đưa vào MVP |
|---|---|---|
| [Watch2Gether](https://w2g.tv/en/) và [hướng dẫn](https://community.w2g.tv/t/how-to-use-watch2gether/736) | Tạo phòng ít bước, mời bằng link, player và chat chung một trang | Nhiều nguồn media/extension |
| [Teleparty giới thiệu](https://dev.teleparty.com/) | Luồng chia sẻ party link, chat bên cạnh video | Extension và dịch vụ phim trả phí; trang www trả403 khi đọc, không suy diễn UI hiện tại |
| [Together source](https://github.com/chtnnh/together) | Mẫu room/role và responsive trong repo đã quét | Không fork cả Next/Postgres chỉ để lấy giao diện |
| [Watchparty source](https://github.com/howardchung/watchparty) | Host controls, danh sách người, trạng thái player | Virtual browser, công cụ media dư phạm vi |
| [shadcn/ui](https://ui.shadcn.com/docs) | Component sở hữu trong repo, dễ chỉnh theme | Không nhập cả bộ dashboard |
| [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) | Dialog, menu, focus và keyboard primitives | Thư viện không tự bảo đảm toàn app đạt WCAG |
| [WCAG2.2](https://www.w3.org/TR/WCAG22/) | Target AA: contrast, focus, keyboard, reflow, trạng thái | Không công bố chứng nhận trước audit |

Chọn **cinema dark tối giản**: video lớn, màu nhấn ấm, chat đọc dễ. Phương án “social dashboard” nhiều avatar/reaction gây nhiễu; phương án rạp3D tốn GPU và làm khó thao tác trên mobile. Hai hướng này chỉ là phương án thiết kế đã cân nhắc, không phải benchmark sản phẩm.

## 2. Kiến trúc thông tin và hành trình

Routes dự kiến: `/` lobby; `/r/:slot/:session` room; `/voice` hồ sơ giọng; `/privacy`; `/help`. Invite secret không đặt trong metadata/analytics; exchange vào session rồi bỏ khỏi URL. Không đưa private room title/video vào OpenGraph công khai.

- **Khách:** mở link → tên hiển thị → nhận chỗ từ server → bấm “Vào xem” → bắt kịp video → chat. Không buộc đăng nhập để xem.
- **Chủ phòng:** chọn slot trống → tên phòng, công khai/riêng → server cấp quyền → dán YouTube URL → xác nhận video → mời bạn. Đề xuất mặc định phòng riêng; UI lobby chỉ hiện “Phòng riêng • đang sử dụng”.
- **Người nghe:** tự bật “Đọc tin nhắn”; mặc định tắt lần đầu để không bất ngờ phát tiếng. Âm lượng TTS riêng, nhớ preference trên thiết bị, không gửi secret vào localStorage.
- **Người gửi:** “Gửi” là hành động chính; “Gửi và đọc” chỉ bật khi provider/capability/quota sẵn sàng. Tin chữ gửi thành công không bị đánh dấu thất bại chỉ vì TTS lỗi.
- **Giọng cá nhân:** đăng nhập → giải thích lưu/xóa và provider → chủ động thu mẫu → nghe lại → tạo câu thử → dùng giọng. Không có nút mic trong composer chat.
- **Rời phòng:** viewer rời ngay; host được chọn chuyển quyền/đóng/rời theo grace. Chỉ thao tác mất dữ liệu/quyền mới cần dialog xác nhận.

## 3. Màn hình và acceptance

| Màn hình | Thành phần | Trạng thái bắt buộc |
|---|---|---|
| Lobby | 3 room cards, số chỗ, tạo/join, trợ giúp | Loading, trống, riêng, đầy, cả3slot bận, API tạm lỗi |
| Join | Tên, quy tắc ngắn, nút vào | Link hết hạn, đang reconnect giữ ghế, người51, bị kick/ban |
| Room | Header nhỏ, player, status, chat, member drawer | Chờ host, phát/dừng, đang buffer cục bộ, mất đồng bộ, reconnect, đóng phòng |
| Host controls | URL input, quyền điều khiển, mời, moderation | URL sai, video không nhúng được, command pending/stale |
| Chat | History, composer, unread chip, TTS status | Pending/ACK/failed, xóa tin, spam cooldown, queue đầy, quota hết |
| Voice | Consent, record timer, preview, activate/delete | Chưa hỗ trợ, mic denied, silence, sample lỗi, provider bận, xóa đang xử lý |
| Help/privacy | Giới hạn free, quyền dữ liệu, cách sửa lỗi | Link truy cập được bằng keyboard và trên mobile |

Chat không tự kéo xuống khi đang đọc lịch sử; hiện “Có tin mới”. Enter gửi, Shift+Enter xuống dòng; không gửi khi IME composition còn mở. TTS ≤120 Unicode code points sau NFC; chat ≤500. Tin dài vẫn gửi chữ; người gửi chọn đoạn đọc rõ ràng, không âm thầm cắt nội dung. Đếm cùng quy tắc client/server; grapheme có thể khác code point nên UX phải giải thích nếu cần.

## 4. Layout responsive

Desktop ≥1100px: header64px; main `minmax(0,1fr) 340px`; video16:9; chat panel có chiều cao giới hạn, cuộn riêng; controls bên dưới iframe. Không đặt badge/button phủ lên YouTube player.

Tablet768–1099px: video full width, chat và danh sách người theo tab ở phần dưới. Mobile320–767px: một cột; video đầu trang, trạng thái/người xem ngắn gọn, chat phía dưới; composer tránh bàn phím và safe area. Không dùng fixed composer che nội dung khi zoom200–400%. Video trên màn nhỏ vẫn phải đáp ứng kích thước tối thiểu của YouTube; nếu vùng hiển thị quá nhỏ thì dùng layout khác, không bóp player.

Fullscreen chỉ dành cho player; chat là trải nghiệm ngoài fullscreen ở MVP. Không remount iframe khi đổi tab chat, resize thông thường hoặc tin mới. Người dùng thu gọn chat qua CSS, không reset playback.

## 5. Design tokens và component inventory

Token dùng chung nằm trong [tokens.css](../design/tokens.css). Nền `#0b0f17`, surface `#151d2b`, text `#f4f6fb`, muted `#b0bed1`, accent `#f3bd75`, danger `#ff9eaa`, success `#8eddb7`. Màu nhấn dùng chữ tối. Không chỉ dùng màu để báo online/error; kèm text/icon.

Font đầu tiên system-ui để không tải ngoài; tùy chọn self-host Noto Sans WOFF2 hỗ trợ tiếng Việt. Body16px line-height1.5; metadata14px; heading24–36px. Spacing4/8/12/16/24/32/48; radius12/16; controls cao44px; focus ring2px với offset3px. Target44px là tiêu chuẩn sản phẩm, cao hơn minimum24px WCAG2.2 có ngoại lệ.

Components: AppShell, RoomCard, CapacityBadge, JoinForm, PlayerFrame, SyncStatus, HostToolbar, ChatList, MessageRow, ChatComposer, VoiceReadStatus, MemberDrawer, ConsentPanel, Recorder, AudioPreview, EmptyState, InlineError, ConfirmDialog. Mỗi component có default/hover/focus/disabled/loading/error nếu áp dụng; disabled phải có lý do gần control.

## 6. Microcopy chốt hướng

- Room full: “Phòng đã đủ 50 người. Bạn có thể chọn phòng khác.” Không tự refresh join vô hạn.
- Autoplay blocked: “Bấm phát để bắt đầu xem cùng phòng.” Nút thao tác thật tại player/ngoài player theo API.
- Reconnect: “Đang kết nối lại… Video có thể tiếp tục trên máy bạn.” Không báo đã đồng bộ trước ACK.
- Host absent: “Chủ phòng mất kết nối. Điều khiển chung đang tạm khóa.”
- TTS quota: “Hôm nay đã hết lượt đọc. Bạn vẫn có thể nhắn tin.” Chỉ nêu reset khi backend biết.
- Clone unavailable: “Giọng cá nhân chưa khả dụng trong bản thử này.” Không hiện wizard thu mẫu vô ích.
- Local voice: “Giọng trên thiết bị — có thể khác giữa các máy.”
- Delete: “Xóa mẫu giọng và ngừng sử dụng giọng này.” Giải thích audio đã tải xuống không thu hồi được.

## 7. Accessibility và performance

Keyboard toàn luồng, tab order DOM hợp lý; dialog giữ focus và trả về trigger; Esc đóng trừ tác vụ chưa thể hủy. Nút icon có accessible name. Chat lịch sử không đọc lại hàng trăm tin qua screen reader: announcer polite có giới hạn, người dùng tắt được. Không tự bật TTS khi screen reader đang dùng; không cố phát hiện screen reader thiếu tin cậy, cung cấp lựa chọn rõ.

Respect reduced-motion; không confetti/blur nền động/animated equalizer liên tục. Captions YouTube giữ quyền sử dụng của người xem. Form label và error liên kết bằng aria-describedby; không placeholder thay label. Test zoom400%, viewport320, keyboard, VoiceOver/NVDA, high contrast. TTS không thay thế text.

Ngân sách đề xuất trước đo: app JS initial ≤150KB gzip không tính iframe YouTube; CSS≤30KB; UI decoration≤60KB; không ảnh hero lớn. Lazy-load voice recorder/settings. LCP≤2,5s, INP≤200ms, CLS≤0,1 ở p75 theo [Web Vitals](https://web.dev/articles/vitals); đây là target, không phải kết quả. Tách field data của app và tác động iframe; page load tốt không chứng minh sync tốt.

## 8. Nguồn đồ họa và giấy phép

| Tài nguyên | Nguồn/license | Quyết định chuẩn bị |
|---|---|---|
| Hình phòng, empty state | CSS gradient/hình học tự tạo trong preview | Đã có; không dùng poster phim hay ảnh stock |
| Icon | [Lucide ISC](https://lucide.dev/license), một số nguồn gốc có notice riêng | Chọn Film, Users, Link, Send, Volume2, VolumeX, Shield, RefreshCw, LogOut, Trash2; import từng icon; giữ license package khi cài |
| Font Việt | [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans), [OFL](https://github.com/google/fonts/blob/main/ofl/notosans/OFL.txt) | Candidate, chưa tải binary; tự host subset Latin+Vietnamese, giữ OFL |
| Component | [shadcn MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) + dependency notices | Chỉ dùng components cần, pin revision khi nhập |
| SVG bổ sung | [SVG Repo licensing](https://www.svgrepo.com/page/licensing/) | Không coi toàn site cùng license; chưa chọn/download asset |
| Video thumbnail | Metadata YouTube theo chính sách | Chỉ khi API/terms cho phép; không scrape poster Google Images |
| Avatar | Chữ cái + màu tạo cục bộ | Đã dùng trong preview; không avatar upload ở MVP |
| Âm báo | Không có mặc định | Tránh tranh âm với phim/TTS, không cần nguồn nhạc ngoài |

Asset manifest khi nhập thật phải có: file, upstream URL, tác giả, license/version, ngày tải, SHA256, sửa đổi, attribution. Moodboard không cấp quyền sao chép logo/screenshot đối thủ. Không dùng trademark YouTube làm logo app.

## 9. Bài thử usability trước code đầy đủ

5 người thử pilot (có ít nhất2 mobile), mỗi người: vào phòng từ link; tìm cách đồng bộ lại; gửi tin và nhận biết gửi/đọc khác nhau; tắt TTS; nhận biết phòng đầy; host đổi video và chuyển quyền. Mục tiêu ≥4/5 hoàn thành từng tác vụ không trợ giúp, không ai hiểu nhầm mic là voice call. Ghi thời gian/lỗi/lời nói tự nguyện, không thu dữ liệu riêng tư không cần thiết. Preview chỉ thử thông tin/bố cục; luồng player/mic phải thử app thật.

## Kiểm tra artifact

Đã kiểm tra link nội bộ, ID HTML, cú pháp JavaScript và contrast các cặp chữ chính. Browser automation chưa chạy được: Chromium bị môi trường chặn khi khởi động; chưa có screenshot hay kết luận responsive/keyboard thực tế. Xem [QA.json](../design/QA.json). Preview hiện dùng form submit bằng nút; Enter/IME behavior đầy đủ trong spec là yêu cầu implementation, chưa làm trong preview.

### Bổ sung mới nhất

[Kế hoạch đồ họa và công nghệ3D](DO_HOA_VA_CONG_NGHE_RAP_3D.md) cập nhật bố cục, asset pipeline, latejoin không chờ và timeline. Host một mình phát được;2chỉ là capacity nhỏ nhất.
