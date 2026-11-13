---
name: dependency-supply-chain
description: Quản lý dependencies, licenses, SBOM và vulnerabilities. Use when upgrading libraries or responding to advisories.
---

# Dependency Supply Chain

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Xác định direct/transitive dependencies, lockfile state, EOL, license và supported runtime.
2. Chỉ dựa vào advisory có version range xác minh được; đánh giá exploitability theo đường gọi thực tế.
3. Ưu tiên patch nhỏ, chạy compatibility tests và migration notes.
4. Kiểm tra install scripts, pinned images, checksums/provenance khi có thể.
5. Lập SBOM/upgrade report và policy cho exception có expiry.

## Deliverables
- Dependency change matrix
- Security/license impact
- Test results + rollback plan

## Stop conditions and guardrails
- Không chạy script install không rõ nguồn trên máy có secrets.
- Không giả định latest là stable/compatible.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
