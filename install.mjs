#!/usr/bin/env node
/**
 * opencode-kit installer — installs the swe agentic kit into a project's .opencode/
 *
 * Usage:
 *   npx opencode-kit [project-dir]
 *   node install.mjs [project-dir]
 *
 * Idempotent: overwrites managed files. Requires the opencode-devin plugin
 * connected in opencode (/connect). Models resolve as devin/*.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT_DIR = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(process.argv[2] ?? ".");
const OC = join(TARGET, ".opencode");

console.log(`Kit:    ${KIT_DIR}`);
console.log(`Target: ${TARGET}`);

for (const d of ["agent", "command", "reports", "plans"]) {
  mkdirSync(join(OC, d), { recursive: true });
}

for (const f of readdirSync(join(KIT_DIR, "agents")).filter((f) => f.endsWith(".md"))) {
  cpSync(join(KIT_DIR, "agents", f), join(OC, "agent", f));
  console.log(`  agent   -> .opencode/agent/${f}`);
}
for (const f of readdirSync(join(KIT_DIR, "commands")).filter((f) => f.endsWith(".md"))) {
  cpSync(join(KIT_DIR, "commands", f), join(OC, "command", f));
  console.log(`  command -> .opencode/command/${f}`);
}

// opencode.json — merge managed keys only (providers/MCP/credentials survive)
const cfgPath = join(TARGET, "opencode.json");
let cfg = {};
if (existsSync(cfgPath)) {
  try {
    cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  } catch {
    console.warn(`  WARN: ${cfgPath} exists but is not valid JSON (jsonc?) — leaving it untouched`);
    cfg = null;
  }
}
if (cfg) {
  cfg["$schema"] ??= "https://opencode.ai/config.json";
  cfg["default_agent"] = "orchestrator";
  cfg["model"] = "devin/swe-2-1#max";
  cfg["small_model"] = "devin/swe-2#medium";
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  console.log(`  config  -> ${cfgPath} (default_agent=orchestrator, model=swe-2-1#max)`);
}

console.log(`
Done. Lanes:
  orchestrator + planner : devin/swe-2-1#max   (free, brain)
  worker + reviewer      : devin/swe-2#high    (free, quality)
  scout + librarian      : devin/swe-2#medium  (free)
  tester                 : devin/swe-2#low     (free, mechanical)

Requires the opencode-devin plugin connected (/connect). Models resolve as devin/*.
`);
