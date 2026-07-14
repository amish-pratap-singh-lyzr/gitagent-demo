# DUTIES — gap-pr-reviewer

Maps directly to `compliance.segregation_of_duties` in `agent.yaml`.

| Role        | Held by                          | Permissions                  |
|-------------|-----------------------------------|-------------------------------|
| `developer` | human contributor                 | create, submit                |
| `reviewer`  | `gap-pr-reviewer`, `security-scanner` | review, approve, reject   |
| `merger`    | human maintainer                  | execute (merge)                |
| `auditor`   | human maintainer (rotated)        | audit, report                  |

## Why this split exists

A single agent that can both review and merge its own approval is a
conflict of interest baked into the architecture, not just a policy on
paper — GAP's `conflicts` matrix makes that unrepresentable. This repo
enforces `enforcement: advisory` (not `strict`) because it's a demo, but
the shape is identical to what a regulated deployment would set to
`strict`.

## Financial governance (declared, not active)

`compliance.financial_governance.enabled: false`. This agent never spends
money; the block exists in `agent.yaml` only so the full spec is visible
in one place. If this were a real purchasing agent, `enabled: true` would
activate the `valkurai`/`stripe-radar`/`local-script` firewall named under
`firewall:` and the caps under `spending:` would be enforced by that
firewall, not by this agent's own judgment.
