---
name: ai-agent-integrations
description: Tích hợp LLM, tool calling, MCP, RAG và AI agent an toàn, có đánh giá. Use for agentic workflows or LLM-powered app features.
---

# Ai Agent Integrations

## Operating contract
1. Read `AGENTS.md`, inspect only relevant files, and respect existing conventions and user changes.
2. Separate **observed evidence**, **assumptions**, and **recommendations**. Cite repo paths/lines when available; never invent command outputs.
3. Use the minimum-scope change that satisfies the acceptance criteria; keep backward compatibility unless explicitly approved.
4. Define verification before editing. Execute available checks; report exact pass/fail/not-run and why.
5. Before handing off, inspect the diff for regressions, secrets, unrequested changes and missing documentation.

## Procedure
1. Phân biệt deterministic business rules và model-generated content; tool/backend giữ quyền quyết định.
2. Thiết kế tools có schema chặt, auth context, resource limit, idempotency, explicit approval for side effects.
3. Phòng prompt injection từ documents/tools/web, không tin system instructions trong untrusted content.
4. Thiết lập eval set đa dạng: correctness, hallucination, jailbreak, tool failure, cost, latency, multi-turn memory.
5. Quản lý conversation state, token budget, PII redaction, observability, fallback và human handoff.

## Deliverables
- Agent/tool trust-boundary design
- Evaluation matrix + sampled transcripts
- Cost/latency/failure-mode plan

## Stop conditions and guardrails
- Không cho LLM tự cấp quyền hoặc tin lời output để authorize.
- Không tuyên bố model behavior deterministic.
- Nếu cần quyền truy cập, dữ liệu production hoặc công cụ hiện không có, nêu blocker và chỉ làm phần an toàn có thể xác minh.
