# Kế hoạch đồ họa và công nghệ rạp 3D

Cập nhật02/11/2026. Bổ sung [đặc tả v3](THIET_KE_RAP_3D_V3.md). Đây là thiết kế triển khai, không phải kết quả render/benchmark. Quyết định đã chốt: host phát ngay dù một mình; người mới vào xem tiếp;2–10 là sức chứa host chọn, không phải số người tối thiểu để phát.

## 1. Nguyên tắc trải nghiệm

Video là hoạt động chính; cảnh rạp và nhân vật tạo cảm giác cùng hiện diện. Video/chat phải hoạt động ngay cả khi asset3D lỗi hoặc GPU yếu. Duyệt vào phòng là ranh giới quyền truy cập, không phải hàng rào bắt cả phòng chờ. Người đang xem không nhận pause vì người khác join, tải model, buffer, đổi góc hoặc đi tới ghế.

Đề xuất hình ảnh: rạp boutique nhỏ, phong cách stylized bán thực, vật liệu sạch, ghế nhung đỏ rượu, tường xanh than, lối đi màu hổ phách. Không cố photorealistic: texture nặng, shadow và reflection phức tạp khó giữ hiệu năng mobile. Nhân vật có hình khối mềm, tỉ lệ gần người thật nhưng mặt đơn giản; không cần tóc vật lý, vải mô phỏng hoặc biểu cảm khuôn mặt phức tạp ở MVP.

## 2. Bố cục không gian 3D

Quy ước world: mét, Y-up, màn chiếu tại Z=-6, cửa sau tại Z=+4, nhìn về -Z. Kích thước blockout ban đầu rộng10m × sâu12m × cao4m; hiệu chỉnh bằng kiểm tra sightline, không xem là bản vẽ xây dựng.

- Màn chiếu đặt trước rạp; phía dưới có bục thấp, phía sau là tường tối. Không trang trí cạnh màn gây hút mắt.
- Lối đi giữa rộng khoảng1,2m; mỗi ghế rộng0,75m; khoảng cách hàng khoảng1,5m. Camera đi theo lối, không xuyên lưng ghế.
- Ghế2–4: một hàng, chia đều hai bên lối; ghế5–8: hai hàng;9–10: hai hàng cân bằng. Ghế lẻ ưu tiên nhóm trái/phải theo layout deterministic, không ngồi ngay trên lối.
- `layout(capacity, layoutVersion)` tạo đúng N seat anchors, một entrance anchor và path graph. Không instantiate10ghế rồi che ghế thừa bằng opacity.
- Ghế sau cao hơn khoảng0,25m, bậc đi theo geometry; đường avatar phải dùng cùng độ cao. Ghế phải có tọa độ chân/hip/eye anchor riêng để không nổi người trên mặt ghế.
- Tiêu chí sightline: từ tất cả seat anchors, màn chiếu trong vùng nhìn mặc định; avatar phía trước không che vùng playerDOM. Với rạp nhỏ, ưu tiên ghế thấp và screen cao vừa đủ.

```text
                  TƯỜNG TRƯỚC
            [      MÀN CHIẾU      ]

           A1 A2       |       A3 A4 A5
           B1 B2       |       B3 B4 B5
                       |
                LỐI ĐI GIỮA
                       |
                   CỬA VÀO
```

Sơ đồ minh họa10ghế; generator giảm số ghế theo capacity, không giữ ID/mesh dư. Không cho đổi capacity giữa phiên ở MVP.

## 3. Bố cục màn hình ứng dụng

### Desktop ≥1200px

Header56px: tên phòng, số người/capacity, trạng thái kết nối, mời bạn, menu. Main gồm sân khấu3D co giãn và sidebar320–360px. Sidebar có tabs Chat / Playlist / Thành viên; host thêm badge số yêu cầu đang chờ. Footer controls dưới scene: hai camera, tới ghế, nhìn màn hình, chế độ nhẹ, TTS/volume. Các control không phủ iframe.

PlayerDOM và canvas cùng một SceneStage nhưng là hai lớp có vùng tương tác phân biệt. Overlay UI chỉ trong vùng rạp không thuộc hình chữ nhật player; request notifications vào sidebar, không bay qua màn phim. Chat không thay kích thước/remount player khi có tin mới. Drawer được dành không gian bằng layout thay vì phủ player khi cần.

