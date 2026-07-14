# Risk Assessment — gap-pr-reviewer

Referenced by `compliance.model_risk.conceptual_soundness` in `agent.yaml`.

## Risk tier: standard

This agent reviews code, not production data or customer communications.
It cannot merge, deploy, or spend. Its worst-case failure mode is a bad or
missed review comment — recoverable by human re-review, not irreversible.

## Why `human_in_the_loop: conditional`

Full human review of every PR would defeat the point of automation. Instead
escalation is conditional on the triggers in `agent.yaml`
(`confidence_below: 0.7`, `action_type: merge_to_main`,
`error_detected: true`) — the agent flags uncertainty rather than guessing.

## Why `enforcement: advisory` on segregation of duties

This is a demo repo, not a regulated production deployment — `advisory`
surfaces conflicts without hard-blocking them. A real regulated deployment
of this same shape would flip this to `strict`.
