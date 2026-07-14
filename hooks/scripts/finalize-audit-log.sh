#!/usr/bin/env bash
set -euo pipefail
echo "{\"event\":\"review_complete\",\"timestamp\":\"${TIMESTAMP:-}\"}" >> memory/audit-log.jsonl
