#!/usr/bin/env bash
# install.sh — install the swe-2.1 agentic kit into a project's .opencode/
# Usage: install.sh [project-dir]   (default: current directory)
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$(cd "${1:-.}" && pwd)"
OC="$TARGET/.opencode"

echo "Kit:    $KIT_DIR"
echo "Target: $TARGET"

mkdir -p "$OC/agent" "$OC/command" "$OC/reports" "$OC/plans"

for f in "$KIT_DIR"/agents/*.md; do
  name="$(basename "$f")"
  cp -f "$f" "$OC/agent/$name"
  echo "  agent   -> .opencode/agent/$name"
done

for f in "$KIT_DIR"/commands/*.md; do
  name="$(basename "$f")"
  cp -f "$f" "$OC/command/$name"
  echo "  command -> .opencode/command/$name"
done

# pick a working python on Windows git-bash (avoid MS Store python3 stub)
PY=""
for cand in python py python3; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c "print(1)" >/dev/null 2>&1; then
    PY="$cand"; break
  fi
done
if [ -z "$PY" ]; then
  echo "  ERROR: no working python found"; exit 1
fi

# opencode.json: per-project config, orchestrator as default agent
CFG="$TARGET/opencode.json"
"$PY" - "$CFG" <<'EOF'
import json, sys, os

path = sys.argv[1]
cfg = {}
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as fh:
        try:
            cfg = json.load(fh)
        except json.JSONDecodeError:
            print(f"  WARN: {path} exists but is not valid JSON (jsonc?) — leaving it untouched")
            sys.exit(0)

cfg.setdefault("$schema", "https://opencode.ai/config.json")
cfg["default_agent"] = "orchestrator"
cfg["model"] = "devin/swe-2-1#max"
cfg["small_model"] = "devin/swe-2#medium"

with open(path, "w", encoding="utf-8") as fh:
    json.dump(cfg, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
print(f"  config  -> {path} (default_agent=orchestrator, model=swe-2-1#max)")
EOF

echo ""
echo "Done. Lanes:"
echo "  orchestrator + planner : devin/swe-2-1#max       (free, cerebro)"
echo "  worker + reviewer      : devin/swe-2#high        (free, quality)"
echo "  scout + librarian    : devin/swe-2#medium       (free)"
echo "  tester               : devin/swe-2#low          (free, mecánico)"
echo ""
echo "Requires the opencode-devin plugin connected (/connect). Models resolve as devin/*."
