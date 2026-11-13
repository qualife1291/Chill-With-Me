---
name: failure-resilience
description: Thiết kế retry, offline-first, circuit breakers, disaster recovery và graceful degradation. Use when systems fail partially or under load.
---

# Failure Resilience

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Liệt kê failure modes cho từng dependency, timeout, rate limit, partial write, duplicate, unavailable.
2. Đảm bảo retry safe: idempotency, bounded attempts, backoff+jitter, dead-letter/compensation.
3. Rà cache consistency, fallback quality, offline queue, cancellation và recovery order.
4. Thiết lập chaos/load cases, health checks, bulkheads và resource budgets.
5. Document recovery playbooks, RPO/RTO nếu cần và rollback paths.

## Deliverables
- Failure-mode table
- Recovery design
- Resilience test plan

## Stop conditions and guardrails
- Không retry non-idempotent write vô hạn.
- Không giấu lỗi nghiêm trọng bằng silent fallback.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
