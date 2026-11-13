---
name: flutter-dart
description: Flutter/Dart implementation, navigation, async lifecycle, native integrations and testing. Use when touching Flutter app code.
---

# Flutter Dart

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Đọc pubspec, lints, kiến trúc state management hiện dùng, router, network client và native plugins.
2. Kiểm tra mounted/dispose, async state, duplicate actions, immutable model, null safety.
3. Giữ platform-specific work ở adapter/plugin, document method channel contracts và permissions.
4. Run dart format, flutter analyze, unit/widget/integration tests theo môi trường có sẵn.
5. Kiểm thử lifecycle, deep links, background resume, Android/iOS permission differences.

## Deliverables
- Widget/business tests
- Platform compatibility notes
- Analysis/build evidence

## Stop conditions and guardrails
- Không trộn side effects vào build().
- Không tuyên bố test trên device khi chỉ chạy unit/widget test.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
