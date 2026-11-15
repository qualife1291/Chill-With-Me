# Game 3D và hô số · quyết định 15/11/2026

Trạng thái/nghiệm thu/deploy ở [PROJECT_STATE](../PROJECT_STATE.md); [luật v1](GAME_RULES_V1.md) không đổi. Đây là quyết định render/audio và provenance, không thêm một bộ luật hay backend game khác.

## Nguồn đã kiểm tra

| Nguồn | Quan sát và áp dụng |
|---|---|
| [R3F scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) | Demand rendering, chia sẻ geometry/material, instancing, chủ động invalidate. Dùng renderer của rạp; không Canvas/WebGL context thứ hai hay physics loop |
| [Three.js](https://threejs.org/docs/) | Mesh/InstancedMesh/ExtrudeGeometry/CanvasTexture. Bàn Ô có hốc khoét beveled thật và quân nổi; texture gỗ/chữ/vé tự tạo, không external font/model/game asset |
| [MDN SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), [cancel](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel) | Giọng phụ thuộc hệ điều hành; cancel xóa toàn bộ queue trình duyệt, cần broker theo owner. Đây là đọc/hô lời, không API hát chuyên nghiệp |
| [Tone.js](https://tonejs.github.io/), [repository/license](https://github.com/Tonejs/Tone.js) | npm `tone@15.1.22`, MIT xác nhận từ registry và LICENSE. Framework Web Audio tạo nhạc/scheduling; không cung cấp lời/giọng hát hô số Việt sẵn |
| [Howler](https://howlerjs.com/), [repository/license](https://github.com/goldfire/howler.js) | npm `howler@2.2.4`, MIT xác nhận. Playback/audio sprites/spatial audio; phù hợp pack thu âm đã cấp quyền, không tự tạo câu hát Việt |
| [YoshimotoMasashi/vietnamese-loto-game](https://github.com/YoshimotoMasashi/vietnamese-loto-game) | CC0 metadata và tree đã đọc; không thấy audio/song assets trong tree đã kiểm. Không suy ra có pack hô số để nhập |
| [tiennm99/loto](https://github.com/tiennm99/loto) | Search metadata nêu Apache-2.0 và app bảng số. Chưa audit nội dung/giọng/assets; không nhập hoặc gọi là thư viện hô hát |
| [Happy-Loto-Web](https://github.com/xuanhai0913/Happy-Loto-Web), tobycloud/loto, bonchoituot/loto | Metadata/tree tham khảo; không thấy grant license xác nhận qua metadata đã đọc, không tái sử dụng audio/code. Bing trả kết quả rộng/lạc đề, không dùng làm bằng chứng có thư viện được cấp phép |

Các nguồn HTTP chính ở trên trả 200 khi đọc 15/11. Giấy phép framework không cấp quyền với một bài hát/giọng/clip bên ngoài. Chưa xác minh được một gói thu âm hô hát Việt có provenance và giấy phép đủ rõ để ship. Không tuyên bố không tồn tại gói như vậy.

## Triển khai

- **Bàn phẳng / Bàn 3D** là lựa chọn cá nhân, mặc định phẳng. 3D dùng chính Canvas/context hiện tại, đổi viewport và camera trong lúc chơi; group cảnh rạp tạm ẩn, native player vẫn mounted/tiếp tục timeline và Hold. Rời bảng khôi phục cảnh; không auto-dock hay tạo video khác. Chọn 3D từ light mode là thao tác bật 3D rõ ràng; context loss về fallback hiện có.
- Ô: mặt gỗ có 12 hốc ExtrudeGeometry, tối đa sáu viên trang trí/ô qua một InstancedMesh và số đếm thật; quan tách riêng. Chạm ô hợp lệ hoặc dùng bộ chọn 44px rồi chọn chiều. Góc bàn có slider; viewport chừa riêng lane điều khiển, phone/landscape có bàn dọc khi phù hợp.
- Lô tô: lồng cầu và giá đỡ, bóng số hiện tại, vé chỉ của viewer; không render/decode deck hoặc vé người khác. Chuyển động hữu hạn 850ms sau thao tác, không quay lồng liên tục; reduced motion dừng ở kết quả. Labels/wood/ticket textures được dispose khi thay/đóng.
- **Hô số** có Off / Đọc số / Hô vui + nhạc. `shared/lotoCalls.ts` chứa 90 câu gốc do dự án viết, ba intro/nhịp xác định từ round/count công khai để các máy cùng câu. Âm nhạc gốc sáu nốt pentatonic hữu hạn dùng lại AudioContext/limiter hiện hữu; không thêm Tone/Howler vào bundle khi chưa cần pack/transport phức tạp.
- Chọn giọng Việt/tốc độ ở phần Chat; không dùng voice tiếng Anh thay âm thầm. Số và lời luôn đọc được bằng mắt. Thiếu/chặn Speech API có thông báo; `Nghe thử` không rút số. Hô bằng TTS theo thiết bị, **không phải bản thu nghệ sĩ hay giọng hát sinh bằng AI**.
- Chỉ gọi số mới, latest wins; không queue 90 câu. Tuổi event dưới 4.5s, không phát khi hidden; snapshot/reconnect có baseline; pause/mute/leave/session dọn voice/nhạc. Timeout 8s. Host dùng giọng hô có thể chờ hết câu, server vẫn giữ tối thiểu 3s/lần và không phụ thuộc autoplay của khách.
- `speechBus.ts` sở hữu browser queue: lô tô ưu tiên nên có thể ngắt phần chat đang đọc; chat chờ được tiếp tục sau khi câu hô kết thúc, text chat luôn giữ nguyên; cancel chỉ owner, callback cũ không được đổi ducking. Ưu tiên âm thanh/ambience dùng trạng thái speech chung; mute tương tác dừng hô, Hold chỉ mute video.

## Nghiệm thu và bước sau

`tests/game-experience.test.ts`: 1–90/lời gốc/bounds, layout hốc, broker preemption/defer/cancel/synchronous error. `tests/game-stage.cjs`: Worker thật, two-profile, picking, viewport/hit lanes, idle/reduced motion, context/player/Hold, resource release, real WebAudio nodes, speech/visibility/provider fixtures khai báo. Toàn bộ hồi quy qua `verify:local`; kết quả/count thuộc evidence.

Chưa có pilot nghe thực iOS/Android/M1 hoặc chứng nhận FPS/pin/acoustics. Để có **hát thu âm**, bước tiếp theo là pack theo số/variant với manifest credit/license/performer consent/checksum/duration/loudness, codec fallback và clip hữu hạn. Chỉ lúc đó cân nhắc Howler audio sprites; nếu nhịp/transport cần nâng cao thì lazy Tone.js. Không bật provider/billing hay đưa hàng chục MB audio vào entry bundle để minh họa.
