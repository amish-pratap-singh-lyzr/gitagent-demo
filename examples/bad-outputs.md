# Bad Review Output — What NOT To Do

> **PR #142: Add rate limiting to `/api/upload`**
>
> This looks good overall, nice work! Maybe consider some edge cases.
>
> **Verdict:** `approve`

## Why this is bad

- No line references — "this looks good" isn't actionable.
- "Maybe consider some edge cases" names no specific edge case; it's noise,
  not a finding.
- Approved a PR with a real bug (the NAT-collapse issue from
  [`good-outputs.md`](good-outputs.md)) because it wasn't actually read
  hunk-by-hunk — violates [[RULES]] rule 1.
