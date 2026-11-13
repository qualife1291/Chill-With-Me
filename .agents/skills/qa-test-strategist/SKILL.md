---
name: qa-test-strategist
description: Lập test pyramid, test matrix và test evidence. Use before implementing tests or deciding release readiness.
---

# Qa Test Strategist

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Map acceptance criteria → unit/integration/contract/e2e/manual tests; ưu tiên risk-based.
2. Bao phủ happy path, boundaries, bad inputs, permission, concurrency, latency, offline, duplicate, retry và rollback.
3. Quy định fixture deterministic, mock boundaries đúng chỗ, clock control, isolation và cleanup.
4. Phân biệt test không chạy được, fail, flaky, skipped, pass và không có coverage.
5. Thiết lập release gate: lint, typecheck, unit, integration, e2e, security checks phù hợp.

## Deliverables
- Test matrix có priority và environment
- Coverage gaps
- Verification report pass/fail/not-run

## Stop conditions and guardrails
- Không ghi pass khi chưa chạy.
- Không chỉ test happy path.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
