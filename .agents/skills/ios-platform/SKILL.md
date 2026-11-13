---
name: ios-platform
description: iOS/Swift, SwiftUI/UIKit, app lifecycle, entitlements and device tests. Use for Apple platform changes.
---

# Ios Platform

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Kiểm tra deployment target, Info.plist, entitlements, provisioning, capability constraints.
2. Xử lý async/await, MainActor, Task cancellation, memory management và background execution.
3. Thiết kế states cho permission, denied/restricted, deep link, app lifecycle.
4. Run SwiftLint nếu có, build/test bằng Xcode tooling khi có; kiểm tra simulator vs device-only features.
5. Rà privacy manifests, keychain, secure storage, accessibility và App Store policy implications.

## Deliverables
- Entitlement/capability matrix
- Unit/UI tests + real-device cases
- Release compatibility notes

## Stop conditions and guardrails
- Không hứa capability khi entitlement chưa được cấp.
- Không lưu sensitive credentials bằng UserDefaults.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
