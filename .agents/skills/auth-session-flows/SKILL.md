---
name: auth-session-flows
description: Audit các luồng login/logout/session/token refresh nhiều trạng thái. Use when adding protected features, session caching or account switching.
---

# Auth Session Flows

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Truy vết login, signup, logout, expiry, refresh, revoke, MFA, biometric và multi-account trong code hiện có.
2. Vẽ state machine: unauthenticated → authenticating → authenticated → refreshing → expired/revoked; định nghĩa transitions.
3. Rà race: nhiều request 401, concurrent refresh, retry loop, stale UI, logout trong lúc request đang chạy.
4. Đảm bảo account switching và logout xóa/cache isolate theo user, không giữ dữ liệu sai tenant.
5. Test cold start, offline, clock skew, token invalid, refresh failure, forced logout, back navigation.

## Deliverables
- Auth flow diagram/state matrix
- Race-condition checklist
- Tests bao phủ token lifecycle

## Stop conditions and guardrails
- Không tạo token flow thứ hai nếu repo đã có.
- Không lưu credential nhạy cảm trong log/localStorage nếu giải pháp an toàn hơn có sẵn.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
