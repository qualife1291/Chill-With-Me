---
name: android-platform
description: Android/Kotlin/Java platform APIs, permissions, lifecycle and device-specific testing. Use for Android native and hardware integration.
---

# Android Platform

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Kiểm tra min/target SDK, manifest, runtime permissions, API levels, vendor differences và feature detection.
2. Phân biệt app permissions, special access, system API và carrier/device-owner privileges.
3. Xử lý Activity/Service/receiver lifecycle, background restrictions, callback result, cancellation và process death.
4. Tạo matrix theo API level/device/OEM và thực hiện real-device test khi behavior phụ thuộc phần cứng.
5. Ghi log có cấu trúc và che ICCID, identifiers, tokens nếu không thực sự cần.

## Deliverables
- API-level compatibility matrix
- Permission/state diagram
- Device test evidence

## Stop conditions and guardrails
- Không giả định emulator phản ánh eSIM/telephony behavior thật.
- Không dựa vào undocumented behavior mà không đánh dấu rủi ro.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
