#!/usr/bin/env bash
set -euo pipefail
echo "[gap-pr-reviewer] starting review — audit_logging=$(yq '.compliance.recordkeeping.audit_logging' agent.yaml)"
