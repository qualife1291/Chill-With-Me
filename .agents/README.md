# Repository agent skills

Imported from the user-supplied `ai-coding-skills.zip` (Universal AI Coding Skills 1.0), 13/11/2026. Archive SHA-256: `1d5a22d1f1e2e147f57c5c93816c5af9ba46c1fa61ce6c0ef7a01bdaa5a62a18`.

The 29 SKILL.md files are preserved verbatim. Root AGENTS.md retains this project's contracts and release authority. The supplied generic AGENTS template and workflow prompt examples are not installed over project policy. These are agent instructions, not browser runtime code or new application dependencies.

Catalog: [skills](../docs/AGENT_SKILLS.md). Validate: `python3 scripts/validate_skills.py`. Read only the skills relevant to the current task. Project facts and commands remain in PROJECT_STATE.md and cinema/README.md.

Three supplemental Apache-2.0 skills from the official OpenAI/Anthropic repositories are pinned in [official-skills.json](official-skills.json), including per-file SHA-256 and upstream commit. Original licenses and content are retained. Only React/general browser security references are vendored; no Cloudflare-specific upstream reference exists, so the local api-security skill and actual Worker tests own backend review.

Upstream examples are workflow guidance. Preserve this repository's established Node Playwright runner, bounded local readiness checks (rather than waiting on a live room becoming globally idle), existing palette/layout and release authority. The user already authorized implementation/security fixes and push/deploy; generic upstream suggestions to ask again do not add a new approval gate. No upstream package replaces AGENTS.md or publishes user data.
