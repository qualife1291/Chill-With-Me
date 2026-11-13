---
name: git-workflow
description: Git branching, commit hygiene, pull requests and merge conflict resolution. Use for staging, commits, PR preparation or branch hygiene.
---

# Git Workflow

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Kiểm tra git status, branch, upstream và user changes trước khi sửa.
2. Không ghi đè local changes; chia commits theo logic, diff review trước khi stage.
3. Chạy tests liên quan; viết commit/PR summary gồm what/why/how tested/risks.
4. Rebase/cherry-pick/resolve conflict có đối chiếu semantics, chạy lại test sau resolve.
5. Chỉ push, force-push, merge, tag, release theo quyền và yêu cầu rõ ràng.

## Deliverables
- Clean diff/commit grouping
- PR description and validation
- Conflict resolution notes

## Stop conditions and guardrails
- Không git reset --hard hoặc force push khi chưa được phép.
- Không giả định user muốn auto-commit.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
