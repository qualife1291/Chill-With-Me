---
name: api-security
description: Threat modeling, authentication, authorization, secrets, token lifecycle và input validation. Use when dealing with API security or sensitive data.
---

# Api Security

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Xác định trust boundaries, actors, assets, threats theo entrypoint và luồng dữ liệu.
2. Phân biệt authentication, authorization, tenant boundary và object-level access; enforce ở server.
3. Đánh giá access/refresh tokens: storage, rotation, expiry, revocation, concurrent refresh, logout và device compromise.
4. Kiểm tra injection, SSRF, IDOR/BOLA, XSS, CSRF, CORS, unsafe deserialization và dependency supply chain theo ngữ cảnh.
5. Rà soát secrets, TLS, encryption, audit logs, PII minimization và error disclosure.

## Deliverables
- Threat model ngắn
- Danh sách lỗ hổng theo severity + evidence
- Mitigations và security test cases

## Stop conditions and guardrails
- Không sao chép secrets vào báo cáo.
- Không coi client-side guard là authorization.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
