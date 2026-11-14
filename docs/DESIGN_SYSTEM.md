# Design system · StyleX pilot

Quyết định ngày 14/11/2026, sau khi người dùng yêu cầu tìm design system của Meta. Nguồn khớp là **[Meta StyleX](https://github.com/meta/stylex)**: hệ thống viết/biên dịch CSS, MIT, không archived tại lần đọc. URL cũ `facebook/stylex` chuyển tới `meta/stylex`. Không tìm thấy bằng chứng để áp dụng một framework có tên “astryx” thay cho nguồn này.

## Áp dụng hiện tại

- Pin `@stylexjs/stylex@0.19.2`, adapter `@stylexjs/unplugin@0.19.2`, peer `unplugin@2.3.11`; package/lockfile là source version. MIT notices trong `public/licenses/`.
- `src/designTokens.stylex.ts` là chủ sở hữu palette ngữ nghĩa: surface/text/muted/felt/wood/stone/accent/line. Stable `--cw-*` names cho CSS hiện hành dùng chung, không lặp palette trong nhiều component.
- `src/games/GameRules.tsx`: styles co-located, targets 44px, chữ/đường kẻ từ tokens. Vite compiler tạo CSS; `runtimeInjection:false`, không chèn style mỗi frame. Các API `defineVars/create/props` đã không còn trong lazy game JS của build pilot được quan sát.
- HUD dùng một biến `--active-sheet-width` cho lane thông báo thay vì lặp số 370/750 ở từng panel. Game layout và thông báo có kiểm tra portrait/landscape thật qua DOM/hit testing.
- Pure rules tách `shared/games/oaq.ts` / `loto.ts`; entry `games.ts` chỉ protocol/roles/state. OaqBoard tách khỏi GamePanel. Legacy imports được re-export để giữ contract/tests.

Đây là pilot có phạm vi. Không có cơ sở đo để tuyên bố framework làm toàn app nhanh hơn. Màu/spacing, renderer, iframe, canvas/world projection và quyền media giữ nguyên. Chưa đổi toàn bộ global CSS hoặc thêm bộ UI components khác. StyleX hỗ trợ Vite trực tiếp; tích hợp hiện dùng adapter chính thức, không dựng compiler tùy biến.

## Bằng chứng và mở rộng

Build trước pilot có entry JS khoảng 493.08 kB / 154.55 gzip; sau pilot khoảng 493.11 kB / 154.55 gzip. CSS entry tăng khoảng 0.3 kB gzip, lazy game JS/CSS còn dưới 10 kB gzip. Các số này bao gồm refactor/layout cùng đợt, **không phải benchmark A/B tách riêng StyleX**, không suy ra FPS/pin. Build release (bao gồm chẩn đoán mới): entry JS 495.96 kB / 155.44 gzip; lazy game 4.52 kB JS + 2.10 kB CSS gzip. Nghiệm thu 48/48 và public byte comparison xem PROJECT_STATE/evidence; không suy ra benchmark phần cứng.

Bước tiếp theo: chỉ chuyển component có lợi ích rõ về variants/theming, không tạo wrapper chỉ để đổi cú pháp. Theme lễ/ngày-đêm có thể cung cấp token values theo subtree sau khi qua [calendar/device gates](SEASONAL_EXPERIENCE.md); chưa bật theme tự động. Giữ CSS entry cho variables hoạt động ngay cả trước khi lazy game chunk tải. Kiểm cold-load token, UI screenshot/hitbox, reduced motion, bundle và CI Node 22/24 trước release. Rollback pilot bằng component/CSS cũ và lockfile khỏe, không reset dữ liệu phòng.

## Nguồn chính thức đã đọc

| Nguồn | Nội dung dùng |
|---|---|
| [README/giấy phép Meta](https://github.com/meta/stylex) | Tên, ownership, MIT; metadata và LICENSE đã đọc |
| [Installation](https://stylexjs.com/docs/learn/installation/) | Runtime/ESLint/compiler là các phần riêng; compiler được khuyến nghị |
| [Vite](https://stylexjs.com/docs/learn/installation/vite/) | Adapter, CSS entry, HMR với HTML entry, runtime injection |
| [Defining variables](https://stylexjs.com/docs/learn/theming/defining-variables/) | `.stylex.ts`, named exports, stable names có prefix `--`, theme scope |
| [Thinking in StyleX](https://stylexjs.com/docs/learn/thinking-in-stylex/) | Co-location, deterministic resolution, compile-time tradeoff |

Registry npm xác nhận phiên bản/peer/license khi cài. `stylexjs.com/llms.txt` trả 404; không giả định có một file đó hoặc tải toàn bộ docs vào agent context. Repo này dùng AGENTS → PROJECT_STATE → architecture/task owner để đọc có chọn lọc.
