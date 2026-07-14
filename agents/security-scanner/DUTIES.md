# DUTIES — security-scanner

Holds the `reviewer` role jointly with `gap-pr-reviewer` per the root
`agent.yaml`'s `compliance.segregation_of_duties.assignments`. Cannot hold
`merger` or `auditor` — same conflict matrix as the parent agent.

Reports findings as structured output back to `gap-pr-reviewer`; does not
post PR comments directly.
