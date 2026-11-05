# NVIDIA NIM: nghiên cứu và kế hoạch kiểm thử giọng nói

> **V3 supersedes,02/11/2026:** [Đặc tả hiện hành](THIET_KE_RAP_3D_V3.md): rạp3D, host chọn2–10ghế,3phòng/tối đa30người; playlist và approval/kick trong MVP. Các mức50/150, lựa chọn2D-only và timeline cũ bên dưới là baseline lịch sử, không phải yêu cầu mới. Budget/quality/security còn áp dụng khi không xung đột; xem v3 để biết luồng, số liệu và timeline thay thế.

Ngày khảo sát: 01/11/2026. Phạm vi: đọc chat tiếng Việt bằng preset/giọng cá nhân; 3 phòng × 50 người; không voice call. Đây là kế hoạch kiểm thử và bộ smoke test, chưa phải kết quả benchmark model.

## 1. Quyết định sau nghiên cứu

1. Ưu tiên **Magpie TTS Multilingual** để thử preset tiếng Việt, sau đó **Magpie TTS Zeroshot** để thử clone nếu tài khoản được cấp quyền.
2. Không dùng NVIDIA API trial làm backend production. Điều 1.2 và 1.4 của [API Trial Terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf) giới hạn vào thử nghiệm/đánh giá, cả API và generated content; production cần thỏa thuận/subscription riêng. Model có license thương mại không đồng nghĩa endpoint trial được dùng production.
3. Không mặc định “5.000 credit”, “40 RPM”, thời hạn key hay concurrency. Ghi quota thực của tài khoản và endpoint trước khi thử. Không xoay key để vượt hạn mức.
4. Tài liệu NIM container mới không chứng minh endpoint NVIDIA hosted đã chạy cùng model/version. Phải discovery trước, tổng hợp âm thanh sau.
5. Với yêu cầu 0đ, không có máy server: core xem phim/chat vẫn có hướng free tier. **Chưa xác minh được dịch vụ clone tiếng Việt miễn phí phù hợp production**. Giữ provider adapter; alpha có Web Speech khi thiết bị có voice phù hợp, không coi đó là hoàn thành cloning.

## 2. Model và source đã đối chiếu

