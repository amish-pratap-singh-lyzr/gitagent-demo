# Why GitAgent (GAP) Exists

## What it is

GitAgentProtocol (**GAP**, also "OpenGAP") is an open, framework-agnostic, git-native
standard for defining AI agents. The pitch: **your git repo *is* the agent.**
Identity, behavioral rules, memory, tools, and skills all live as plain,
version-controlled files instead of being scattered across application code
or locked inside a vendor's dashboard.

Built and maintained by **Team @ Lyzr** (GitHub org: `open-gitagent`), launched
at [gitagent.sh](https://www.gitagent.sh/) and shown on Hacker News in
March 2026.

## The problem it's responding to

Before GAP, teams building agents ran into the same set of pains repeatedly:

- **Prompt scattering** — system prompts buried inline in application code, no
  single source of truth.
- **Behavioral opacity** — no audit trail for *why* an agent's behavior
  changed between versions.
- **Memory loss** — agent context/memory resets between sessions instead of
  persisting.
- **Skill fragmentation** — capabilities scattered ad hoc with no shared
  discovery mechanism.
- **No portability** — an agent built for Claude Code can't be moved to
  OpenAI, CrewAI, or LangChain without a rewrite. Every framework invents its
  own structure.
- **No compliance story** — regulated teams (finance, healthcare) have no
  standard way to audit an agent's rules, tool access, or segregation of
  duties.

GAP's answer to all of these is the same move Docker made for application
packaging: define one portable file format, and let adapters translate it
into whatever runtime you actually need.

## What it took reference from

GAP isn't a from-scratch invention — it deliberately borrows conventions
developers already trust, and stitches them into one spec:

| Influence | What GAP borrowed |
|---|---|
| **Dockerfile / container packaging** | The core analogy: a declarative, portable manifest (`agent.yaml`) that any runtime can build from — "Dockerfile for agents." |
| **AGENTS.md** (the emerging cross-tool convention used by Cursor, Copilot, Codex, etc.) | Kept as a first-class file so tools that already read `AGENTS.md` pick up a GAP repo for free. |
| **Claude Skills (`SKILL.md`)** | The `skills/<name>/SKILL.md` format — YAML frontmatter (name, description, license, allowed-tools) + markdown instructions — is the same composable-skill pattern Claude Code uses. |
| **Model Context Protocol (MCP)** | Treated as a complementary, lower layer — MCP standardizes *how a model calls a tool*; GAP standardizes *the whole agent persona, rules, and memory* around it. `tools/*.yaml` definitions are MCP-compatible. |
| **GitOps** | Branch-based promotion (`dev → staging → main`), PRs, CI validation, and blocked merges — applied to agent *behavior* the same way GitOps applies them to infrastructure. |
| **Dotfiles / config-as-code** | Runtime state and environment overrides (`.gitagent/`, `config/<env>.yaml`) follow the same "plain files you already know how to diff" philosophy. |
| **FINOS AI Governance Framework** | Referenced directly for the `compliance/` directory's segregation-of-duties and audit patterns (FINRA, Federal Reserve, SEC use cases called out explicitly). |

The explicit framing in the spec: *"Every AI framework has its own structure.
There's no universal, portable way to define an agent that works across
Claude Code, OpenAI, LangChain, CrewAI, and AutoGen."* GAP is the attempt at
that missing universal layer — sitting one level above MCP, not replacing it.

## What it supports today

**Repo structure** — only `agent.yaml` (manifest) and `SOUL.md` (identity) are
required; everything else is opt-in:
`RULES.md`, `DUTIES.md`, `AGENTS.md`, `memory/`, `tools/`, `skills/`,
`workflows/`, `agents/` (sub-agents), `plugins/`, `hooks/`, `knowledge/`,
`config/`, `examples/`, `compliance/`.

**CLI** (`gitagent` / `opengap`, aliases of the same binary):
`init`, `validate` (`--compliance` flag for regulatory checks), `info`,
`export`, `import`, `install`, `audit`, `skills`, `run`, `lyzr`, `registry`.

**Export / adapter targets** — Claude Code, OpenAI Agents SDK, CrewAI,
Lyzr Studio, GitHub Models/Actions, Google Gemini, Cursor, GitHub Copilot,
OpenCode, OpenClaw, Nanobot, Kiro, GitClaw, plain system-prompt, Codex.

**LLM providers** (via the underlying `pi-ai` runtime): OpenAI, Anthropic,
Google, xAI, Groq, Mistral, and any OpenAI-compatible endpoint.

**Wider ecosystem (same GitHub org, `open-gitagent`):**

| Repo | Stars | What it is |
|---|---|---|
| `opengap` | 2.9k | The spec itself (JSON schemas, spec_version 0.1.0) |
| `gitagent` | 603 | The CLI/framework implementation |
| `registry` | 23 | Public agent registry at `registry.gitagent.sh` |
| `pr-review-agent` | — | Reference example agent — a code-review agent built on GAP |
| `langship.sh` | 83 | GitOps-native platform for shipping/governing agents |
| `clawless` | 519 | Serverless, browser-based (WebContainers) runtime for agents |
| `voice` | 1 | Voice-mode / web UI (OpenAI Realtime, Gemini Live) |
| `shadowLM` | 18 | Fine-tuning SDK for open models |
| `ComputerAgent` | 17 | Reference sandboxed agent runner |

Notably, `pr-review-agent` is an official reference implementation of exactly
the code-review use case — worth pointing to directly when we build the demo.

## One-line summary for the team

*"MCP standardized how an agent calls a tool. GAP standardizes the agent
itself — its identity, rules, memory, and skills — as a portable git repo,
the same way Docker standardized shipping an app."*
