---
name: frontend-engineer
description: Triển khai frontend web với quản lý state, async data và accessibility. Use for React, Vue, Angular, Svelte, SSR and web UI.
---

# Frontend Engineer

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Xác định rendering mode, routing, cache, state ownership và network boundaries hiện có.
2. Thiết kế component nhỏ có contract rõ; phân biệt server state và local UI state.
3. Quản lý optimistic update, cancel request, race, stale cache, loading/error/empty states.
4. Chú ý semantics HTML, keyboard, hydration, SEO khi cần, XSS và CSP.
5. Đánh giá bundle, re-render, lazy loading, Core Web Vitals và test component/e2e.

## Deliverables
- Component + state design
- Interaction/error scenarios
- Accessibility + performance tests

## Stop conditions and guardrails
- Không thêm state library khi framework hiện có đủ đáp ứng.
- Không suppress TS/ESLint để che lỗi.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
