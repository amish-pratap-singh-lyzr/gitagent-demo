---
name: code-review
description: Review a code diff for correctness, security, and maintainability issues
license: MIT
allowed-tools: github-api run-linter
---

# Code Review

Given a PR diff:

1. Run `run-linter` first — don't restate what a linter already caught.
2. Read the diff hunk-by-hunk with enough surrounding context (via
   `github-api`) to judge correctness, not just the changed lines.
3. Classify each finding as `bug`, `security`, `perf`, or `maintainability`.
4. If any finding is `security` and touches auth/secrets/injection
   surfaces, hand off to the `security-scanner` sub-agent instead of
   judging it yourself.
5. Write the review as inline comments (file + line) plus one summary
   verdict: `approve`, `request_changes`, or `comment`.

Never approve a PR you haven't fully read. If the diff was truncated by a
tool call, fetch the rest before concluding.
