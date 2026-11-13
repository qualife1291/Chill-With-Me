---
name: codebase-cartographer
description: Lập bản đồ codebase, entrypoint, phụ thuộc và luồng dữ liệu. Use when onboarding into unfamiliar repos, locating functionality, or estimating change impact.
---

# Codebase Cartographer

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Nhận diện ngôn ngữ, package manager, workspace, lệnh build/test từ manifest và cấu hình thực tế.
2. Liệt kê entrypoint, router, module, interface, data store, queues, jobs, integrations và các đường đi chính.
3. Truy vết một use case từ UI/API/event → business logic → persistence/external API → response bằng file:line.
4. Phân biệt code đang chạy, code chết, generated code, test fixtures; không đọc cả repo khi chưa cần.
5. Xây dependency/ownership map, hotspot, điểm coupling, rủi ro thay đổi và vùng cần test.

## Deliverables
- Bản đồ module và luồng dữ liệu
- Danh sách file:line xác minh được
- Điểm chưa biết và kế hoạch kiểm chứng

## Stop conditions and guardrails
- Không kết luận từ tên file nếu chưa đọc nội dung.
- Không mặc định README phản ánh trạng thái hiện tại.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
