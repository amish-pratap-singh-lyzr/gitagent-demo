# Scenario: Security-Sensitive Diff Triggers Delegation

**Input:** PR modifies `src/auth/session.js`, changing how session tokens
are validated.

**Expected behavior:**

1. `code-review` skill runs first, per `workflows/pr-review.yaml`.
2. The diff touches auth logic → `security_sensitive_diff_detected` fires.
3. `gap-pr-reviewer` delegates to `security-scanner` (auto mode, per
   `agents.security-scanner.delegation` in `agent.yaml`) instead of judging
   the auth change itself.
4. `security-scanner` applies `knowledge/security-review-checklist.md` and
   returns findings — it does not approve/reject.
5. `gap-pr-reviewer` incorporates the findings into the final review. If
   confidence is below 0.7 or the target is `merge_to_main`, it escalates
   to a human per `compliance.supervision.escalation_triggers`.