### Tablet768–1199px

Scene/player chiếm hàng đầu; tabs chat/playlist/member phía dưới. Giảm đồ họa tự động theo đo frame time, không chỉ theo user-agent. Landscape có thể dùng sidebar280px nếu player vẫn đủ kích thước; portrait giữ một cột.

### Mobile320–767px

Header gọn; vùng xem trước, hai nút camera + nút tới ghế bên dưới; chat/playlist dùng tabs trong phần còn lại. Dùng `100dvh` có fallback và safe-area; bàn phím mở không đẩy player ra khỏi layout hoặc gây seek. Không joystick bắt buộc; thao tác đi ghế là nút một chạm. Drag nhìn chỉ trên canvas, không bắt touch trên player/chat.

Nếu iframe phối cảnh quá nhỏ/nghiêng, chuyển sang playerDOM phẳng đủ lớn và canvas rạp thành vùng phụ. Đây là chế độ tương thích trong chính trải nghiệm3D, không che player bằng hình màn chiếu giả. Khi muốn xem fullscreen, dùng fullscreen của player; camera/nhân vật không cố phủ lên fullscreen.

## 4. Quyết định renderer và màn chiếu

**Đường chắc chắn để triển khai trước:** Three.js render rạp/nhân vật; một YouTube iframeDOM thật dành vùng xem rõ ràng. Player controller độc lập scene. **Đường nâng cấp sau spike:** phối cảnh iframe bằng CSS3D/camera projection khi đáp ứng pointer/size/policy/occlusion/zoom trên trình duyệt mục tiêu.

Không dùng YouTube `VideoTexture`, không fetch stream, không capture iframe sang canvas. Không chọn CSS3D trước khi chứng minh khả năng hiển thị và tương tác; nó không tự ghép depth buffer với WebGL. Với hai camera, trước tiên đảm bảo iframe không reload khi chuyển mode. Prototype thử screen rect/camera matrix, không đổi DOM parent trong mỗi frame.

Milestone quyết định: ở ngày3 của spike, nếu chưa đạt click controls, phụ đề, fullscreen, zoom200%, iOS và không che player, giữ player phẳng cho alpha. Scene3D vẫn là giao diện chính; không trì hoãn core vì giải pháp phối cảnh không chắc chắn.

## 5. Camera và chuyển cảnh cụ thể

- Camera thứ ba là mặc định lúc vào: offset sau avatar1,8m, trên vai0,5m; FOV60°. Camera follow dùng damping theo deltaTime, raycast tường rút khoảng cách, clamp để không nằm trong đầu.
- Camera thứ nhất: eye anchor của avatar, giấu đầu avatar cục bộ nếu gây clipping, không giấu avatar trên client khác. Khi ngồi, eye height theo pose; không cố gắn thẳng vào bone đang rung.
- Chuyển góc blend khoảng300ms; reduced-motion đổi ngay. Không chuyển mode tự động khi người khác join hoặc video next.
- Nút “Nhìn màn hình”: xoay tới screen target trong250ms, không thay seat hay playback.
- Nút “Tới ghế”: bước theo path4–8s. Camera không head-bob; người dùng được đổi góc hoặc bỏ qua chuyển động bất kỳ lúc nào.
- Không tự orbit, không cutscene dài, không làm blackout player lúc đổi camera. Fade chỉ áp scene khi cần, không lên iframe.
- Pointer input chỉ active khi focus canvas; C đổi camera không chạy khi đang nhập text, có IME composition, dialog mở hoặc focus iframe. Mobile có nút text/icon có label.

## 6. Nhân vật, rig và animation pipeline

Asset contract: GLB, một skeleton chuẩn dùng chung, scale1đơn vị=1m, feet ở mặt đất, hướng forward thống nhất, không embedded camera/light tùy ý. Material tối đa2/avatar, atlas dùng chung. Skeleton budget≤50bones, animation baked, không physics runtime. Hai body presets dùng cùng rig để tái dùng clips.

