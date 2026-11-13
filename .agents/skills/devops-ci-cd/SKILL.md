---
name: devops-ci-cd
description: Xây CI/CD, quality gates, build artifact, release và rollback. Use when editing pipelines or deployment automation.
---

# Devops Ci Cd

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Xác định trigger, branch protection, runner, env, cache, artifact provenance và permissions.
2. Thiết kế pipeline lint → typecheck → tests → build → security scan → deploy với fail-fast phù hợp.
3. Pin versions, lockfiles, least-privilege tokens, secret masking, concurrency/resource groups.
4. Phân biệt preview/staging/prod, promotion, migrations, feature flags, rollout/rollback.
5. Test pipeline config, release artifact, idempotency, rerun và dry-run trước khi áp production.

## Deliverables
- Pipeline design + commands
- Release/rollback checklist
- Validation evidence

## Stop conditions and guardrails
- Không commit secrets vào CI YAML.
- Không deploy production nếu thiếu authorization.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
