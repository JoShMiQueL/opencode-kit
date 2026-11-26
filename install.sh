#!/usr/bin/env bash
# Thin wrapper. install.mjs is the single source of truth; this only exists so
# bash users can run ./install.sh without remembering the node invocation.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required (>=16). Install Node.js and retry." >&2
  exit 1
fi

exec node "$DIR/install.mjs" "$@"
