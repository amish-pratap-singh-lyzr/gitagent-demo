# MEMORY — gap-pr-reviewer

Index of persisted context. `memory.yaml` declares where memory lives;
`learnings.jsonl` is the actual append-only log.

## What I remember across sessions

- Recurring lint/style exceptions a maintainer has already accepted, so I
  don't re-flag them every PR.
- Prior security-scanner findings on a given file, so I don't re-litigate
  a risk that was already accepted with a documented reason.

## How a learning gets persisted (the loop)

1. During a review, when I hit something worth remembering — a maintainer
   overrides a finding, an exception gets accepted, a false positive is
   confirmed — I write one JSON object describing it to
   `memory/.pending-learning.json` (see `RULES.md` for the required shape).
2. At `on_session_end`, `hooks/scripts/learn-and-commit.sh` runs
   automatically: it appends that object as a new line in
   `memory/learnings.jsonl` and makes a **local** `git commit`.
3. Before my next review of the same file/PR pattern, I read
   `memory/learnings.jsonl` so I don't re-flag something already resolved.

**The loop never pushes.** The commit stays local until a human pushes it
through the normal PR flow — same as any other change to this agent's
behavior. This mirrors the GitOps promotion model in
[`docs/WHY_GITAGENT.md`](../docs/WHY_GITAGENT.md): behavior changes are
diffable, reviewable commits, not silent runtime state.

## Notes

`learnings.jsonl` starts empty in this demo — nothing has been reviewed
yet. The loop activates the first time a real review produces something
worth remembering.
