#!/usr/bin/env bash
set -euo pipefail

# Folds a pending learning note into the permanent, git-versioned log and
# commits it locally. Never pushes: pushing a memory change goes through the
# same PR review as any other behavior change (see RULES.md).

PENDING="memory/.pending-learning.json"
LOG="memory/learnings.jsonl"

[ -f "$PENDING" ] || exit 0

pr=$(grep -o '"pr"[[:space:]]*:[[:space:]]*[0-9]*' "$PENDING" | grep -o '[0-9]*$' || true)

cat "$PENDING" >> "$LOG"
rm -f "$PENDING"

git add "$LOG"
git commit -m "memory: record learning${pr:+ from PR #$pr}" --quiet
