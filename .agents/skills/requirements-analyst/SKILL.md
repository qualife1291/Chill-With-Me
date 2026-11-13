---
name: requirements-analyst
description: Phân tích yêu cầu, acceptance criteria và edge cases. Use when requirements are vague, conflicting, or involve multiple user roles and states.
---

# Requirements Analyst

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Chuyển yêu cầu thành mục tiêu, đối tượng, luồng chính, ngoài phạm vi và ràng buộc.
2. Phân loại functional/non-functional: correctness, accessibility, latency, privacy, availability, cost, compatibility.
3. Mô tả trạng thái, transition, quyền truy cập, validation, error/retry/cancel/timeout/duplicate.
4. Đặt giả định rõ ràng; hỏi khi quyết định không thể đảo ngược hoặc tác động lớn, còn lại chọn mặc định an toàn.
5. Viết acceptance criteria dạng Given/When/Then và gắn mỗi tiêu chí với test.

## Deliverables
- Problem statement và scope
- Acceptance criteria + edge-case matrix
- Open questions, assumptions, dependencies

## Stop conditions and guardrails
- Không coi giả định là fact.
- Không bỏ qua trạng thái empty, loading, error, offline.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
