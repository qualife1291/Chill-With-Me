# Ngân sách free tier và giới hạn sản phẩm

> **V3 supersedes,02/11/2026:** [Đặc tả hiện hành](THIET_KE_RAP_3D_V3.md): rạp3D, host chọn2–10ghế,3phòng/tối đa30người; playlist và approval/kick trong MVP. Các mức50/150, lựa chọn2D-only và timeline cũ bên dưới là baseline lịch sử, không phải yêu cầu mới. Budget/quality/security còn áp dụng khi không xung đột; xem v3 để biết luồng, số liệu và timeline thay thế.

Kiểm tra tài liệu ngày 01/11/2026. Quota có thể đổi; số dưới đây là mức công bố, chưa phải xác nhận quota còn lại của tài khoản. Có app khác trong tài khoản Cloudflare nên không được dành toàn bộ free allowance cho dự án này.

## 1. Các giới hạn đã đối chiếu

| Dịch vụ | Free allowance/điều kiện công bố | Tác động |
|---|---|---|
| Workers Static Assets | Asset requests miễn phí, không giới hạn theo trang tài liệu; Worker invocation tính riêng | Serve static trực tiếp, tránh SSR/polling |
| Workers Free | 100.000 request/ngày, CPU 10ms/request | API phải ngắn, không chạy inference |
| Durable Objects Free | SQLite-backed; 100.000 request/ngày; 13.000 GB-s/ngày | Cần hibernation, tránh chờ inference trong DO |
| DO SQLite | 5 triệu row read/ngày, 100.000 row write/ngày, 5GB lưu trữ | Chat/history/quota counters/cleanup đều phải tính |
| Supabase Free | 500MB DB, 1GB Storage, 5GB egress và 5GB cached egress riêng; pause sau 1 tuần không hoạt động | Không coi hai loại egress là một quỹ có thể cộng tùy ý |
| HF CPU Basic | Không phí theo giờ nhưng tạo compute Space thông thường hiện yêu cầu paid plan | Không được mặc định là lựa chọn 0đ |
| HF ZeroGPU | Free account đủ điều kiện: email xác minh, tuổi tài khoản >30 ngày; tối đa 2 Space | Chưa biết tài khoản user có đủ điều kiện |
| ZeroGPU sử dụng | Free account công bố 5 phút GPU/ngày; unauthenticated 2 phút, có queue | Phải xác minh caller nào bị tính quota khi tích hợp API |