| Ứng viên/source | Bằng chứng đã đọc | Áp dụng và điểm phải kiểm tra |
|---|---|---|
| [Magpie Multilingual API](https://build.nvidia.com/nvidia/magpie-tts-multilingual/api) | HTTP list voices/synthesize và gRPC sample | Ưu tiên preset; kiểm tra `vi-VN` và voice nam/nữ thật bằng discovery; không suy luận model này clone được |
| [Magpie Zeroshot model card](https://build.nvidia.com/nvidia/magpie-tts-zeroshot/modelcard) | Free Endpoint, Apply for Access; card v1 mô tả giới hạn 20 giây và ngôn ngữ cũ | Cần quyền riêng; chưa có endpoint HTTP được xác minh từ trang Try API; không lấy function ID Multilingual dùng thay |
| [NIM 26.10 voice cloning](https://docs.nvidia.com/nim/speech/26.10.0/tts/voice-cloning.html) | Bản mới có 12 ngôn ngữ gồm Việt; prompt 3–10 giây; quality 1–40 | Khả năng của bản NIM mới; chưa xác nhận trên free hosted. Mẫu mục tiêu 5 giây, WAV mono PCM16 ≥22.05kHz |
| [nvidia-riva/python-clients — talk.py](https://github.com/nvidia-riva/python-clients/blob/main/scripts/tts/talk.py) | Đã đọc code: discovery, synthesize/synthesize_online, audio prompt, quality, WAV writer; SPDX MIT | Reference chính cho gRPC và đo first audio; không cần ASR, LLM, mic streaming |
| [Chatterbox NIM API](https://build.nvidia.com/resembleai/chatterbox-multilingual-tts/api) | gRPC function ID `ddacc747-1269-4fab-bfd9-8f593dead106` | Candidate đối chứng; chưa chứng minh hosted hỗ trợ Việt. HTTP không có sample xác minh trong trang đã đọc |
| [Chatterbox source](https://github.com/resemble-ai/chatterbox/blob/master/src/chatterbox/mtl_tts.py) | Đã đọc code: checkpoint v2/v3, `SUPPORTED_LANGUAGES` không có `vi`, conditioning, watermark | Trang giới thiệu mới nói có Việt nhưng code này không có; không bật Việt dựa trên quảng cáo. Pin checkpoint, SDK và endpoint riêng |
| [Chatterbox V3 báo cáo nhà phát triển](https://www.resemble.ai/resources/chatterbox-multilingual-v3-tts-with-embedded-watermarking-for-25-languages) | Nhà phát triển nêu chất lượng Việt còn yếu | Không dùng benchmark của họ thay cho phép đo trên câu chat của dự án |
| [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) | Đợt quét trước đọc README/license Apache2 và Nano inference code | Đối chứng tiếng Việt ưu tiên; Turbo/Nano khác nhau. Source miễn phí nhưng hosting vẫn cần giải quyết |
| [VoxCPM2](https://github.com/OpenBMB/VoxCPM) | Đã đọc README: Việt trong 30 ngôn ngữ, clone, 2B, Apache2 | Đối chứng chất lượng; không lấy tốc độ RTX4090 quảng bá làm độ trễ hosted free |
| [Watchparty](https://github.com/howardchung/watchparty), [Together](https://github.com/chtnnh/together), [OpenTogetherTube](https://github.com/dyc3/opentogethertube) | Đã quét source ở báo cáo trước: sync, room, roles, fanout | Học core xem chung; không repo nào tự giải quyết inference cloning miễn phí. OTT AGPL3 cần xét khi tái sử dụng code |

Xem thêm [báo cáo quét source](archive/BAO_CAO_QUET_SOURCE_VA_TOI_UU.md). Kết quả đọc branch hiện hành phải được pin commit trước implementation; không coi branch URL là snapshot bất biến.

## 3. Trạng thái kiểm thử hiện tại

- Môi trường chưa có secret `NVIDIA_API_KEY`; chưa có quyền Zeroshot hoặc mẫu giọng được cung cấp.
- **Chưa gọi authenticated inference, chưa tạo/nghe audio NVIDIA, chưa đo latency/quota/chất lượng model.**
- Có script HTTP smoke độc lập, corpus 20 câu tiếng Việt và báo cáo dry-run/missing-key; script không tự đăng ký, không tự mua credit.
- Script hiện chỉ hỗ trợ HTTP offline WAV. Streaming, gRPC Chatterbox, đánh giá cảm nhận và tải app thuộc backlog kiểm thử bên dưới, chưa được thực thi.

## 4. Quy trình chạy có thể lặp lại

Secret phải cấu hình qua cơ chế secrets của môi trường dưới tên `NVIDIA_API_KEY`; không đưa vào chat, git, frontend hoặc dòng lệnh literal. `NVIDIA_TTS_VOICE` là tên từ discovery, không đoán. Máy chạy thử chỉ là môi trường phát triển tạm thời, không phải yêu cầu người dùng có máy host.

```bash
# Không gọi mạng, không tốn quota
node scripts/nim-smoke.mjs
# Chỉ lấy capabilities khi đã cấu hình secret
node scripts/nim-smoke.mjs --live --list-only
# Chọn voice vi-VN từ voices.json qua biến NVIDIA_TTS_VOICE, rồi thử 3 câu
node scripts/nim-smoke.mjs --live --limit 3
# Chỉ khi endpoint Zeroshot đã được cấp và xác minh HTTP contract:
# đặt NVIDIA_TTS_BASE_URL thành origin NVCF tương ứng, chọn voice discovery hợp lệ
node scripts/nim-smoke.mjs --live --limit 3 --reference /path/to/consented.wav --consented-reference
```

Script mặc định endpoint Multilingual `877104f7-e885-42b9-8de8-f6e4c6303969`; khóa host HTTPS NVCF và cấm redirect để tránh chuyển credential ra ngoài. Tối đa 12 câu/lần, tuần tự, nghỉ 3 giây giữa câu; vẫn phải giảm tốc theo quota thực. Không retry tự động: 401/403/429/5xx dừng và ghi trạng thái, giữ Retry-After nếu có. Một lần synthesis run có thêm 1 request discovery.

Kết quả: `testing/nim/results/<timestamp>/report.json`, `voices.json`, audio `.wav`. Không in raw error/provider body để tránh log chứa text/reference. WAV magic chỉ là sanity check; phải kiểm tra decoder/frames ở bước audio QA. `headersMs` là thời gian tới HTTP headers, **không phải time-to-first-audio**. `completeMs` là HTTP round trip tới đủ body, không gồm browser playback.

Nếu clone voice base không xuất hiện trong discovery nhưng tài liệu endpoint được cấp yêu cầu nó: sửa adapter dựa trên contract xác minh trước, không bypass validation tùy tiện. Script chưa tự chuẩn hóa reference; operator phải kiểm tra PCM16/mono/rate/duration trước upload.

## 5. Thiết kế thí nghiệm và ngân sách

Mỗi run lưu ngày giờ UTC, vị trí runner, transport, endpoint/model/version nếu có, voice, language, quality, text ID, reference ID/version, codec/rate, concurrency, trạng thái quota; không lưu key. Tách warm/cold-observed, không khẳng định chủ động tạo cold start trên dịch vụ managed.

| Vòng | Khối lượng dự kiến | Điều kiện đi tiếp |
|---|---:|---|
| A — discovery | 1 call/model; 3 candidate NIM | Đúng quyền và locale, điều khoản cho phép thử; không có Việt thì dừng nhánh Việt |
| B — smoke | 3 câu × 2 preset + 3 câu × 1 clone = 9 synth | Có WAV giải mã được, nghe đúng Việt, không lỗi auth; clone chỉ khi có reference |
| C — chất lượng pilot | 20 câu × 2 preset = 40; 6 người × 8 câu clone = 48 | Tổng 88 synth; tình nguyện viên Bắc/Trung/Nam × nam/nữ; đây là mẫu nhỏ, không đại diện toàn dân số |
| D — latency pilot | 3 độ dài × 2 mode offline/stream × 10 lần = 60/model vào shortlist | Chỉ endpoint hỗ trợ mode; quota đủ; số mẫu nhỏ, p95 chỉ để sàng lọc |
| E — clone tuning tùy chọn | 2 reference × 3 quality (10/20/30) × 3 câu = 18 | Chỉ chạy nếu default chưa đạt; cùng text/reference để so sánh |
| F — xác nhận finalist | Ít nhất 100 mẫu/condition quan trọng, nhiều khung giờ | Chỉ sau pilot và có ngân sách quota; không tự động chạy toàn bộ |

Một vòng A–E theo cấu hình trên tối đa 175 synthesis nếu D chỉ một finalist, cộng discovery và các lần thử lại; chưa tính provider đối chứng. Chia theo quota/ngày; không cam kết hoàn tất trong ngày. Không stress NVIDIA bằng 150 request song song. Tải 150 người kiểm thử bằng mock provider trước.

Corpus kèm file là đầu vào tiếng Việt tự soạn. Thêm boundary fixtures tạo tại runtime: chuỗi rỗng/whitespace, NFC vs NFD, 1/119/120/121 code points NFC app, 1999/2000/2001 ký tự API sau normalization, emoji-only, dấu xuống dòng, SSML/HTML hiển thị như text. Bộ smoke hiện chạy prefix tối đa 12 câu; batch runner đầy đủ là việc cần làm trước vòng C.

## 6. Ma trận test chức năng và lỗi

| ID | Thao tác/đầu vào | Kết quả mong đợi / bằng chứng |
|---|---|---|
| AUTH01 | Không có key | Block trước network; không có audio giả |
| AUTH02 | Key sai/hết hạn (một lần có kiểm soát) | Phân loại 401/403; không retry liên tục; không log key |
| CAP01 | List voices từng endpoint | Lưu raw capabilities; xác nhận `vi-VN`; voice được chọn tồn tại |
| CAP02 | Modelcard mới nhưng hosted cũ | Đánh dấu unsupported/version mismatch; không dùng kết luận container thay |
| PRE01 | Nam/nữ, cùng 20 câu | Nghe được, nhận biết đúng profile; fallback rõ khi thiếu một preset |
| CLN01 | 6 reference hợp lệ, câu khác transcript mẫu | Giữ giọng ở nội dung mới; không chỉ phát lại reference |
| CLN02 | Sample 2/3/5/10/11 giây, stereo, MP3 giả WAV | App reject/normalize đúng; sai mẫu không làm treo queue |
| CLN03 | Sample có im lặng, nhạc nền, clipping | Cảnh báo thu lại dựa quality gate; không âm thầm nhận profile kém |
| CLN04 | Xóa/đổi voice trong khi job đang chạy | Job/profile version cũ bị vô hiệu; không phát audio giọng đã xóa |
| TXT01 | Dấu Việt, tên, số, tiền, thời gian, code-switch | Chấm lỗi nội dung; normalization có expected text được duyệt |
| TXT02 | Emoji/URL/slang | Có quy tắc đọc/bỏ nhất quán; không đọc URL dài vô ích |
| TXT03 | Boundary 120 app / 2000 API | App chỉ gửi trong giới hạn của mình; contract probe API riêng, ít request |
| AUD01 | WAV offline | Decode thật; duration/rate/channels đúng; không JSON gắn đuôi WAV |
| AUD02 | Streaming, chunk chia lẻ 1 byte | Ghép PCM16 đúng; không nhầm raw PCM thành WAV; không pop/click do mất byte |
| AUD03 | Server đứt stream giữa câu | Mark incomplete, không cache thành công; UI không treo |
| ERR01 | Mock429 có/không Retry-After | Retry có giới hạn/jitter ở app, không giữ socket room chờ |
| ERR02 | Mock timeout/502/503/malformed200 | Circuit breaker, fallback text, retry cùng idempotency key không phát hai lần |
| ERR03 | Model không hỗ trợ tiếng Việt | Không âm thầm chuyển sang tiếng Anh hoặc giọng khác |
| SEC01 | User A yêu cầu voiceId/audio của B không có quyền | 403, reference private, URL ngắn hạn theo quyền phòng |
| SEC02 | Payload XSS, URL tùy ý, oversize reference | Render text an toàn; không fetch URL tùy ý từ người dùng; chặn trước inference |
| SEC03 | Inspect JS bundle/network/log | Không NVIDIA key/service key; request provider chỉ từ backend |
| DEL01 | Xóa profile, logout, TTL audio hết hạn | Xóa reference và cache mapping; URL có thời hạn; xác minh job không hồi sinh dữ liệu |

Lỗi giả lập kiểm thử trên adapter/môi trường của dự án; không dò lỗ hổng hay cố gây quá tải dịch vụ NVIDIA. Negative tests trực tiếp chỉ số lượng nhỏ và đúng contract.

## 7. Chất lượng giọng và ngưỡng quyết định

Đây là **ngưỡng nghiệm thu đề xuất**, chưa phải số đo:

- 3 người nghe tiếng Việt chấm mù, thứ tự audio random, ẩn tên model, âm lượng cân bằng. Người sở hữu reference đánh giá bổ sung, không thay hội đồng.
- Intelligibility: ≥95% từ đúng ở nhóm câu bình thường theo transcript người nghe; báo riêng tên riêng/số/slang. CER/WER từ ASR chỉ hỗ trợ, vì ASR cũng sai dấu và phương ngữ.
- Naturalness MOS trung bình ≥3,5/5; clone similarity ≥3,5/5. Báo phân bố theo người/giọng/phương ngữ, số mẫu và khoảng tin cậy khi đủ mẫu. Không gộp một điểm che nhóm yếu.
- Không lặp/mất nguyên câu, không đọc nội dung ngoài input trong bộ nghiệm thu; lỗi critical phải xử lý trước release. Clipping ở mức full-scale <0,1% samples; kiểm tra im lặng đầu/cuối bất thường bằng waveform và nghe.
- Câu thông thường 5–10 giây: mục tiêu end-to-end p95 ≤5 giây tới lúc bắt đầu nghe trong tải bình thường; nếu không đạt, chuyển TTS sang tính năng có độ trễ được thông báo, không tuyên bố realtime giọng.
- Streaming mục tiêu first playable audio p95 ≤2 giây nếu endpoint hỗ trợ; phải đo tại browser thực. Không suy ra từ headers/TTFB hoặc benchmark GPU của tác giả.
- Độ giống không thể bảo đảm “đúng tuyệt đối giọng thật”; UI phải cho người dùng nghe thử và chọn dùng/thu lại.

## 8. Tối ưu và kiểm thử 3×50

Luồng: chat commit → enqueue TTS job → provider → lưu 1 audio → phát event metadata/URL tới room → client tự tải. **Một tin nhắn tương ứng một lần inference**, không 50 lần. Room actor không await model; audio không đi qua WebSocket room. Khóa cache gồm provider/model/voiceVersion/language/normalizedText/settings; phân quyền theo room/profile. Không tái sử dụng audio trial ở production.

Đề xuất ban đầu: tối đa 1 job đang chạy/phòng, global concurrency 1 để đo rồi tăng tối đa 3 nếu quota cho phép; queue tối đa 5 job/phòng, TTL 30 giây; mỗi user 1 TTS/10 giây; fairness round-robin giữa phòng. Mọi người vẫn chat bình thường khi TTS đầy. Đây là cấu hình cần điều chỉnh qua đo tải.

Một clip 5 giây làm room chỉ nghe tuần tự khoảng 12 clip/phút; 50 người cùng gửi mỗi 10 giây là 300 tin/phút/phòng. Do đó không thể đọc tất cả chat mà vẫn nghe kịp phim. Dùng nút “đọc tin”, quyền host hoặc sampling được công bố; queue quá tải bỏ đọc, không bỏ tin nhắn.

| Kịch bản | Chạy | Điều kiện đạt |
|---|---|---|
| 1 phòng × 1/10/25/50 | Mỗi mức 10 phút, mock TTS delay 0,5/3/15 giây | Không chặn chat/play/pause; event có thứ tự/version |
| 3 phòng × 50 | 60 phút, 1 chat/user/30 giây (5 tin/giây toàn app) | Chat p95 ≤500ms trong vùng test; lỗi gửi <1%; room không vượt 50 |
| Burst | 150 tin cùng 1 giây, lặp 3 lần cách nhau 5 phút | Queue TTS giữ bound; không tạo 150 inference; không crash client |
| Admission | 60 join đồng thời vào phòng50; tạo phòng thứ4 | Chính xác tối đa50 admission; phòng thứ4 bị từ chối nguyên tử |
| TTS outage | Mock429/503/timeout 10 phút | Phim/chat hoạt động; có trạng thái TTS bận; hồi phục không replay backlog hết hạn |
| Reconnect | Rớt 30 client, host rời, reconnect trong grace | Không ghế ma/host kép/audio phát lặp; nhận snapshot mới |
| Isolation | Phòng1 spam TTS, phòng2/3 bình thường | Fairness, latency phòng khác không suy giảm quá20% so baseline |
| Soak | 150 socket ×2 giờ + browser thật đại diện | Memory ổn định sau warmup, không tăng queue vô hạn; thống kê quota |

Socket giả lập chỉ chứng minh server fanout/admission, không chứng minh 150 trình duyệt phát YouTube/TTS mượt. Bổ sung browser thật Chrome/Edge/Firefox desktop, Android Chrome, iOS Safari; tối thiểu 6 thiết bị/phiên nếu có. Mạng thường và throttling 1,5Mbps/150ms/1% loss; kiểm tra autoplay click, background tab, khóa màn hình, headphone, mute TTS, volume ducking và restore volume khi lỗi. Không pause cả phòng khi một người buffer.

Đo sync video riêng: drift p95 mục tiêu ≤1 giây lúc ổn định, hội tụ ≤3 giây sau seek/rejoin trên video VOD nhúng được. Ads, vùng địa lý, video cấm embed, live stream và browser throttling là ca riêng, không hứa đồng bộ frame tuyệt đối.

## 9. Băng thông là gate lớn của NIM

HTTP offline hiện trả WAV PCM, không mặc định Opus. PCM16 mono22.05kHz = 44.100 byte/giây. Clip5giây ≈220.500 byte; 50 người tải ≈11,025MB trước overhead. Ngân sách audio2GB/tháng chỉ khoảng **181 clip/tháng**, khoảng6clip/ngày toàn hệ thống, nếu mọi clip đủ50 lượt tải.

Con số ~2.000clip/tháng trong kế hoạch trước giả định Opus32kbps, không áp dụng nguyên trạng cho WAV NIM. Không hứa encode FFmpeg trên Workers Free trong CPU budget. Gate phải chọn: provider trả codec nhỏ được xác minh, codec ở nơi có compute phù hợp, hoặc hạn chế playback/quota; đo compatibility và chi phí thật. Cache giảm inference, không xóa egress tới50 người.

## 10. Timeline kiểm thử và bàn giao

| Ngày công | Việc | Bàn giao / gate |
|---|---|---|
| 1 | Cấu hình secret, quyền endpoint, chốt terms/quota, discovery | capabilities snapshot; unsupported thì dừng nhánh, không chờ vô hạn |
| 2 | Smoke preset/clone, kiểm tra WAV và mẫu | audio hợp lệ, lỗi phân loại; consent records nội bộ |
| 3–4 | Corpus pilot, nghe mù, latency | scorecard và raw metrics; shortlist 1–2 model |
| 5 | Adapter mock, idempotency, retry, quota/cache | test lỗi tái lập, không phụ thuộc inference thật |
| 6–7 | 3×50, burst, reconnect, soak | load report, đồ thị latency/memory/quota; điều chỉnh bounds |
| 8 | Browser/mobile/audio sync và egress | ma trận thiết bị, ngân sách theo codec thực |
| 9 | Re-test lỗi và quyết định | ADR chọn provider; go/no-go preset/clone/production riêng |

Ước tính 7–9 ngày công sau khi có quyền/secret/reference, có phần chồng vào G0 và QA của timeline 30–42 ngày công trước. Thời gian NVIDIA duyệt quyền không nằm trong ngày công và chưa biết. Hiện mới hoàn tất nghiên cứu, corpus và smoke harness; không đánh dấu các ngày kiểm thử live là đã xong.

## 11. Điều kiện phát hành

- G0a: preset Việt được xác minh qua API và nghe thử.
- G0b: clone qua endpoint đúng quyền, đạt quality/privacy gate.
- G0c: quota + codec/egress + điều khoản cho phép vận hành production 0đ. **NVIDIA API trial không vượt gate này theo terms đã đọc.**
- G1: core150 user đạt kiểm thử không phụ thuộc TTS.
- G2: browser và fault recovery đạt, deployment có secrets server-side và rollback.
- Nếu chỉ G1 đạt: có thể deploy alpha xem phim/chat/TTS thiết bị, ghi rõ chưa có cloning. Không công bố đã hoàn thành toàn bộ yêu cầu.

## 12. Tài liệu API để triển khai

- [NIM HTTP26.10](https://docs.nvidia.com/nim/speech/26.10.0/reference/api-references/tts/http-tts.html): multipart, discovery, WAV offline và LPCM streaming; hosted phải xác minh contract/version.
- [NIM voice list](https://docs.nvidia.com/nim/speech/latest/tts/voices.html): tham chiếu voice; runtime discovery là nguồn chọn thực tế.
- [NVIDIA FAQ](https://forums.developer.nvidia.com/t/nvidia-nim-faq/300317): cách truy cập Developer/API Catalog; quota phụ thuộc dịch vụ/tài khoản.
- [Kiến trúc dự án](archive/STACK_VA_KIEN_TRUC_V2.md), [timeline tổng](archive/TIMELINE_BACKLOG_V2.md), [ngân sách](NGAN_SACH_FREE_TIER.md).

## Thống nhất sau review02/11/2026

App giới hạn120 code points NFC/tin TTS,500 cho chat. Pilot6người và MOS3,5 chỉ để shortlist; full release dùng10–20người tự nguyện, ≥80% chấp nhận, độ rõ≥4/5, báo từng nhóm. Signed audio URL đã cấp có TTL tối đa60s, không thu hồi audio đã tải; kiểm tra quyền chặn cấp URL mới sau revoke. Xem [review tổng thể](archive/REVIEW_VA_BAN_GIAO_2026-11-02.md).
