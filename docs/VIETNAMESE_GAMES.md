# Trò chơi Việt Nam · nghiên cứu và thiết kế

Ngày đọc nguồn: 13/11/2026. Đây là phương án, **chưa có game được triển khai**. Trạng thái phát hành ở [PROJECT_STATE](../PROJECT_STATE.md); ưu tiên sản phẩm rộng hơn ở [Advanced experience](ADVANCED_EXPERIENCE.md#chill-with-me-product-direction--researched-2026-11-13).

## Nguồn và độ tin cậy

| Nguồn đã đọc | Dùng cho | Giới hạn |
| --- | --- | --- |
| [Ô ăn quan, Wikipedia tiếng Việt](https://vi.wikipedia.org/wiki/Ô_ăn_quan) | Cấu trúc bàn, rải/ăn quân, vay dân, biến thể quan 5/10 dân | Nguồn cộng đồng có cảnh báo thiếu dẫn chứng; cần đối chiếu luật và chơi thử trước khi khóa bộ luật |
| [Cờ gánh, Wikipedia tiếng Việt](https://vi.wikipedia.org/wiki/Cờ_gánh) | Bàn 25 điểm, 8 quân mỗi bên; gánh/vây/mở | Không thay thế đặc tả đồ thị đường đi hoặc bộ kiểm thử tình huống |
| [Lô tô, Wikipedia tiếng Việt](https://vi.wikipedia.org/wiki/Lô_tô) | Bộ số 60/90 và thắng theo hàng | Không suy ra mọi vé ở Việt Nam đều có cùng cấu trúc |
| [Phụ Nữ: Lô tô, khát vọng được thừa nhận giá trị](https://tuoitre.vn/phunuonline/lo-to-khat-vong-duoc-thua-nhan-gia-tri-110119210.htm), 13/09/2018 | Vai trò văn hóa, nghệ thuật diễn xướng và người biểu diễn | Bài văn hóa, không phải sách luật; URL Phụ Nữ cũ chuyển tới bản này |
| [Thanh Niên: Chơi lô tô có gì…](https://thanhnien.vn/choi-lo-to-co-gi-ma-nen-trai-nghiem-it-nhat-mot-lan-trong-doi-1851426817.htm), 04/02/2022 | Trải nghiệm cộng đồng, nghệ thuật rao số | Không sao chép bài hát, giọng hoặc hình ảnh của nghệ sĩ |
| [VietNamNet lưu trữ: Những hình thức giáo dục trẻ dần bị lãng quên](https://web.archive.org/web/20071025044405/http://www.nguoivienxu.vietnamnet.vn/phongtuctapquan/2006/05/567021/), Trần Xuân Toàn, 04/05/2006 | Bối cảnh giáo dục/văn hóa của trò chơi | Không phải đặc tả luật; không lấy tranh minh họa làm asset |

UNESCO Bài chòi trả CAPTCHA; bảo tàng dân tộc học và một số trang bảo tàng/tạp chí trả 403. Chưa đọc được nội dung nên không dùng làm bằng chứng luật. Bài chòi cần nghiên cứu riêng về bộ thẻ, cách hô, vùng miền và quyền biểu diễn; không gộp thành lô tô đổi giao diện. Lô tô được bản địa hóa với truyền thống diễn xướng, không nên mô tả là trò có nguồn gốc thuần Việt từ cổ đại.

## Ô ăn quan · game chiến thuật đầu tiên

Hai người chơi, các thành viên khác xem; vẫn nằm trong sức chứa 2–10 của phòng. Chọn người chơi ở sảnh hoạt động, bắt đầu khi cả hai sẵn sàng. Host quản lý hoạt động, không được sửa kết quả lượt đi.

**Bộ luật đề xuất `oaq-v1`**, cần xác nhận bằng bảng tình huống và pilot trước implementation:

- Bàn vòng 12 ô: 10 ô dân, hai ô quan; mỗi bên có 5 ô dân. Khởi đầu mỗi ô dân 5 dân, mỗi ô quan 1 quan. Tổng 50 dân + 2 quan = 52 quân vật lý; điểm quy đổi 70 nếu quan = 10 dân, 60 nếu quan = 5 dân. Giữ riêng loại quân và giá trị, không biến quan thành 10 viên dân.
- Người tới lượt chọn ô dân không rỗng thuộc phía mình và một chiều rải; rải từng quân vào ô kế tiếp quanh vòng, kể cả ô quan. Hướng giữ nguyên trong cả lượt.
- Sau quân cuối, xét **ô kế tiếp**: ô dân có quân thì bốc ô đó rải tiếp; ô quan có quân thì hết lượt. Không lấy lại ô vừa đặt quân cuối như một số engine mancala khác.
- Nếu ô kế tiếp trống và ô sau nữa có quân thì ăn ô sau nữa. Tiếp tục xét chuỗi cách một ô trống; gặp hai ô trống liên tiếp thì hết lượt. Không chọn trực tiếp ô quan làm nước đi.
- Khi cả 5 ô dân phía mình trống trước lượt, rải lại mỗi ô 1 dân từ phần đã ăn. Quy tắc vay và trả nợ phải nằm trong state/bộ luật, không suy ra từ số quân hiển thị.
- Khi ván kết thúc, thu quân còn lại theo luật đã chọn rồi so điểm đã trừ nợ; cho phép hòa. Chốt riêng thời điểm kết thúc và xử lý quân rải lại vào ô quan sau khi quan đã bị ăn.

Các quyết định phải khóa trước viết reducer: quan 5 hay 10; có “quan non” và ngưỡng dân bảo vệ quan hay không; vay đúng phần thiếu hay luôn 5; nếu hai bên không đủ cho vay; kết thúc khi hai quân quan đã bị ăn hay khi hai ô quan rỗng. Đây là biến thể, không có cơ sở trong lần nghiên cứu này để gọi một lựa chọn là luật chuẩn duy nhất. MVP đề xuất quan 10, không quan non; các quyết định còn lại cần bộ ví dụ thống nhất, không tự ghép từ nhiều nguồn.

Kiểm thử luật: rải qua quan và qua ô xuất phát, relay nhiều vòng, chuỗi ăn, ô quan chặn lượt, hai ô trống, vay/nợ, kết thúc/hòa. Bảo toàn 50 dân + 2 quan qua bàn/kho/tay đang rải; nợ là sổ điểm riêng. Reducer hoàn tất lượt nguyên tử, client chỉ diễn hoạt lại chuỗi sự kiện; không lưu DB sau từng viên rải.

## Lô tô · hoạt động cho cả phòng

MVP đề xuất bộ 1–90, một vé mỗi người, 3 hàng × 9 cột, mỗi hàng 5 số và 4 ô trống. Đây là lựa chọn sản phẩm theo dạng vé 90 số, không khẳng định mọi vé lô tô Việt Nam đều như vậy. Số của mỗi vé không trùng; quy tắc phân bổ cột/hàng phải kiểm tra độc lập.

Server tạo vé và xáo bộ số bằng Web Crypto với lấy mẫu không lệch, rút không hoàn lại; client không tự chọn kết quả hoặc tự khai vé. Host bấm gọi số, tối thiểu 3 giây giữa hai lần; reconnect không rút lại số. Chọn “Kinh” khi đủ một hàng 5 số; server kiểm tra vé và tập số đã gọi. Định nghĩa cửa sổ nhận kết quả cùng lượt rút để nhiều người hoàn thành cùng số đều được ghi nhận, tránh thắng chỉ vì mạng nhanh hơn. Không cược, tiền, đổi thưởng hoặc mua vé.

Đọc số dùng giọng thiết bị opt-in, có tắt tiếng/tốc độ; chỉ số mới nhất được đọc, không xếp hàng 90 câu sau reconnect. Hiển thị chữ lớn song song với tiếng; không buộc bật âm thanh để chơi. Chưa có bộ thu âm nghệ sĩ được cấp phép. Không dùng nhạc/giọng mô phỏng nghệ sĩ hoặc hình tượng định kiến về giới để tạo cảm giác “lô tô”.

Kiểm thử: bộ rút luôn đủ và duy nhất, vé hợp lệ, không đoán trước bộ chưa gọi từ DTO, claim sai/lặp/trễ, đồng thắng, reset/host succession, reconnect, rút hết số. Lưu bộ số hiện tại tối đa 90, vé tối đa 10; không lưu lịch sử nhiều ván.

## Cờ gánh · đợt sau

25 giao điểm, mỗi người 8 quân, 16 quân tổng cộng. Phải lập bảng cạnh từ đường kẻ thật trên bàn: không cho mọi nút đi chéo theo tám hướng. Nước đi đến nút trống kề theo cạnh; gánh đổi màu quân đối phương ở hai phía đối xứng của quân vừa tới. Vây và mở là phần luật cần bảng ví dụ riêng; không dùng thuật toán cờ vây hoặc tự diễn giải một câu văn thành điều kiện thắng.

Đề xuất khóa `gánh/vây/mở` trong `ruleVersion`, hiển thị gợi ý nước hợp lệ, có hòa khi lặp thế theo chính sách đã công bố. Bảo toàn 16 quân, kiểm đồng thời nhiều cặp gánh, biên bàn, vây nhóm, mở bắt buộc và lặp thế. Xếp sau Ô ăn quan/lô tô vì rủi ro sai luật đồ thị và biến thể cao hơn.

## Hình ảnh, thao tác và tài nguyên

Hướng đồ họa: mặt gỗ ấm `#765A42`, nền nỉ xanh `#244E49`, sỏi ngà `#E8DDC5`, điểm nhấn đồng `#CBA56A`, chữ `#F7F3E8`. Dùng font hiện hành hỗ trợ tiếng Việt, số rõ; biểu tượng quân quan có hình riêng, không chỉ khác màu. Nguồn vector do dự án tự vẽ; âm sỏi nhẹ tự tổng hợp, chỉ khi opt-in. Chuyển động hữu hạn 300–700ms, nút tăng tốc/bỏ qua, reduced motion hiện kết quả trực tiếp.

- SVG/Canvas2D lazy trước, không thêm renderer WebGL/physics. Khi bàn chiếm màn hình thì dừng GPU cảnh bị che, giữ media/lease và personal Hold. Không gắn thêm vòng render liên tục cho game theo lượt.
- Ô ăn quan trên desktop nằm ngang; điện thoại dọc chuyển bàn thành 5 hàng với hai cột dân, giữ chữ thẳng, nhãn “Bạn/Bạn chơi”. Không thu nhỏ 7 cột thành vùng chạm 20px. Mục tiêu chọn ô/chiều ≥44px; quan chỉ hiển thị.
- Lô tô 9 cột ở 320px không đủ 44px/ô: mặc định tự đánh dấu các số đã gọi, số là phần hiển thị, nút “Kinh” lớn riêng. Nếu thêm đánh dấu thủ công, cần chế độ phóng/di chuyển bàn rõ ràng, không bắt người dùng chạm ô tí hon.
- Bàn phím chọn ô/chiều và xác nhận; screen reader có lượt, số quân, nước đi và kết quả; không phát live announcement cho từng viên rải. Chat và duyệt người mới vẫn dùng sheet/dialog chung.
- Ngân sách đề xuất: code + vector nén ≤100 KiB cho game đầu; không thêm texture/âm tải ngoài mặc định. Đây là tiêu chí cần đo khi có prototype, chưa phải số đo đã đạt.

[Kenney](https://kenney.nl/support) công bố CC0 cho game assets; kiểm giấy phép từng gói và giữ provenance nếu dùng. Không lấy tranh/ảnh từ bài báo, UI HangMu hay model không có giấy phép. 3D bàn/sỏi là nâng cấp sau pilot, dùng geometry/instancing của renderer hiện tại; ưu tiên chữ rõ và pin trước hiệu ứng.

## Kiến trúc và nghiệm thu chung

Một activity đang chạy trong phòng, state có `kind`, `ruleVersion`, `revision`, người chơi và snapshot hữu hạn. Pure reducer trên server là nguồn kết quả; command có session/epoch/expected revision/id chống lặp. Không tin điểm, người chơi, quân hoặc vé do client gửi. DTO riêng che thông tin chưa được phép xem. WebSocket phòng hiện có đủ cho game theo lượt, chưa cần thêm nền tảng multiplayer.

Không tự tua/chuyển phim khi mở game. AFK có thông báo và quyền xin tạm nghỉ; không âm thầm xử thua khi tab hidden trên điện thoại. Luật timeout, bỏ cuộc, host chuyển quyền, khôi phục và kết thúc phải công bố trước khi bắt đầu. Đổi luật chỉ ở lobby ván, không giữa lượt.

Nghiệm thu: deterministic rule fixtures + bảo toàn quân, ACL/out-of-turn/stale/dedupe, ngắt mạng giữa lượt và late join, 3 phòng × 10 thành viên local, state không tăng qua nhiều ván, portrait/landscape/keyboard/reduced motion, âm tắt không tái phát. Sau đó pilot người biết chơi để xác nhận luật và iOS/Android/M1 để đo frame time, bộ nhớ, pin. Software GPU/backend load không thay thế pilot này.

## Source tham khảo, chưa nhập code

| Source | Giấy phép đã xem | Quyết định |
| --- | --- | --- |
| [Hantaro171902/o-an-quan](https://github.com/Hantaro171902/o-an-quan) | MIT | Terminal C++; README có cách mô tả tiếp rải cần đối chiếu với quy tắc ô kế tiếp. Không lấy làm engine luật mặc định |
| [YoshimotoMasashi/vietnamese-loto-game](https://github.com/YoshimotoMasashi/vietnamese-loto-game) | CC0-1.0 | Vue UI tham khảo; chưa chạy hoặc xác minh fairness/ACL; API root README không có |
| [boardgame.io](https://github.com/boardgameio/boardgame.io) | MIT | Tham khảo reducer/turn/state; giữ multiplayer của phòng thay vì thêm stack ở MVP |
| [Phaser](https://github.com/phaserjs/phaser) | MIT | Chỉ cân nhắc game thời gian thực về sau, không cần cho bàn theo lượt |

Metadata/giấy phép không phải kiểm toán code. Trước khi tái sử dụng cần pin commit, đọc code/phụ thuộc, kiểm asset và regression. Source không có giấy phép rõ đã loại khỏi danh sách tái sử dụng.
