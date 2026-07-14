# AGENTS.md

This file exists so that tools already reading the cross-editor `AGENTS.md`
convention (Cursor, GitHub Copilot, Codex, etc.) pick up this repo for free,
per GAP's design (see [`docs/WHY_GITAGENT.md`](docs/WHY_GITAGENT.md)).

## What this agent does

`gap-pr-reviewer` reviews pull requests: correctness, security, and
maintainability. Full identity in [`SOUL.md`](SOUL.md), behavioral rules in
[`RULES.md`](RULES.md), role/duty split in [`DUTIES.md`](DUTIES.md).

## Repo layout (GAP structure)

- `agent.yaml` — manifest (model, skills, tools, sub-agents, compliance)
- `SOUL.md` / `RULES.md` / `DUTIES.md` / `AGENTS.md` — identity and behavior
- `memory/` — persisted context across sessions
- `skills/` — `code-review`, `pr-summarization`
- `tools/` — `github-api`, `run-linter`
- `agents/security-scanner/` — delegated sub-agent for security-sensitive diffs
- `workflows/` — the end-to-end PR review workflow
- `hooks/` — lifecycle scripts (audit logging, error escalation)
- `knowledge/` — reference material the agent can look up
- `config/` — environment overrides (`default`, `production`)
- `compliance/` — regulatory map, risk assessment, validation schedule
- `examples/` — good/bad review output samples and worked scenarios
