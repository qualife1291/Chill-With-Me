---
name: api-contracts
description: Thiết kế và tích hợp REST, GraphQL, gRPC, webhook và event contracts. Use when changing service interfaces or consuming external APIs.
---

# Api Contracts

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Kiểm tra contract nguồn, version, consumer, auth, pagination, timeout, retry và rate limit.
2. Định nghĩa schema/request/response/error/headers và canonical validation; không tin dữ liệu ngoài.
3. Phân biệt transient/permanent failures; retry với backoff và jitter chỉ khi idempotent hoặc có idempotency key.
4. Kiểm thử status codes, malformed response, partial success, concurrency và compatibility.
5. Với webhook kiểm tra signature, timestamp/replay, dedupe, async processing và ordering.

## Deliverables
- Contract examples + compatibility notes
- Error taxonomy
- Contract/consumer tests

## Stop conditions and guardrails
- Không log token/PII.
- Không giả định 200 đồng nghĩa business success.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
