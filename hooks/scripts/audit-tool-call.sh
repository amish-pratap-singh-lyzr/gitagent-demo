#!/usr/bin/env bash
set -euo pipefail
echo "{\"event\":\"tool_call\",\"tool\":\"${TOOL_NAME:-unknown}\",\"timestamp\":\"${TIMESTAMP:-}\"}" >> memory/audit-log.jsonl