Animation cần: idleStanding, walk, turnLeft/right, sitDown, seatedIdle, standUp. Chọn in-place clips; locomotion bằng path controller tránh root-motion làm lệch seat. Walk cycle speed điều chỉnh theo tốc độ khoảng1,2m/s, crossfade150–250ms. SitDown khớp hip anchor và seat height, không dựa IK phức tạp cho ghế cùng loại.

Motion server state là phase/path/startTime/duration/revision; client render nội suy. Không gửi bone pose qua mạng. Remote avatar vào muộn tính phase từ thời gian server; quá hạn snap final pose. Khi kick, quyền bị thu hồi trước; animation fade không giữ socket/media alive.

MVP không lipsync, emote spam, hair simulation, outfit upload hoặc avatar tự tải từURL. Cá nhân hóa qua palette/kiểu tóc có sẵn trong asset allowlist. Avatar custom/skeleton retarget là backlog sau, không làm tăng tải core.

## 7. Ánh sáng và vật liệu

Palette: nền#0B0F17, tường#1B2433, ghế#6D2639, viền kim loại#555D68, đèn#F3BD75. Màu chữ UI giữ token accessible riêng; không dùng chữ đỏ tối trên ghế.

Dùng baked ambient occlusion, texture atlas và ánh sáng hemisphere/ambient thấp; một key light nhẹ. Đèn aisle là emissive mesh không phải hàng chục pointlights. Không volumetric fog, realtime reflections, SSAO hay bloom mặc định. High tier có thể thêm bloom rất nhẹ ngoài vùng player sau đo; low tier tắt postprocessing.

Presets welcome/screening/intermission chỉ điều khiển intensity/emissive theo server timestamps. “Phát ngay” không chờ dim xong; ánh sáng chuyển song song2s. Người vào giữa phim thấy lighting state hiện tại, không bật welcome cho cả phòng. Accessibility “Sáng hơn” local, không sửa room state.

Không lấy pixel phim làm màu ánh sáng động. Không hứa tiêu chuẩn chiếu rạp vật lý hoặc độ sáng nits đã hiệu chuẩn trên màn hình người dùng.

## 8. Âm thanh

Video giữ pipelineYouTube. Không biến iframe audio thành WebAudio source hoặc cam kết surround/Dolby. TTS clip của app có thể dùng WebAudio panner khi CORS/codec hỗ trợ; listener đặt tại vị trí người ngồi, không camera thứ ba. Stereo dễ nghe là default; spatial tùy chọn riêng, không giảm độ rõ tiếng Việt.

Âm bước chân chỉ lúc vào rạp trước chiếu và mặc định rất nhỏ/tắt trong screening. Không tạo hiệu ứng cửa mỗi lần người mới join làm phiền phòng. TTS mute không tải clip, autoplay unlock qua thao tác người dùng. Không dùng music ambience đè lên phim. Không chỉnh volume phim tự động mặc định.

## 9. Late join không gián đoạn

1. Phòng đang chạy timeline `{videoId, generation, status, anchorPositionSec, anchorServerTimeMs}` dù đang chỉ1người.
2. Người mới xin vào → host duyệt → server cấp membership/seat. Chưa được duyệt thì không nhận URL/video/chat riêng.
3. Client nối realtime, lấy snapshot và clock-offset. Ưu tiên tải player/chat shell; scene/avatar lazy-load song song.
4. Khi player ready, tính `target = anchorPosition + elapsed` nếu playing, hoặc anchor nếu paused. Kiểm tra generation mới nhất trước load/seek; không dùng position tại thời điểm accept đã cũ.
5. Nếu browser chặn autoplay: hiện nút “Bấm để xem tiếp”; khi người dùng bấm lại tính target theo snapshot mới nhất. Không pause room và không phát từ đầu.
6. Trong lúc scene tải/đi ghế, video vẫn tiếp tục ở vùng playerDOM. Khi scene sẵn sàng chỉ thay trình bày, không restart iframe/video.
7. Người mới xuất hiện ở cửa đúng lighting phase, có thể tới ghế hoặc “Ngồi ngay”. Nút này không thay timeline, không kích hoạt pause/play.
8. Host Next trong lúc guest đang load: generation cũ bị hủy; chỉ phát item mới. Host pause thì người vào nhận trạng thái paused đúng, không tự resume cả phòng.
9. Một người buffer/mất WebGL/mất mạng: local recovery. Những người còn lại xem bình thường. Khi tất cả rời, room có thể expire theo lease; không cam kết vẫn tồn tại vô hạn khi không người.

