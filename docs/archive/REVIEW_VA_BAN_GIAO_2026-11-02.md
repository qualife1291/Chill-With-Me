> Tài liệu lịch sử; không phải trạng thái source hiện tại. Tiếp tục từ [PROJECT_STATE](../../PROJECT_STATE.md).

# Review tổng thể và kế hoạch bàn giao — cập nhật 05/11/2026

## Tổng quan hiện tại

Ứng dụng realtime đã có source, test local và bản alpha cũ trên Cloudflare. Source mới có sảnh 3D, model nam/nữ CC0, rig animation, bốn camera, xoay đầu đồng bộ, chat/voice thiết bị, host reorder và viewer suggestions. Bản source mới chưa được deploy vì thiếu Cloudflare credential.

Xem [bảng nghiệm thu hiện hành](../KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) để phân biệt **đã có code/test local**, **cần thiết bị/provider/quyền triển khai**, và **backlog full scope**. Số liệu và report chuẩn ở [PROJECT_STATE](../../PROJECT_STATE.md). Không gọi toàn bộ plan hoàn tất hoặc các gate production đã đạt.

## Review lịch sử ngày 02/11/2026

Phần dưới ghi quyết định trước khi source hiện tại được triển khai; các câu “chưa có app” và số liệu 50/150 không mô tả phiên bản hiện tại.

> **V3 supersedes,02/11/2026:** [Đặc tả hiện hành](../THIET_KE_RAP_3D_V3.md): rạp3D, host chọn2–10ghế,3phòng/tối đa30người; playlist và approval/kick trong MVP. Các mức50/150, lựa chọn2D-only và timeline cũ bên dưới là baseline lịch sử, không phải yêu cầu mới. Budget/quality/security còn áp dụng khi không xung đột; xem v3 để biết luồng, số liệu và timeline thay thế.

## Kết luận tại ngày 02/11/2026

Có đủ nền tài liệu để bắt đầu prototype core. Chưa có cơ sở gọi sản phẩm hoàn chỉnh, đã deploy, chịu tải150 người hoặc cloning production0đ. Đã review tài liệu hiện hành, source scan manifest, smoke script NIM và chuẩn bị UI; không audit toàn bộ code upstream.

## Bộ tài liệu hiện hành

1. [Kế hoạch sản phẩm](KE_HOACH_RAP_XEM_CHUNG.md).
2. [Kiến trúc](STACK_VA_KIEN_TRUC_V2.md) và [ngân sách](../NGAN_SACH_FREE_TIER.md).
3. [UI/UX và nguồn tài nguyên](../UI_UX_VA_TAI_NGUYEN.md), [bản bố cục tương tác](../../design/cinema-preview.html), [tokens](../../design/tokens.css).
4. [Bảo mật và vận hành](../BAO_MAT_VA_VAN_HANH.md).
5. [NIM và kiểm thử](../NVIDIA_NIM_NGHIEN_CUU_VA_KE_HOACH_KIEM_THU.md).
6. [Timeline/backlog](TIMELINE_BACKLOG_V2.md).
7. [Khảo sát source lịch sử](BAO_CAO_QUET_SOURCE_VA_TOI_UU.md) và [snapshot](../../SOURCE_SCAN_MANIFEST.json). Khuyến nghị local/server cũ trong báo cáo này không còn áp dụng.

## Findings và quyết định thống nhất

| ID | Mức | Phát hiện | Quyết định / tình trạng |
|---|---|---|---|
| REV01 | Blocker full | Không có inference free production đã xác minh | Core tiếp tục; clone feature gate, không dùng NVIDIA trial production |
| REV02 | High | 120/200 ký tự TTS không nhất quán | Chốt120 code points NFC cho app, chat500; API2000 chỉ là contract probe riêng |
| REV03 | High | Pilot6người/3,5MOS dễ bị hiểu là release test | Pilot để shortlist; full acceptance10–20người, ≥80% chấp nhận và độ rõ≥4/5, phân nhóm |
| REV04 | High | Signed URL không revoke ngay khi kick | TTL60s, không cấp mới sau revoke; file đã tải không thu hồi; proxy chỉ khi budget đạt |
| REV05 | High | WAV thay Opus phá budget egress | Giữ hai mô hình codec riêng; không hứa transcoder Worker free |
| REV06 | High | Browser recorder không mặc định xuất WAV | Thêm normalization/validation/memory gate; không rename extension |
| REV07 | High | “150 users” che quota giờ/ngày và spam | Công bố đồng thời + giờ/ngày +chat/TTS/day; budget nhiều lớp, mô hình tải chưa benchmark |
| REV08 | High | Guest có thể chiếm3slot/50ghế | Lease, cooldown, private mặc định, operator revoke; không hứa ban tuyệt đối |
| REV09 | Medium | Auth guest và account voice chưa nối rõ | Session-to-account mapping, rotate/revoke test, không role từ client |
| REV10 | Medium | CSP/referrer cứng có thể làm YouTube lỗi | Report-only staging, origin chính xác; giữ Referer phù hợp, test lỗi153 |
| REV11 | Medium | UI chưa có trạng thái lỗi/full/quota | Đã có spec/state inventory và preview, chưa triển khai mọi trạng thái |
| REV12 | Medium | License source và asset bị hiểu chung | Giữ per-file/license manifest; không sao chép screenshot/poster thương mại |
| REV13 | Medium | Script smoke không phải load/quality harness | Ghi rõ phạm vi; cần batch runner/corpus selection/stream timing ở bước sau |
| REV14 | Medium | Realtime giọng không thể đọc mọi tin | Nút gửi và đọc, queue bounded, skip expiry; chat chữ luôn độc lập |

