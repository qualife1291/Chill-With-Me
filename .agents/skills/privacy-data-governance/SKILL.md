---
name: privacy-data-governance
description: Data privacy, retention, consent, PII controls and auditability. Use when handling personal or sensitive user data.
---

# Privacy Data Governance

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Phân loại dữ liệu theo sensitivity, purpose, legal/contractual constraints và lifecycle.
2. Data minimization; lập inventory nơi thu thập, truyền, lưu trữ, cache, log, backup và delete.
3. Định nghĩa consent, access control, data subject request, retention/expiry và export/delete semantics.
4. Review third-party transfers, telemetry sampling, tenant isolation và encryption boundaries.
5. Thiết kế tests cho redaction, deletion propagation và unauthorized access.

## Deliverables
- Data flow map
- Retention/access matrix
- Privacy verification cases

## Stop conditions and guardrails
- Không tự suy luận tuân thủ pháp lý nếu chưa có legal review.
- Không đưa PII vào test fixture public.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
