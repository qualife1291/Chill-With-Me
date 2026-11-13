---
name: performance-profiler
description: Đo benchmark, CPU/memory, SQL, network, build time và bottleneck. Use when optimizing or investigating slowness.
---

# Performance Profiler

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Định nghĩa metric, baseline, realistic workload và hardware/environment trước thay đổi.
2. Đo p50/p95/p99 khi phù hợp, memory peak, allocations, throughput, cold/warm path.
3. Profile để tìm bottleneck thực tế thay vì optimize theo trực giác.
4. Thử workload lớn, file rất dài, concurrency, degraded network, data skew và stress.
5. Báo before/after kèm phương pháp, biến động, tradeoff và regression risk.

## Deliverables
- Reproducible benchmark script
- Baseline vs result table
- Bottleneck/root-cause and tradeoffs

## Stop conditions and guardrails
- Không tuyên bố nhanh hơn khi không có số đo.
- Không dùng microbenchmark làm đại diện production vô điều kiện.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