Các quyết định bảo mật là yêu cầu implementation, chưa phải kiểm soát đã tồn tại trong app. Preview không thu mic, không gọi mạng, không lưu dữ liệu lâu dài; dùng CSS illustration gốc và system font. Lucide/Noto/shadcn mới là nguồn lựa chọn, chưa bundle/tải vào app.

## Backlog bổ sung và phụ thuộc

| ID | Công việc | Bàn giao | Phụ thuộc |
|---|---|---|---|
| DES01 | Chốt tokens/component/state và naming | Screen desktop/mobile, state table | Bộ UI hiện có |
| DES02 | Thử5người với nhiệm vụ cụ thể | Issues + quyết định sửa, không chỉ điểm đẹp | Preview rồi app thật |
| SEC01–12 | Triển khai kiểm soát trong bảng security | Integration tests + evidence | Worker/auth/protocol |
| ASSET01 | Nhập assets thực và license notices | Manifest URL/revision/hash/attribution | Chọn package versions |
| PRIV01 | Retention/deletion/consent flow | Privacy text khớp hành vi thực | Provider chọn xong |
| QAUI01 | Responsive, keyboard, screen reader | Browser matrix, focus/reflow/contrast | App UI |
| QAOPS01 | Rollback/expiry/quota outage | Runbook + diễn tập | Staging |

## Timeline cập nhật

Giữ baseline30–42 ngày công cho core+TTS nếu gate đạt; đó không phải deadline đã bảo đảm. Bổ sung thiết kế/usability/license2–3 ngày và hardening/privacy1–2 ngày nếu chưa nằm trong M1/M3/M5/M6: **reserve tổng3–5 ngày**, tức kế hoạch có dự phòng33–47 ngày công. Không cộng đôi NIM7–9ngày vì có phần nằm trong M0/M4/M5; cần lập ticket estimation khi đã chốt provider.

Thứ tự: G0 cloud+YouTube+TTS feasibility → UI/core3slot → sync/chat/moderation → security core → deploy alpha đã test → voice adapter nếu đủ điều kiện → QA150/socket + browser thật → full release. Không đợi cloning mới làm core; không gọi alpha là sản phẩm hoàn chỉnh.

## Definition of ready để bắt đầu implementation

- Kiến trúc/code ownership và license rõ; có protocol schemas + shared constants trước nối UI/backend.
- Account deployment/quota được xác minh; không bật paid fallback; staging riêng.
- Feature flags: `personalVoice`, `hostedTts`, `localTts`; flag không thay authorization.
- Default private room, TTS off, không thu mic; error codes/copy được nối từ spec.
- Pin packages/model/source revisions khi import, CI test/build trước deploy.

## Definition of done

Build tái lập; role/ACL/quota tests pass; 3×50 soak có report; browser thật video/chat/autoplay/mic policy pass; accessibility kiểm tra tay; budget usage đo; license notices đầy đủ; privacy/delete đúng; deployment URL thật và rollback thử được. Clone chỉ DONE khi chất lượng, quyền dùng production và tài nguyên đều đạt.

## Bằng chứng ở thời điểm review

Nghiên cứu nhiều nguồn chính chủ và review tài liệu đã làm. NIM live vẫn blocked thiếu credential. Preview là artifact thiết kế cục bộ; kiểm tra cụ thể ghi tại `design/QA.json` sau chạy. Chưa có production URL, server app hoặc kiểm thử bảo mật/load live.
