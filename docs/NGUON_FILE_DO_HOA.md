# Nguồn file đồ họa cho rạp3D — khảo sát02/11/2026

Đã đối chiếu trang gói/tác giả và license công bố. **Chưa tải ZIP, giải nén, kiểm tra file license bên trong hoặc chạy model trong Three.js.** Dung lượng dưới đây là gói tải theo trang, không phải dung lượng asset tối ưu cuối cùng. Không có asset trả phí được mua.

## Bộ đề xuất cho dự án

Ưu tiên Quaternius Standard cho avatar/animation, Kenney cho module rạp/nội thất, ambientCG cho thảm, Poly Haven cho chất liệu và Lucide cho icon. Dựng phòng bằng module để tạo đúng2–10ghế; dùng model nguyên rạp làm tham khảo hoặc đối chứng, không chọn mặc định khi chưa biết polygon/material count.

| ID | Gói tải cụ thể | File/định dạng công bố | Miễn phí/license công bố | Dùng cho dự án và điểm cần kiểm tra |
|---|---|---|---|---|
| A01 | [Universal Base Characters — Quaternius](https://quaternius.itch.io/universal-base-characters) | Standard ZIP122MB; trang tác giả nêu FBX/glTF | Standard tải theo name-your-own-price; CC0 công bố | Avatar humanoid, trung bình13k tris. Nội dung tổng gói gồm6body nhưng chưa xác nhận Standard chứa đủ6. .blend rig/source nằm trong bảnSource600MB trả phí, không đưa vào kế hoạch0đ |
| A02 | [Universal Animation Library — Quaternius](https://quaternius.itch.io/universal-animation-library) | Standard ZIP15MB; FBX/GLB theo trang tác giả | Standard miễn phí, CC0 công bố; Pro/Source trả phí | Có locomotion/sitting trong mô tả toàn bộ thư viện. Chưa xác nhận sitDown/standUp có trong Standard. Chọn in-place/root-motion-disabled cho path controller; kiểm tra tên rig/version |
| A03 | [Animated Characters3 — Kenney](https://kenney-assets.itch.io/animated-characters-3) | ZIP689kB | CC0; name-your-own-price | Avatar dự phòng nhẹ. Trang chỉ liệt kê idle/jump-pose/running: thiếu động tác ngồi và đi bộ phù hợp; không gọi là bộ hoàn chỉnh |
| A04 | [Furniture Kit — Kenney](https://kenney.nl/assets/furniture-kit) |140file/model theo trang; định dạng trong ZIP chưa kiểm | CC0; Download → Continue without donating | Props sảnh, bàn/ghế/đồ nội thất. Không khẳng định có ghế rạp chuyên dụng; kiểm mesh và chỉnh style |
| A05 | [Building Kit — Kenney](https://kenney.nl/assets/building-kit) |80file, có animation theo trang | CC0; tải miễn phí | Module tường/cửa dựng khung rạp; scene tự ghép. Kiểm format/door animation trong gói |
| A06 | [Carpet013 — ambientCG](https://ambientcg.com/view?id=Carpet013) |PBR ZIP1K JPG10MB; PNG19MB; có nhiều độ phân giải | CC0 | Thảm đỏ hợp rạp; dùng1K hoặc resize512px; chọn maps cần, không đem toànZIP vào web |
| A07 | [Fabric Pattern07 — Poly Haven](https://polyhaven.com/a/fabric_pattern_07) |1K–8K, JPG/PNG/EXR; ZIP/Blend/glTF material | CC0 | Vải dệt để thử normal/roughness; có hoa văn caro, **không phải nhung trơn**. Cần chỉnh màu/giảm pattern hoặc chọn vải khác trước dùng cho ghế |
| A08 | [UI Pack — Kenney](https://kenney-assets.itch.io/ui-pack) |ZIP1,1MB;400+sprites và vector source | CC0 | Nút/panel kiểu game; chỉ lấy phần phù hợp, không render form bằng ảnh. Phần chat/playlist vẫn DOM accessible |
| A09 | [Lucide icons](https://lucide.dev/icons/) |SVG/package React | ISC; icon kế thừa Feather có noticeMIT | Camera, ghế/người, playlist, skip, volume, kick; import từngicon và giữ notices |
| A10 | [Mixamo — Adobe](https://www.mixamo.com/) |Rig/animation; định dạng tải cần kiểm trong tài khoản | Miễn phí với AdobeID, royalty-free cho project; **không phải CC0** | Dự phòng thiếu sitDown/standUp. Cần account, retarget và kiểm quyền phân phối file vào web; không phát hành lại như thư viện asset riêng |

Trang Quaternius chính chủ: [Base Characters](https://quaternius.com/packs/universalbasecharacters.html), [Animation Library](https://quaternius.com/packs/universalanimationlibrary.html). Các trang hiện công bốCC0, nhưng vẫn phải giữ license trong đúngZIP/revision lúc tải; không dùng thông tin catalog bên thứba để ghi đè license thực tế.

## Model ghế và nguyên rạp để đối chiếu

Các trang dưới được tìm thấy trong kết quả tìm kiếm chính nguồnSketchfab, có nhãn downloadable/CC Attribution. Mở trực tiếp bằng công cụ hiện bị403, nên **chưa xác minh phiên bảnCC-BY, định dạng, polygon, dung lượng hoặc nút tải đang hoạt động**. Chỉ đưa vào shortlist, chưa approve dùng production.

| Model/tác giả | Link | Vai trò |
|---|---|---|
| Cinema Seat — Connor Wassall | [Trang model](https://sketchfab.com/3d-models/cinema-seat-6c44adbc299c4f8ab45e9913d58cfcba) | Ghế rạp đơn, có thể instance2–10lần nếu topology phù hợp |
| Theater Cinema Auditorium (Style1of2) — jimbogies | [Trang model](https://sketchfab.com/3d-models/theater-cinema-auditorium-style-1-of-2-36cb0c4af0f94f9ca233658204858305) | Tham khảo không gian; kiểm có tách mesh ghế/tường và chỉnh lại seating được không |
| Cinema/movie theater seat — Comicaroid | [Trang model](https://sketchfab.com/3d-models/cinemamovie-theater-seat-b8bcabfa355d4137910ef2e45b56b9bc) | Ghế đối chứng khác để so style/mesh budget |

Không lấy screenshot model làm texture. Nếu dùng CC-BY phải giữ tác giả, link asset, license chính xác và mô tả chỉnh sửa ở Credits. Nếu model thực tế có NC/ND hoặc điều kiện không phù hợp thì bỏ khỏi bộ production. Tài khoản/download availability phải kiểm tra tại lúc tải.

## Nguồn vật liệu mở rộng

- [Poly Haven fabrics](https://polyhaven.com/textures/fabric): tìm vải ghế trơn; [wood](https://polyhaven.com/textures/wood): gỗ trang trí. Tải map riêng, thường1K đủ cho rạp nhỏ; không dùng default4K/8K vô điều kiện.
- [ambientCG](https://ambientcg.com/): carpet/fabric/wood/PBR. [License](https://docs.ambientcg.com/license/) nêuCC0 và cho phép đưa raw files vào project.
- [Poly Haven license](https://polyhaven.com/license): CC0 cho asset; không nhầm license asset với logo/website/software bổ trợ.
- [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html): tài khoản và quyền dùng nhân vật/animation cho project.
- [Lucide license](https://lucide.dev/license): giữ ISC và noticesMIT liên quan.

## Tải gì trước, tránh tải dư

1. A02 Standard15MB: liệt kê clips và rig trước. Thiếu sitting transition thì ghi gap, chưa tải model nặng để rồi không retarget được.
2. A01 Standard122MB: lấy1avatar,1hairstyle, subset palette để thử animation; ZIP lớn không đồng nghĩa phải ship122MB.
3. A04/A05: kiểm module có hợp phong cách; nếu đổi nhiều thì tự dựng tường/sàn/màn bằng primitives, chỉ dùng props cần.
4. A06: chọn1K-JPG; giữ color/roughness/normal nếu cần, bỏ displacement và maps không sử dụng.
5. A07: dùng làm đối chứng vật liệu, không coi pattern07 là ghế nhung hoàn chỉnh.
6. A09: icons trực tiếp; A08 chỉ khi thống nhất style gameUI. Không dùng hai bộicon pha trộn tùy ý.
7. Sketchfab chỉ sau license và model audit; không block prototype nếu không tải được.

## Kiểm tra file sau tải

- Lưu nguyênZIP và license ngoài public build; ghi SHA256, nguồn, ngày, version. Không lấy checksum khi chưa có file.
- GLB/glTF ưu tiên runtime; FBX/OBJ/.blend dùng để xử lý rồi exportGLB. OBJ không mang skeleton/animation, không chọn cho avatar hoạt động.
- Inspect triangles/materials/textures/bones/clips/root transform/scale; không chạy script lạ từ archive hoặc Blender file chưa kiểm.
- Test sit/stand chân không xuyên sàn, hip khớp ghế, đi in-place không double root-motion. Avatar13k tris×10≈130k trước scene, nên cầnLOD cho mobile theo budget.
- Texture màu sRGB; normal/roughness là data tuyến tính. Kiểm normalGL/DX đúng hướng; tránh gán sai làm ghế trông lõm/ngược.
- Nén/atlas/LOD; không tự cho rằng “game-ready” nghĩa là web-ready. Mục tiêu scene initial≤5MB compressed cần đo trên output cuối.
- Tách freeStandard và paidSource trong manifest; không copy asset chưa rõ license vào public repo.

## Trạng thái bàn giao

Có danh sách nguồn cụ thể và lựa chọn ưu tiên; **chưa tải file đồ họa**. Manifest [assets/sources.json](../assets/sources.json) ghi trạng thái candidate, chưa có hash/đường dẫn runtime. Chỉ sau kiểm file và render mới nâng trạng thái approved.

## Review ngày 06/11/2026

Đã mở lại trang tác giả Quaternius: [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) công bố 6 base nam/nữ theo ba tỷ lệ cơ thể, định dạng FBX/OBJ/Blend/glTF, CC0. [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) công bố hơn 120 animation humanoid, FBX/GLB/Blend, CC0. Hai trang có cả lựa chọn mở rộng/tài trợ; chỉ license đi kèm file tải cụ thể mới xác lập quyền cho file đó.

Ưu tiên thử base Regular nam/nữ thay phong cách Knight/Mage cho bối cảnh xem phim. Chưa tải/retarget/benchmark các file mới nên chưa kết luận đẹp hoặc nhẹ hơn bản KayKit đang dùng (khoảng 333–342 KB/model). Điều kiện thay: license/hash đi kèm, rig đầu và tay đúng, walk/sit/wave không lỗi, kiểm thử 10 skeleton độc lập và đo dung lượng/GPU. Không coi shortlist là model đã tích hợp.
