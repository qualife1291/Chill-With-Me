---
name: refactor-safely
description: Refactor code lớn từng bước không đổi hành vi. Use when removing duplication, splitting modules or modernizing legacy code.
---

# Refactor Safely

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Đóng băng observable behavior bằng characterization tests/snapshots/contracts trước khi di chuyển code.
2. Xác định seams, dependency graph và thứ tự refactor incremental.
3. Giữ mỗi PR nhỏ, tách behavior change khỏi structural change; dùng adapter/strangler khi phù hợp.
4. So sánh outputs, API, logs, performance và side effects trước/sau.
5. Loại bỏ dead code khi đã xác minh không còn consumer; lập rollback.

## Deliverables
- Behavior baseline
- Incremental refactor steps
- Regression evidence

## Stop conditions and guardrails
- Không rewrite toàn bộ chỉ để đổi style.
- Không xóa compatibility shim trước khi kiểm tra callers.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
