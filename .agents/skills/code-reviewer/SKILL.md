---
name: code-reviewer
description: Review code như senior engineer: correctness, security, performance và maintainability. Use for diff review and PR readiness.
---

# Code Reviewer

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Đọc yêu cầu và diff cùng context vùng bị ảnh hưởng; không chỉ style nitpicks.
2. Ưu tiên bug, auth boundary, concurrency, data loss, API compatibility, tests, maintainability.
3. Với mỗi finding ghi severity, path:line, reproduction/specific scenario và remediation.
4. Tách blocker, improvement, question; báo không có finding nếu evidence không chỉ ra lỗi.
5. Đối chiếu code, tests, changelog, docs và migration; nêu limitations của review.

## Deliverables
- Findings ordered by severity
- Residual risks/testing gaps
- Suggested targeted fixes

## Stop conditions and guardrails
- Không bịa line numbers.
- Không chấp nhận lỗi chỉ vì tests hiện tại pass.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