## 10. Cấu trúc source và ownership

```text
apps/web/src/
  features/room/        # layout DOM, lifecycle membership
  features/player/     # iframe duy nhất, generation, autoplay, timeline
  features/cinema/     # Canvas, RoomGeometry, Seating, Lights
  features/avatar/     # rig cache, animation controller, palettes
  features/camera/     # first/third person, collision, accessibility
  features/chat/       # isolated store, không render lại canvas/player
  features/playlist/   # suggestions, revision, next/skip
  features/admission/  # request/wait/accept/reject/kick
  features/audio/      # TTS playback/spatial, unlock, cancellation
packages/
  protocol/            # schemas, shared limits, roles
  sync-core/           # timeline/generation/clock math
  cinema-layout/       # deterministic seats/path graph/version
  asset-catalog/       # allowed assets + licenses + hashes
apps/worker/src/
  gateway/             # session/Origin/CSRF, upload admission
  room-slot/           #3DO; seats, queue, membership transactions
  tts-adapter/         # optional hosted TTS; không chạy inference trong DO
```

UI React nhận event qua store selectors; camera/animation frame math cập nhật refs, không React state mỗi frame. Asset cache global cho1tab, clone skeleton đúng cho mỗiavatar nhưng share geometry/texture; dispose instance khi rời, shared asset theo reference count. Không dispose texture đang dùng bởi avatar khác.

Server không mô phỏng vật lý. Một DO cho mỗi slot quản lý authoritative seat/approval/playback/playlist; không gửi camera transform, không heartbeat DB write mỗi frame. Motion event nhỏ và bounded; camera local hoàn toàn. Hibernation vẫn là thiết kế mục tiêu, cần test transition deadlines/alarm.

## 11. Ngân sách hiệu năng đề xuất

| Hạng mục | Low/mobile | Medium/desktop | Cách kiểm chứng |
|---|---|---|---|
| FPS mục tiêu |30 |60 |Player đangdecode +10avatar +chat, không scene trống |
| DPR ban đầu |1 |≤1,5 |Giảm khi frame time xấu, cho user override |
| Visible scene triangles |≤120k |≤250k |Renderer metrics, gồm10avatar |
| Draw calls |≤60 |≤100 |Atlas, instancing ghế; đo thật |
| Realtime shadows |Off |Tối đa1map nhỏ nếu budget |A/B thermal/frame time |
| Texture atlas |512–1024px |1024px |GPU memory profiling, không chỉ file size |
| Asset initial3D compressed |≤5MB |≤5MB |Network trace; shell/player không chờ |
| App shell JS gzip |≤180KB trước3D chunk |Tương tự |Build report,3D lazy chunk đo riêng |
| Decode/load UI block |Không long task liên tục |Tương tự |Performance trace, worker decode nếu cần |

Các con số là budget ban đầu, không kết quả đạt được. Không phát mọi animation liên tục khi đã ngồi: tắt idle loop tierlow, demand render khi scene đứng yên, invalidate trong chuyển động. Không giảm sampling player sync chỉ để giữFPS.

KhiWebGL contextlost: giữDOM player/chat, hiện “Đang khôi phục rạp”; retry tối đa có backoff rồi chế độnhẹ. Context restore không tạo lại membership hoặc reset playlist. Thử rời/vào20lần để kiểm tra mixer/listener/texture leak. Tải30socket không thay bài đo GPU thật.

## 12. Asset và hồ sơ bàn giao đồ họa

Giai đoạn1 tự dựng blockout từ primitives, avatar capsule; scene có ghế đúngcapacity và camera/path đúng trước làm đẹp. Giai đoạn2 thay mesh bằng asset được kiểm license. Giai đoạn3 bake/atlas/LOD, test mobile rồi mới thêm polish.

