# Read map

Bắt đầu ở [PROJECT_STATE](../PROJECT_STATE.md): source/version, bằng chứng và việc tiếp theo. Sau đó mở **một** hàng/task phù hợp, không preload cả docs/archive.

| Cần làm | Nguồn sở hữu |
|---|---|
| Hợp đồng agent/quyền release | [AGENTS](../AGENTS.md) |
| Tìm module/luồng dữ liệu | [ARCHITECTURE](ARCHITECTURE.md) |
| Lệnh/giới hạn/runbook | [cinema README](../cinema/README.md) |
| Acceptance và backlog đang mở | [roadmap](KE_HOACH_TRIEN_KHAI_HIEN_HANH.md) |
| Game 3D / hô số / nguồn nhạc | [GAME_3D_AUDIO](GAME_3D_AUDIO.md) |
| Luật game chính xác | [GAME_RULES_V1](GAME_RULES_V1.md) |
| Nguồn/biến thể/license game | [VIETNAMESE_GAMES](VIETNAMESE_GAMES.md) |
| StyleX/token decisions | [DESIGN_SYSTEM](DESIGN_SYSTEM.md) |
| Lễ/ngày-đêm, calendar/TZ gates | [SEASONAL_EXPERIENCE](SEASONAL_EXPERIENCE.md) |
| Tính năng tương lai ngoài game | [ADVANCED_EXPERIENCE](ADVANCED_EXPERIENCE.md) |
| Security findings | [SECURITY_REVIEW](SECURITY_REVIEW.md) |
| Chọn skill | [AGENT_SKILLS](AGENT_SKILLS.md) |

Test results thuộc `cinema/evidence/`, không chép toàn bộ log vào Markdown. Source fixtures/generated/build giữ ngoài docs. Mốc đã đóng có trong Git history; archive/V2/V3 là thiết kế lịch sử, không phải source status. Chỉnh code thì cập nhật đúng owner; tại handoff chỉ đổi facts trong PROJECT_STATE. Validate: `npm run check:docs`, `python3 scripts/validate_skills.py`.

Research only: [3D product V3](THIET_KE_RAP_3D_V3.md), [asset sources/licenses](NGUON_FILE_DO_HOA.md), [YouTube Premium](YOUTUBE_PREMIUM.md), [operating security](BAO_MAT_VA_VAN_HANH.md), [free-tier budget](NGAN_SACH_FREE_TIER.md), [voice providers](NVIDIA_NIM_NGHIEN_CUU_VA_KE_HOACH_KIEM_THU.md). `archive/` preserves superseded proposals; open it only for historical rationale.

Cross-browser/device QA: [DEVICE_TESTING](DEVICE_TESTING.md) owns the 37-profile reproduction and physical-pilot boundary; current evidence remains in PROJECT_STATE.
