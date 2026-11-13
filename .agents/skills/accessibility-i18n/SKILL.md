---
name: accessibility-i18n
description: Accessibility, internationalization, localization và inclusive UX. Use when shipping UI or changing user-visible content.
---

# Accessibility I18N

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Rà semantic controls, focus ordering, keyboard-only, screen readers, contrast, touch targets.
2. Xử lý locale, plural rules, date/number/currency, RTL, long strings và truncation.
3. Tách user-facing strings khỏi code, không nối câu theo giả định ngữ pháp.
4. Test accessibility lint/automated + manual assistive tech tùy khả năng.
5. Rà error copy, form labels, validation messages và motion preferences.

## Deliverables
- A11y/i18n acceptance criteria
- Locale and assistive-tech matrix
- Verified gaps

## Stop conditions and guardrails
- Không coi automated accessibility scans là đủ.
- Không hardcode ngôn ngữ một chỗ khi app đã có localization.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
