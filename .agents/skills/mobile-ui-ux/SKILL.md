---
name: mobile-ui-ux
description: Thiết kế và review UX/UI mobile, accessibility, trạng thái và navigation. Use for Android, iOS, Flutter, React Native or mobile web.
---

# Mobile Ui Ux

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Kiểm tra platform conventions, design system, responsive breakpoints, typography, spacing và safe areas.
2. Thiết kế states: loading, skeleton, empty, error, success, denied permission, offline và retry.
3. Đảm bảo keyboard, focus, screen reader, contrast, touch target, reduced motion và localization.
4. Kiểm tra deep link, navigation stack, lifecycle resume/background và orientation khi phù hợp.
5. Kiểm chứng trên kích thước màn hình khác nhau; snapshot/screenshot đối chiếu design khi có điều kiện.

## Deliverables
- UI state matrix
- Accessibility checklist
- Device/screen test matrix

## Stop conditions and guardrails
- Không tự ý thay đổi design system.
- Không chỉ dựa vào simulator nếu feature liên quan phần cứng.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
