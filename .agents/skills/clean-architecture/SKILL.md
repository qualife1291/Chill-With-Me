---
name: clean-architecture
description: Tổ chức code sạch, dễ test, đúng trách nhiệm và type-safe. Use when implementing or refactoring business logic across languages.
---

# Clean Architecture

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Theo style và idiom của ngôn ngữ/framework repo; giữ diff nhỏ, consistent.
2. Tách side effects và pure logic, dùng dependency injection khi đem lại giá trị test/maintain.
3. Duy trì single source of truth, clear ownership, boundaries và contracts.
4. Xử lý nullability, error types, async cancellation, lifecycle, idempotency, resource cleanup.
5. Loại bỏ duplication thực sự, tránh overengineering; refactor phải có regression coverage.

## Deliverables
- Thay đổi code có phạm vi rõ
- Giải thích design decisions
- Lint/typecheck/tests phù hợp

## Stop conditions and guardrails
- Không rewrite cả file nếu chỉ sửa vài dòng.
- Không thêm abstraction chỉ để thỏa một pattern.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
