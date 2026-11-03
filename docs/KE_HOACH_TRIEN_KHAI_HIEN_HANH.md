# Review cuối và kế hoạch triển khai hiện hành — 02/11/2026

## Quyết định giữ nguyên

3phòng; host chọn2–10ghế bao gồmhost. Không đợi đủngười: host phát ngay, latejoin theo timeline. Hai camera và avatar3D; playerYouTubeDOM độc lập. Approval trước khi nhận nội dung phòng, kick thu hồi quyền. Không micvoicecall; clone chỉ khi provider có quyền dùngproduction và ngân sách0đ được xác minh.

## Kết quả review

- Bộ kế hoạch trước đã nhiều lần đổi baseline/timeline; tài liệu này là index triển khai, v3 là sản phẩm, `DO_HOA_VA_CONG_NGHE_RAP_3D.md` là thiết kế3D. Các phép tính50/150 cũ chỉ là lịch sử.
- Không dùng nguyên rạp tải ngoài: rạp2–10ghế cần generator. Avatar/animation dùng primitive trongspike; chưa tảiQuaternius/Kenney.
- Không chọn CSS3Diframe làm dependency chặnalpha. App hiện playerDOM phía trên scene; hai camera chỉ tác độngscene.
- Không dùngNIMtrial trongproduction, không lưu key gửi quachat. NhánhTTS chưa kiểmmodel thật.
- Timeline34–51ngày công fullscope gần nhất vẫn là ước lượng; không suy ra một phiên coding đã hoàn thành cácmilestone.

## Đã bắt đầu code

Repo làm việc tại [cinema](../cinema/README.md). Đã tạo ReactTS/Vite/R3F, shared room model, Worker/SQLiteDO, hibernationWebSocket, unit/API/browser tests, package-lock và configdeploy. Thay đổi này vượt phạm vi bảnHTMLmock cũ: frontend đã giao tiếp backend cục bộ.

| Mốc | Trạng thái | Bằng chứng / việc tiếp |
|---|---|---|
| S0 source/build | Có |Dependencies cài; frontendbuild và typecheck |
| S1 core invariants | Có |7unit tests: capacity, latejoin, quyền, queueNext, revocation, URL |
| S2 Worker/API | Có baseline |Origin, concurrentadmission, idempotency, staleepoch vàkick qua runtime cục bộ |
| S3 UI/scene | Có prototype |Sảnh, scene3D/camera/đi ghế, chat, playlist, approval; primitiveart |
| S4 browser realtime | PASS cục bộ |Hai browser profiles: tạo→xin→duyệt→chat→kick→đóng |
| S5 lifecycle/hardening | Chưa |Reconnect lease, pendingreservation, hosttransfer, privateinvite, deadlinealarm |
| S6 graphics polish | Chưa |Assetaudit, rigclips, camera/free-look, demandrender, reduced-motion |
| S7 playlistfull/playerQA | Chưa |Reorder/suggestions/seek, actualYouTube/ad/autoplay/latejoin |
| S8 load/release | Chưa |3×10, browsermobile thật, quotabudget, CSP, rollback, publicURL |
| S9 clone | Blocked tài nguyên/credential |Providerproduction0đ và qualitygate |

## Sprint tiếp theo, ưu tiên theo rủi ro

1. Lifecycle server trước thêm mỹ thuật: ghếreserve20s, reconnect30s, pendingTTL/cancel, hostgrace/transfer, emptyroomrelease; fakeclock và faulttests.
2. Privateinvite + requestbudget + CSRF/headers/retention; phòng mới không lộ dữ liệu riêng. Tách global/session/roomlimits.
3. Hoàn thiện playerQA: clockoffset theoRTT, hostseek, endedrace, buffer/ads không pause cảphòng; stableiframe khi đổi camera vàNext.
4. Playlist reorder/suggestions vàsnapshotdelta; UXpending/error/retry dùng commandId cũ.
5. Assetspike: tải đúngStandard, checklicenses/hash/rig/clips,1avatar+1ghế; đoGPU trước nhân10avatar. Fallback nhẹ luôn hoạt động.
6. Chạy3×10 soak, realdevices và accountquota. Chỉ deployalpha khi cácblockercore đạt; deploykhông đồng nghĩa hoàn thànhcloning.

## Chạy và review

[Xem README](../cinema/README.md) để build/run/test và danh sách giới hạn thật. [Ảnh sảnh](../cinema/evidence/lobby-desktop.png), [ảnh phòng](../cinema/evidence/room-desktop.png), [ảnh mobile](../cinema/evidence/room-mobile.png) là captures của prototype, không phải conceptAI. Kết quảtests chỉ áp dụngscope ghi trongreport, không thay benchmarkproduction.
