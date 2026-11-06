# YouTube Premium trong phòng xem chung · 06/11/2026

**Link video do chủ phòng Premium dán vào không làm các thành viên khác hết quảng cáo.** Ứng dụng đồng bộ video ID và timeline; mỗi trình duyệt tải một iframe YouTube độc lập. URL video không chứa quyền Premium và app không chia sẻ cookie/tài khoản của chủ phòng.

Mỗi người cần tự đăng nhập tài khoản có quyền Premium đang hoạt động, tại khu vực và môi trường phát được hỗ trợ. Google lưu ý khi xem ngoài ứng dụng YouTube hoặc ở cửa sổ ẩn danh, người xem có thể chưa được đăng nhập và vẫn thấy quảng cáo. Việc nhận diện đăng nhập trong iframe còn phụ thuộc trình duyệt/chính sách cookie; ứng dụng không thể bảo đảm Premium được nhận diện trong mọi embed.

Ngay cả Premium vẫn có thể thấy nội dung tài trợ do creator chèn vào video; Google cũng nêu ngoại lệ quảng bá/quảng cáo ở Primetime Channels hoặc một số sự kiện trực tiếp. Không coi Premium là cam kết không có mọi hình thức quảng bá.

Quảng cáo khác nhau giữa người xem có thể gây lệch thời điểm phát. App không có API chính thức để ép bỏ quảng cáo hoặc bảo đảm đồng bộ tuyệt đối qua các đoạn quảng cáo. Giữ iframe chính thức tương tác được; không proxy video YouTube, chia sẻ session hay làm nút “bỏ quảng cáo cho cả phòng”.

Nguồn chính thức đã đối chiếu:

- [YouTube Premium benefits](https://support.google.com/youtube/answer/6308116?hl=en): quyền xem không quảng cáo và các ngoại lệ.
- [I see ads on YouTube videos](https://support.google.com/youtube/answer/7437519?hl=en): đăng nhập, quyền Premium còn hiệu lực và xem bên ngoài ứng dụng.
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference): ứng dụng điều khiển các player nhúng riêng; không có quyền Premium dùng chung qua URL.

Đây là kết luận kiến trúc dựa trên tài liệu chính thức, không phải kết quả thử nhiều tài khoản Premium thực tế. Pilot ads/autoplay trên thiết bị thật vẫn là cổng nghiệm thu mở.

## Readiness và kho tạm

Panel Đồng bộ phòng cho phép thành viên báo quảng cáo/tải: timeline chung dừng; người đó bấm Đã sẵn sàng khi xem tiếp được. Host thấy ai chờ và quyết định resume từ mốc đã dừng hoặc override. Iframe có thể vẫn phát quảng cáo dù timeline chung dừng; app không nhận diện hay bỏ ads tự động.

Kho R2 private là hướng đề xuất cho file local và nguồn media có quyền sao chép: DB chỉ metadata, prefetch đang phát + kế tiếp, cap dung lượng, upload resumable, Range streaming, quyền đọc membership/epoch. Xóa mục/phát hết/đóng phòng giảm tham chiếu; chỉ xóa object khi hết tham chiếu, có tombstone/retry alarm và lifecycle dự phòng. Không xóa file còn được mục/phòng khác dùng. YouTube giữ iframe; live không tải toàn bộ.

R2/quota/credentials chưa được cấu hình, nên kho tạm chưa phải chức năng đã triển khai. Relay hiện tại không lưu binary vào DB.
