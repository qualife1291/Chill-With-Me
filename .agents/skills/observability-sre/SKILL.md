---
name: observability-sre
description: Logs, metrics, tracing, SLO, incidents and production diagnostics. Use when operating services or improving diagnosability.
---

# Observability Sre

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Xác định user journey/critical path, SLI/SLO và error budget nếu phù hợp.
2. Chuẩn hóa structured logs, trace/span/correlation id, severity và redaction.
3. Đo RED/USE metrics và business invariants, thiết lập alert theo user impact.
4. Thiết kế dashboards, runbook, failure injection, graceful degradation và incident timeline.
5. Kiểm tra retention, cost/cardinality và tránh label chứa PII.

## Deliverables
- Telemetry plan + dashboards
- Alert/runbook outline
- Privacy/cost review

## Stop conditions and guardrails
- Không log plaintext tokens/passwords.
- Không nhầm cảnh báo nhiều với cảnh báo hữu ích.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
