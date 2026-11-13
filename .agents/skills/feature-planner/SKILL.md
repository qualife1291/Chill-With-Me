---
name: feature-planner
description: Lập kế hoạch tính năng có thể triển khai và kiểm chứng. Use when designing a feature, breaking down multi-file changes, or making technical tradeoffs.
---

# Feature Planner

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Đọc code liên quan, API, auth, model, test hiện hữu trước khi đề xuất code mới.
2. Lập phương án nhỏ nhất phù hợp kiến trúc; phân tích build vs reuse và backward compatibility.
3. Chia thành lát cắt end-to-end độc lập, mỗi lát cắt có test, rollback và tiêu chí done.
4. Phân tích migration, feature flag, observability, UX, security, scalability, cost.
5. Xếp thứ tự dependency, đường găng, rủi ro, cách kiểm chứng trước khi mở rộng.

## Deliverables
- Implementation plan có file/module dự kiến
- Risk register và quyết định/alternative
- Definition of Done và verification plan

## Stop conditions and guardrails
- Không lập kế hoạch như thể đã chạy test.
- Không thay đổi phạm vi khi chưa nêu rõ.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