Nguồn: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Supabase](https://supabase.com/pricing), [Spaces](https://huggingface.co/docs/hub/spaces-overview), [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu).

Chưa truy cập được Supabase changelog markdown qua công cụ web; curl cũng lỗi kết nối proxy. Trước implementation phải kiểm tra lại changelog và API hiện hành. Đọc account billing Cloudflare trả 403 vì OAuth không có quyền billing; không yêu cầu gửi secret trong chat, không suy ra tài khoản đang Free từ tên gói sản phẩm.

## 2. Budget model phòng/chat

Giả định minh họa: 150 người, 2 giờ/ngày, mỗi người gửi 1 application message/30 giây.

- Incoming WS: `150 × 7.200 / 30 = 36.000 message/ngày`.
- Tài liệu DO áp tỷ lệ 20:1 cho incoming message khi tính compute request: khoảng 1.800 request-equivalent, cộng upgrade/RPC/alarm/HTTP. Outgoing WS không tính request theo quy tắc này.
- Không suy ra 36.000 message là 36.000 row write: ping/telemetry không cần lưu DB. Chat và command durable mới ghi.
- Nếu ba room bị giữ active suốt 2 giờ: `3 × 0,128GB × 7.200s ≈ 2.765GB-s`, chưa tính đối tượng và công việc khác.
- Nếu giữ active 24 giờ: khoảng 33.178GB-s, vượt allowance 13.000. Vì vậy 150 concurrent không đồng nghĩa có thể miễn phí 24/7 ở mọi kiểu sử dụng.

Các phép tính là mô hình dự án, không phải kết quả đo. Phải theo dõi usage thực: hibernation eligibility, fanout CPU, retries và storage index có thể thay đổi đáng kể.

Ngân sách ban đầu đề xuất: tối đa 5.000 chat được lưu/phòng/ngày, 500 tin/phòng được giữ đồng thời, payload control nhỏ; cảnh báo ở 50% và giảm tính năng không thiết yếu ở 70% ngân sách được phân bổ. Giới hạn này chưa được user chốt; thay đổi sau pilot. Không thể ngăn toàn bộ request quota do tấn công chỉ bằng kiểm tra sau khi request đã đến Worker.

## 3. Budget model TTS

Giả định audio mono 32kbps, dài 5 giây: khoảng 20KB/clip.

- Một tin tổng hợp 1 lần, 50 người tải: khoảng 1MB egress, chưa headers/retry.
- Dành ngân sách 2GB/tháng cho audio TTS: khoảng 2.000 clip đầy phòng/tháng, khoảng 66 clip/ngày **tổng cả ba phòng**, trước overhead.
- Ở 48kbps, cùng thời lượng/số người: khoảng 1,5MB/tin; 2GB chỉ khoảng 1.333 clip/tháng.
- Giả định không dựa vào cached egress vì URL private/token/cache behavior phải thử thực tế. Nén không loại bỏ giới hạn băng thông.
- Quota GPU là giới hạn độc lập. Nếu gọi bằng một identity free có 300 giây GPU/ngày, capacity lý thuyết là `300 / thời gian GPU thực đo mỗi clip`, còn phải trừ enrollment/preview/retry. Không coi 50 người nghe là 50 quota GPU riêng.

Do đó **không thể hứa mọi tin của 150 người sẽ được clone và phát liên tục miễn phí**. Thiết kế vẫn giữ 150 người xem/chat, còn TTS có quota công khai; hạn mức phụ thuộc G0 và ngân sách.

TTS quota reservation phải atomic: reserve dự kiến trước inference, hoàn lại phần chưa dùng khi fail, chốt theo duration/bytes thực. Không báo “miễn phí vô hạn”; không dùng nhiều tài khoản để né quota. Không gọi demo của người khác làm hạ tầng lâu dài.

## 4. Các nhánh quyết định

| Nhánh | Có thể đưa ra web | Điều kiện | Trạng thái yêu cầu đầy đủ |
|---|---|---|---|
| A: Core + Web Speech | Xem chung/chat/TTS thiết bị | Cloudflare core đạt gate | Chưa đủ cloning/preset Việt đồng nhất |
| B: Core + ZeroGPU của dự án | Thêm preset và cloning giới hạn | Tài khoản đủ điều kiện, SDK/API phù hợp, quota và quality đạt | Đủ chức năng nhưng có hạn mức TTS công khai |
| C: Inference trên browser người gửi | Có thể giảm server inference | Cần R&D port ONNX/WASM, model delivery, mobile RAM/battery và quyền giọng | Chưa có source đã kiểm chứng đáp ứng đầy đủ; không chọn làm đường chính |
| D: Tài trợ compute | Có thể tăng chất lượng/capacity | Được provider chấp thuận thật | Không đưa vào cam kết trước khi có tài trợ |

Không chọn thuê VPS/GPU, không yêu cầu user có máy server, không tự chuyển trả phí. Nếu B/C/D đều không đạt, phần cloning bị chặn bởi tài nguyên; bản A chỉ là alpha và không được gọi là hoàn thành.

## 5. Điểm dừng và vận hành 0đ

- Dùng gói Free thực sự; xác nhận plan tài khoản trước deploy. Không có quyền billing không đồng nghĩa có thể bảo đảm chi phí bằng 0.
- Không bật auto-topup/paid fallback. Không tự nâng cấu hình khi lỗi capacity.
- Hết TTS quota: dừng nhận đọc mới, giữ chat chữ và viewer playback, báo thời điểm reset nếu biết.
- Hết DO/Worker quota: dừng retry dồn dập, frontend static giải thích trạng thái; không cam kết dịch vụ vẫn realtime.
- Storage gần đầy: purge audio hết TTL trước; không tự xóa reference còn active ngoài chính sách người dùng đã đồng ý.
- Cần báo riêng ngân sách của production, staging và các app khác trong account.

Quy mô miễn phí cuối cùng phải được công bố theo cả **concurrent users, giờ hoạt động, số chat/ngày, số TTS/ngày và thời lượng clip**, không chỉ một con số “150 người”.

## Hiệu chỉnh khi đánh giá NVIDIA NIM

Các ước tính audio32kbps chỉ áp dụng khi đã có codec tương ứng. NIM HTTP WAV PCM16 mono22.05kHz tạo khoảng220.500byte/clip5giây, tức11,025MB khi50người tải. Với budget2GB chỉ khoảng181clip/tháng trước overhead. Chưa có transcoder miễn phí được xác minh trong kiến trúc. API trial NVIDIA không đủ điều kiện production theo terms hiện đọc; không đưa vào ngân sách vận hành0đ. Xem [bộ kiểm thử NIM](NVIDIA_NIM_NGHIEN_CUU_VA_KE_HOACH_KIEM_THU.md).
