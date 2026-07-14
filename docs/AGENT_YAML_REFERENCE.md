# agent.yaml — Full Field Reference

`agent.yaml` is the **only** file in a GAP repo with a strict, validated schema
(everything else — `SOUL.md`, `RULES.md`, `skills/*/SKILL.md` — has structural
conventions but isn't hard-enforced). This doc annotates every field defined
in the spec (`spec/SPECIFICATION.md` §3 in the
[opengap](https://github.com/open-gitagent/opengap) repo), pulled directly
from source rather than guessed. Run `gitagent validate` after editing —
it checks this file against the real JSON Schema.

Naming convention: all YAML **keys** are `snake_case`. Agent/skill/tool
**names** (values like `name:`, entries in `skills:`/`tools:`) are `kebab-case`.

## Fully annotated example

```yaml
# ── Required ────────────────────────────────────────────────────────────
name: my-agent               # kebab-case identifier: ^[a-z][a-z0-9-]*$
version: 1.0.0                # semver: ^X.Y.Z[-prerelease][+build]$
description: One-line description of what this agent does

# ── Recommended ─────────────────────────────────────────────────────────
spec_version: "0.1.0"         # which GAP spec version this manifest targets

# ── Optional — identity/meta ────────────────────────────────────────────
author: Your Name or Org
license: MIT                  # any SPDX identifier
tags:                         # free-form categorization, shows up in registry search
  - demo
  - code-review
metadata:                     # arbitrary key-value pairs — values must be
  internal_id: "1234"         # string | number | boolean (no nested objects)
  cost_center: 42

# ── Model selection ─────────────────────────────────────────────────────
model:
  preferred: claude-sonnet-5          # primary model ID (e.g. claude-opus-4-8, gpt-4o)
  fallback:                           # tried in order if preferred is unavailable
    - claude-opus-4-8
    - gpt-4o
  constraints:                        # passed through to the underlying model call
    temperature: 0.3                  # 0.0–2.0
    max_tokens: 4096
    top_p: 0.9
    top_k: 40
    stop_sequences: ["</done>"]
    presence_penalty: 0
    frequency_penalty: 0

# ── Composition — reuse other agents/skills/tools ──────────────────────
extends: https://github.com/org/base-agent   # parent agent (git URL or local path);
                                              # inherits SOUL.md/RULES.md/skills unless overridden
dependencies:                                # composed agents with vendor metadata
  - name: fact-checker
    source: https://github.com/org/fact-checker-agent
    version: "2.1.0"
skills:                       # enabled skill directories (kebab-case), under skills/
  - code-review
  - pr-summarization
tools:                        # enabled tool files (kebab-case, no extension), under tools/
  - github-api
  - run-linter

# ── Multi-agent / delegation ────────────────────────────────────────────
agents:                       # sub-agent config — keys are agent names (see agents/<name>/)
  fact-checker:
    triggers: [factual_claim_detected]
delegation:
  mode: auto                  # auto | explicit | router
  router: triage-agent        # only used when mode: router — names the routing agent

# ── Runtime execution parameters ────────────────────────────────────────
runtime:
  max_turns: 30                # hard cap on conversation turns
  temperature: 0.3              # 0.0–2.0 (can also live under model.constraints)
  timeout: 120                  # seconds

# ── Agent-to-Agent (A2A) protocol metadata ──────────────────────────────
a2a:
  url: https://my-agent.example.com/a2a
  capabilities: [text, tool_use]
  authentication: bearer
  protocols: [a2a-v1]

# ── Compliance (regulated environments — finance, healthcare, etc.) ─────
compliance:
  risk_tier: standard           # low | standard | high | critical
  frameworks:                   # extensible — any string; common values below
    - finra                     # FINRA rules (3110, 4511, 2210, ...)
    - federal_reserve           # SR 11-7, SR 23-4, ...
    - sec                       # Reg BI, S-P, 17a-4
    - cfpb                      # fair lending, adverse action
    # non-US examples also accepted: eu_ai_act, uk_fca, mas_singapore, gdpr

  supervision:                                  # FINRA Rule 3110
    designated_supervisor: null                 # principal responsible
    review_cadence: quarterly                   # how often the agent is reviewed
    human_in_the_loop: conditional               # always | conditional | advisory | none
    escalation_triggers:                         # typed trigger conditions
      - confidence_below: 0.7
      - action_type: customer_communication
      - error_detected: true
      # other trigger types: data_classification_above, token_count_above, custom
    override_capability: true                    # humans can override any decision
    kill_switch: true                            # immediate halt capability

  recordkeeping:                                 # FINRA 4511, SEC 17a-4
    audit_logging: true
    log_format: structured_json                  # structured_json | plaintext
    retention_period: 6y                         # minimum retention
    log_contents:
      - prompts_and_responses
      - tool_calls
      - decision_pathways
      - model_version
      - timestamps
    immutable: true                              # logs cannot be modified after write

  model_risk:                                    # SR 11-7
    inventory_id: null                           # ID in firm's model inventory
    validation_cadence: annual                   # annual | quarterly | ...
    validation_type: full                        # full | targeted | change_based
    conceptual_soundness: null                   # link to documentation
    ongoing_monitoring: true
    outcomes_analysis: true                      # back-test against actual results
    drift_detection: true
    parallel_testing: false                      # run alongside existing system

  data_governance:
    pii_handling: redact                         # redact | encrypt | prohibit | allow
    data_classification: confidential             # public | internal | confidential | restricted
    consent_required: true
    cross_border: false                          # data crosses jurisdictions
    bias_testing: true
    lda_search: false                            # Less Discriminatory Alternative search (CFPB)

  communications:                                # FINRA Rule 2210
    type: correspondence                         # correspondence | retail | institutional
    pre_review_required: false                   # principal pre-approval required
    fair_balanced: true
    no_misleading: true
    disclosures_required: false                  # AI disclosure to customers

  vendor_management:                             # SR 23-4
    due_diligence_complete: false
    soc_report_required: false
    vendor_ai_notification: true
    subcontractor_assessment: false              # fourth-party risk assessed

  segregation_of_duties:                         # multi-agent duty separation
    roles:                                       # min 2 roles
      - id: maker
        description: Creates proposals and initiates actions
        permissions: [create, submit]
      - id: checker
        description: Reviews and approves maker outputs
        permissions: [review, approve, reject]
      - id: executor
        description: Executes approved actions
        permissions: [execute]
      - id: auditor
        description: Reviews completed actions for compliance
        permissions: [audit, report]
    conflicts:                                   # SOD conflict matrix — pairs that can't be the same agent
      - [maker, checker]
      - [maker, auditor]
      - [executor, checker]
      - [executor, auditor]
    assignments:                                 # bind roles to specific agents
      loan-originator: [maker]
      credit-reviewer: [checker]
    isolation:
      state: full                                # full | shared | none
      credentials: separate                      # separate | shared
    handoffs:                                    # actions requiring multi-role sign-off
      - action: credit_decision
        required_roles: [maker, checker]
        approval_required: true
    enforcement: strict                          # strict | advisory

  financial_governance:                          # spending controls for payment-capable agents
    enabled: true                                # false = declared but not enforced
    firewall: valkurai                           # named identifier: valkurai, stripe-radar, local-script
    spending:
      max_per_transaction_cents: 5000            # $50.00 hard cap per transaction
      max_monthly_cents: 100000                  # $1,000.00 monthly cumulative cap
      currency: AUD                              # ISO 4217
      allowed_categories: [software, compute, api_services]
      blocked_categories: [gambling, crypto, unknown]
    approval:
      require_above_cents: 2000                  # human approval required above $20.00
      timeout_minutes: 60
      auto_deny_on_timeout: true                 # timeout = DENIED
```

## What we actually exercised in this repo

Our `gap-demo-buddy` agent (`/agent.yaml` at repo root) only ever used the
required fields plus `model.preferred` and `model.constraints`:

```yaml
spec_version: "0.1.0"
name: gap-demo-buddy
version: 0.1.0
description: Minimal GitAgentProtocol demo agent, served via Lyzr Studio
model:
  preferred: claude-sonnet-5
  constraints:
    temperature: 0.3
    max_tokens: 2048
```

Everything else in the reference above (`compliance`, `delegation`,
`financial_governance`, `a2a`, ...) is spec-documented but untouched by our
demo — see [`examples/full/agent.yaml`](https://github.com/open-gitagent/opengap/blob/main/examples/full/agent.yaml)
in the opengap repo for a real worked example that uses the compliance block,
sub-agent delegation, and hooks together (a compliance-analyst agent with a
`fact-checker` sub-agent).

**One important gap between the spec and the Lyzr adapter:** the spec's
`model.preferred` accepts any model ID string, but `gitagent`'s Lyzr export
step (`dist/adapters/lyzr.js`) only maps `claude-*`, `gpt-*`/`o1-*`/`o3-*`,
and `gemini-*` prefixes to a real provider — see
[`LYZR_CREATE_UPDATE_FINDINGS.md`](./LYZR_CREATE_UPDATE_FINDINGS.md) for the
full compatibility sweep. Only `model.preferred` and `model.constraints`
actually affect the Lyzr Studio payload today — `compliance`,
`financial_governance`, `delegation`, etc. are not yet translated into the
Lyzr API's fields by the adapter (they get folded into `agent_instructions`
as plain text via `RULES.md`/compliance-constraint bullet points, not
structured Lyzr Studio config).
