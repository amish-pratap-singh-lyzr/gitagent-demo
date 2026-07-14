#!/usr/bin/env bash
set -euo pipefail
npx eslint --format json "$@"
