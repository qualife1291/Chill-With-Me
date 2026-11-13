---
name: qa-debugger
description: Điều tra bug theo evidence, tái hiện, root cause và regression test. Use when failures are intermittent, environment-specific or poorly understood.
---

# Qa Debugger

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Thu thập symptom, expected/actual, reproducer, environment, timeline, logs, commit range.
2. Xây hypotheses có thứ tự, chỉ thay đổi một biến/lần; dùng binary search/git bisect khi phù hợp.
3. Truy vết call stack, state transitions, boundaries; thêm instrumentation tối thiểu.
4. Chứng minh root cause trước khi fix; viết regression test thất bại trước khi fix nếu khả thi.
5. Sau fix chạy targeted + neighboring tests, kiểm tra side effects, remove debug code.

## Deliverables
- Reproduction steps + root cause evidence
- Minimal fix
- Regression test + known limitations

## Stop conditions and guardrails
- Không sửa nhiều chỗ dựa vào đoán mò.
- Không xóa log/test có giá trị mà không giải thích.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
