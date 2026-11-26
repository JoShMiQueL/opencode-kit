#!/usr/bin/env bash
# Bootstrap installer for opencode-kit.
# Thin shim: runs the local install.mjs when present, otherwise npx.
# Works both as ./install.sh and as `curl -fsSL .../install.sh | bash`.
set -euo pipefail

SRC="${BASH_SOURCE[0]:-}"
DIR=""
if [ -n "$SRC" ] && [ -f "$SRC" ]; then
  DIR="$(cd "$(dirname "$SRC")" && pwd)"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required (>=16). Install Node.js and retry." >&2
  exit 1
fi

if [ -n "$DIR" ] && [ -f "$DIR/install.mjs" ]; then
  exec node "$DIR/install.mjs" "$@"
fi

exec npx -y github:JoShMiQueL/opencode-kit "$@"