Mỗi asset có tên, kích thước, polygon/bones/material count, licenseURL, author, sourceRevision, SHA256, animation list, bounds, screenshots ba góc và modification note. ExportGLB không kèm texture4K dư, light/camera lạ hoặc externalURL. Kiểm orientation và scale tự động trong build pipeline.

Bàn giao thiết kế cần: floorplan2–10ghế; blockout scene; style sheet palette/material; camera rig diagrams; animation state machine; desktop/tablet/mobile compositions; lighting presets; asset manifest; reportsWebGL/playercompatibility. **Chưa có những model/ảnh render này được tạo**; đây là danh mục công việc phải thực hiện, không coi tài liệu là asset hoàn thiện.

## 13. Thứ tự triển khai và cổng quyết định

| Giai đoạn | Ngày công dự kiến | Kết quả review được |
|---|---:|---|
| A: Player/3D spike |3–5 |Iframe không reload khi camera đổi, hai camera, ghếprocedural, latejoin fake-clock |
| B: Layout và blockout |2–3 |Đủ9capacity2–10; desktop/mobile; đường đi không cắt ghế |
| C: Avatar + mỹ thuật |4–6 |Rig/clips, vật liệu, ánh sáng, assetmanifest |
| D: Core và integration |8–12 |3DO, session, sync/chat, approval/seats, playlist/skip, kick |
| E: Responsive/performance/security |5–7 |Đo10avatar,3×10socket, browser thật, quyền/cleanup |
| F: Alpha release |2–3 |Deploy, smoke, rollback, guide, knownlimits |

Nhánh alpha3D/core tổng24–36ngày công theo phân rã này; **thay ước lượng alpha30–45 ởv3**, chỉ sau spike mới khóa backlog. Bản đầy đủ có cloning cộng7–10ngày phát triển +3–5ngày tích hợp/QA nếu provider đạtgate: tổng34–51ngày công, chưa kể chờ quyền/tài nguyên. Đây là ước lượng kế hoạch cập nhật, không cam kết ngày phát hành. Không cộng cả hai baseline với nhau.

Ưu tiên làmA trước: rủi ro nhất là YouTubeDOM trong trải nghiệm3D và hiệu năng mobile, không phải số lượng ghế. Nếu phối cảnh iframe fail, tiếp tục playerDOM phẳng +rạp3D; nếu providerclone fail, alpha vẫn có core và TTSthiết bị nếu khả dụng, ghi rõ thiếuclone.

## 14. Acceptance bắt buộc

- Host một mình phát được; viewer mới vào không gây pause/seek/reset ở client cũ.
- Đợi duyệt60s, tảiassets30s hoặc clickautoplay muộn vẫn bắt đúng timeline mới, không phát từđầu.
- Next xảy ra lúc load/avatar đangđi: chỉ generation mới được phát; không flashvideo cũ.
- Chuyển camera20lần: iframe không reload, volume/captions không mất ngoài giới hạn player; path/avatar state không đổi sai.
- Capacity từ2đến10 tạo đúng sốghế; accept cạnh tranh không vượtcap; kick/reconnect không giữghế ma.
- Video/chat dùng được khi WebGLkhông khả dụng; nhập tiếngViệt không kích hoạt shortcut.
- Thiết bị mobilemục tiêu đạt frame budget khi video decode; full2giờ không tăng memory vôhạn. Nếu chưađạt, giảm tier trước nâng budget.
- Player controls không bị overlay, camera/drawer không bắt pointer củaiframe, fullscreen vàautoplay có lỗi rõràng.

## 15. Nguồn kỹ thuật

[React Three Fiber performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Three.js docs](https://threejs.org/docs/), [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [YouTube minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality), [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay). Asset candidates và license review nằm trong [v3](THIET_KE_RAP_3D_V3.md); chưa có asset bên thứba nào được nhập bằng kế hoạch này.

## Nguồn file đã khảo sát

[Xem danh mục gói model, animation, texture và UI cụ thể](NGUON_FILE_DO_HOA.md). Có phân biệt bản miễn phí/trả phí và nguồn chưa xác minh tải; chưa nhập binary vào dự án.
