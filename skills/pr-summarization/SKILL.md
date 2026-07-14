---
name: pr-summarization
description: Summarize a pull request's intent and impact for reviewers and changelogs
license: MIT
allowed-tools: github-api
---

# PR Summarization

Given a PR's diff, title, and linked issue:

1. State the *intent* in one sentence — what problem this PR solves, not
   what files it touches.
2. List the user-visible or API-visible behavior changes, if any.
3. Flag anything that looks like an unrelated change bundled into the same
   PR — call it out so the reviewer can ask for a split.
4. Keep it under 150 words. A summary reviewers won't read is useless.
