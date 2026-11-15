# Luật game Cùng Xem · v1

Đặc tả sản phẩm 14/11/2026. Nguồn/bối cảnh: [nghiên cứu](VIETNAMESE_GAMES.md). Bộ luật này có lựa chọn riêng, không tự nhận chuẩn duy nhất của mọi địa phương. Lần đọc lại Wikipedia 14/11 bị 403; nguồn đã đọc ngày 13/11 được giữ, pilot người biết luật vẫn mở.

## Chung

Một ván/phòng. Chỉ thành viên đã duyệt được tham gia. Host mở/bắt đầu/đóng, người chơi điều khiển lượt của mình; chuyển chủ không đổi chỗ chơi. Tham gia ở lobby, sau bắt đầu chỉ xem. Mỗi thao tác có revision CAS và dedupe của phòng; close/open vẫn tăng revision. Người chơi/host xin nghỉ; người xin hoặc host tiếp tục. Hidden/reload không tự xử thua, dùng giữ chỗ 30s hiện có. Ô dừng không xử thắng nếu người chơi thực sự rời; lô tô bỏ vé người rời, tiếp tục nếu còn ≥2, nếu ít hơn thì dừng. Đóng ván xóa state/secret, không lưu lịch sử hoặc xếp hạng. Không tiền/cược/đổi thưởng.

Mở/chơi/đóng không thay đổi timeline/nguồn video/Hold/admission. UI dùng sheet hiện có, bàn phẳng hoặc 3D chung renderer, hiệu ứng hữu hạn/reduced motion. Hô số opt-in và nhạc dùng tài nguyên hiện có; speech broker giữ quyền chat/lô tô, không đổi luật rút số. [Thiết kế render/audio](GAME_3D_AUDIO.md).

## Ô ăn quan · `oaq-cwm-1`

1. Hai người. Vòng 12 ô: quan trái 0, dân A 1–5, quan phải 6, dân B 7–11. `+1` là ↺, `-1` là ↻. A đi trước. Mỗi ô dân 5 dân, mỗi ô quan 1 quan. 50 dân + 2 quan vật lý; quan = 10 điểm, không quan non; không đổi quan thành viên dân.
2. Chọn ô dân có quân phía mình; bốc toàn bộ dân, mỗi ô kế tiếp một dân, kể cả quan, giữ chiều cả lượt.
3. Rải xong xét **ô kế tiếp**: dân có quân thì bốc ô kế tiếp rải tiếp; quan có dân/quan thì hết lượt. Không bốc ô vừa đặt viên cuối.
4. Nếu ô kế tiếp trống và ô sau nữa có quân thì ăn ô sau nữa (gồm quan). Tiếp tục chuỗi cách một ô trống; khi điều kiện không còn thì hết lượt, không chuyển chuỗi ăn thành rải tiếp. Hai ô trống liên tiếp dừng lượt.
5. Hết lượt, nếu hai quân quan đã bị ăn thì kết thúc ngay, không đợi dân rải lại vào hai ô quan hết; dân còn ở phía ai về kho người đó.
6. Nếu bên sắp đi hết năm ô dân: lấy kho rải bù mỗi ô 1 dân. Thiếu thì vay **đúng phần thiếu** từ kho dân đối phương, ghi nợ và bù trừ nợ chéo. Không vay/đổi quan. Điểm = dân kho + 10×quan kho − nợ mình + nợ bạn.
7. **Biến thể Cùng Xem khi không đủ dân vay/rải bù:** dừng, mỗi bên thu dân phía mình; dân/quan còn ở hai ô quan trung lập, không tính điểm. So điểm sau nợ. Đây là lựa chọn được công bố, không phải kết luận về mọi luật địa phương.
8. Điểm bằng nhau hòa. Giới hạn 500 lượt hoặc 4096 lần đặt dân trong một lượt: dừng hòa, hoàn tất phần đang rải rồi thu bàn. Bảo toàn quân; chỉ lưu bước gần nhất, không lịch sử dài.

Bất biến: bàn + hai kho luôn 50 dân và 2 quan; số nguyên không âm; nợ là điểm riêng. Server hoàn tất lượt nguyên tử; client không gửi bàn/điểm.

## Lô tô · `loto-cwm-1`

2–10 người trước khi bắt đầu. Một vé 3×9, 15 số duy nhất, 5 số/hàng; mỗi cột 1–3 số tăng dần từ trên xuống. Cột đầu 1–9, tiếp 10–19,… cuối 80–90. Đây là cấu trúc vé 90 số của sản phẩm, không đại diện mọi vé vùng miền.

Server tạo vé, xáo 1–90 bằng Web Crypto với lấy mẫu không lệch, rút không hoàn lại và tối thiểu 3s/lần. DTO chỉ có vé chính mình, số đã gọi; host cũng không nhận deck tương lai/vé người khác. Không nhận seed/vé/số/điểm từ client.

Tại **lần gọi đầu tiên có hàng đủ 5 số**, dừng rút. Người đủ hàng bấm Kinh; server công bố **tất cả vé đủ hàng ở cùng lần gọi**, không ưu tiên mạng nhanh. Host có nút công bố nếu người đủ hàng vắng; không được chọn người thắng/rút qua kết quả. Claim sai không đổi state. Vé auto-mark, nút Kinh lớn; không buộc chạm ô nhỏ hoặc bật âm.

## Kiểm chứng

Luật/fixture/property/ACL/privacy: `tests/games.test.ts`. Browser nhiều profile, reload/transfer/leave/keyboard/mobile/native player: `tests/games.cjs`. Code rule pack: `shared/games.ts`; state/version/role: model apply/view. Acceptance ở [roadmap](KE_HOACH_TRIEN_KHAI_HIEN_HANH.md), kết quả ở PROJECT_STATE/evidence. Đổi luật cần rule version mới; không đổi giữa ván. Pilot luật và thiết bị thật vẫn mở.
