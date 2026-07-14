# Lyzr Studio Integration Findings — `gitagent lyzr create` / `update`

Hands-on findings from wiring `gap-demo-buddy` up to Lyzr Studio, reading the
`gitagent` CLI source (`@open-gitagent/gitagent` installed package,
`dist/commands/lyzr.js` + `dist/runners/lyzr.js` + `dist/adapters/lyzr.js`),
and sweeping ~97 Lyzr Studio model IDs against the live API.

## The commands

| Command | What it does | When to use |
|---|---|---|
| `gitagent lyzr create --dir . --api-key $KEY` | Builds a Lyzr payload from local `agent.yaml`/`SOUL.md`/etc. and `POST`s it to create a **new** Lyzr Studio agent. Saves the returned `agent_id` to `.lyzr_agent_id`. | Once, the first time a GAP repo is linked to Lyzr Studio. |
| `gitagent lyzr update --dir . --api-key $KEY` | Reads `.lyzr_agent_id`, `GET`s the existing agent, rebuilds the payload from the *current* local files, merges it in, and `PUT`s it back. | Every time you change `agent.yaml`/`SOUL.md`/etc. and want Lyzr Studio to reflect it. |
| `gitagent lyzr run -d . -p "..."` | Chats with the linked agent (creates one first via the same `create` path if `.lyzr_agent_id` doesn't exist yet). | Testing the agent end-to-end. |
| `gitagent lyzr info` | Prints the linked agent ID / inference URL / Studio link. | Quick lookup. |

**Our actual workflow, every time we changed the model:**
```bash
# 1. edit agent.yaml's model.preferred field
# 2. push it
set -a; source .env; set +a
gitagent lyzr update --dir . --api-key "$LYZR_API_KEY"
```

## What `create`/`update` actually send

Both commands call the same `exportToLyzr(dir)` function
(`dist/adapters/lyzr.js`), which:

1. **Builds `agent_instructions`** by concatenating, in order: `SOUL.md` →
   `## Rules\n` + `RULES.md` → each enabled `skills/*/SKILL.md` → an MCP
   servers section (from `agent.yaml`'s `mcp_servers`, if any) → a
   `## Compliance Constraints` bullet list derived from `agent.yaml`'s
   `compliance` block (only `human_in_the_loop: always`,
   `fair_balanced`/`no_misleading` communications flags, and
   `pii_handling: redact` are translated to bullets — the rest of the
   compliance schema is **not** read by this adapter) → `## Memory\n` +
   `memory/MEMORY.md` if present and non-trivial.
2. **Extracts `agent_role`/`agent_goal`** via regex against `SOUL.md`'s
   `## Core Identity` / `## Values`/`## Purpose`/`## Goal`/`## Mission`
   headers, falling back to `agent.yaml`'s `description` if those headers
   aren't present (our `SOUL.md` didn't use the exact header names, so ours
   fell back to `description`).
3. **Maps `model.preferred` to a Lyzr `provider_id` + credential** — see below.
4. **Sends `temperature`/`top_p`** from `model.constraints` (default 0.3 / 0.9
   if unset), plus a fixed `features: [{type: MEMORY, max_messages_context_count: 50}]`
   block and `store_messages: true`.

The actual HTTP calls:
```
POST /v3/agents/template/single-task           (create)
GET  /v3/agents/{agent_id}                     (update: fetch existing)
PUT  /v3/agents/template/single-task/{agent_id} (update: write merged payload)
```
All authenticated via `x-api-key: <LYZR_API_KEY>`.

## The model → provider mapping (the important part)

```js
// dist/adapters/lyzr.js
function mapModelToLyzrProvider(model) {
  if (!model) return { provider_id: 'OpenAI', model: 'gpt-4.1' };
  if (model.startsWith('claude')) return { provider_id: 'Anthropic', model };
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3'))
    return { provider_id: 'OpenAI', model };
  if (model.startsWith('gemini')) return { provider_id: 'Google', model };
  return { provider_id: 'OpenAI', model };   // ← everything else falls here
}
```

`provider_id` is then mapped to a **pre-registered Lyzr Studio credential**:
`OpenAI → lyzr_openai`, `Anthropic → lyzr_anthropic`, `Google → lyzr_google`,
`Perplexity → lyzr_perplexity`. No extra API-key setup needed on our end —
these are Lyzr's own managed credentials.

**The bug/gap:** this is a simple prefix match on the model *string*, not a
real registry. Anything that isn't `claude*`, `gpt*`/`o1*`/`o3*`, or
`gemini*` — including Bedrock-style IDs (`us.anthropic.*`, `amazon.nova-*`),
`grok-*`, `sonar*`, `mistral.*`, `qwen.*`, `moonshot*`, `deepseek*`,
`gpt-oss-*` — silently falls through to the `OpenAI` **default**, and Lyzr's
backend then correctly rejects it because it isn't a real OpenAI model.
Lyzr Studio itself almost certainly supports many of these natively (they're
in Lyzr's own model picker) — this is a `gitagent` client-side limitation,
not a Lyzr Studio one.

## Sweep results — 97 models tested via `gitagent lyzr update`

Ran every model from Lyzr Studio's pricing/model table through
`gap-demo-buddy` (edit `agent.yaml` → `gitagent lyzr update` → record
success/failure). **32 passed, 65 failed.**

### ✅ Passed (32) — recognized prefixes only

**Claude (10):** `claude-fable-5`, `claude-haiku-4-5`, `claude-opus-4-1`,
`claude-opus-4-5`, `claude-opus-4-6`, `claude-opus-4-7`, `claude-opus-4-8`,
`claude-sonnet-4-5`, `claude-sonnet-4-6`, `claude-sonnet-5`

**OpenAI (17):** `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `o3`, `o4-mini`, `gpt-5`,
`gpt-5-mini`, `gpt-5-nano`, `gpt-5.1`, `gpt-5.2`, `gpt-5.4`, `gpt-5.4-mini`,
`gpt-5.4-nano`, `gpt-5.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`

**Google (7):** `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`,
`gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3.5-flash`,
`gemini-3.1-flash-lite`

*Note: Lyzr Studio rejects **dated** Claude snapshot IDs even under the
Anthropic provider — `claude-sonnet-4-5-20250929`-style suffixes 400
(`"Model X is not supported for provider anthropic"`). Only the undated
aliases shown above work.*

### ❌ Failed (65) — all with `"not supported for provider openai"`

Every one of these has a provider/region prefix or belongs to a family
`gitagent`'s matcher doesn't recognize, so it got misrouted to the OpenAI
check and rejected:

- **Bedrock-prefixed Anthropic** (`us.anthropic.*` / `eu.anthropic.*`, 17
  total): all Claude 3.5/3.7/4.x/Sonnet-5 Bedrock ARNs
- **Amazon Nova** (`amazon.nova-*`, `us.amazon.nova-*`, `eu.amazon.nova-*`,
  10 total)
- **Meta Llama** (`us.meta.llama3-*`, `us.meta.llama4-*`,
  `llama-4-scout-17b-16e-instruct`, 8 total)
- **Mistral** (`mistral.*`, 4 total)
- **Qwen** (`qwen.*`, 3 total)
- **Kimi/Moonshot** (`moonshot.*`, `moonshotai.*`, `kimi-k2-instruct`, 4 total)
- **DeepSeek** (`deepseek.*`, `us.deepseek.*`, 2 total)
- **Perplexity Sonar** (`sonar`, `sonar-pro`, `sonar-reasoning-pro`,
  `sonar-deep-research`, 4 total) — notable because Lyzr *does* have a
  `lyzr_perplexity` credential mapped in the adapter's credential table, but
  no `if (model.startsWith('sonar'))` branch routes to it
- **Grok** (`grok-*`, 5 total)
- **gpt-oss** (`gpt-oss-120b`, `gpt-oss-20b`, `openai.gpt-oss-*`, 4 total) —
  despite the `openai.` prefix on two of these, the matcher only checks for
  a literal `gpt` prefix, and `openai.gpt-oss-...` doesn't start with `gpt`

Full raw output: `scratchpad/model_results.csv` (session-local, not
committed to this repo).

## Practical takeaways

1. **For anything that ships through `gitagent`, stick to bare `claude-*`,
   `gpt-*`/`o3`/`o4-mini`, or `gemini-*` model strings.** Everything else
   needs a code fix to `gitagent`'s `mapModelToLyzrProvider()`, not an
   `agent.yaml` change.
2. **Claude model IDs must be undated** (`claude-sonnet-5`, not
   `claude-sonnet-5-20250929`) when targeting Lyzr Studio.
3. `create` vs `update`: use `create` exactly once per repo; every
   subsequent change goes through `update`, which is keyed off
   `.lyzr_agent_id` — delete that file if you ever want to intentionally
   spin up a second, independent Lyzr Studio agent from the same repo.
4. A fix for the other providers (Bedrock/Nova/Llama/Mistral/Qwen/Grok/
   Perplexity/gpt-oss) is a small, well-scoped patch to
   `mapModelToLyzrProvider()` — worth doing upstream if the team wants
   broader model coverage through `gitagent`.
