#!/usr/bin/env node
/**
 * opencode-kit — per-project agentic kit for opencode (devin/* lanes).
 *
 * Installs/syncs the managed agents and commands into <dir>/.opencode and
 * merges three keys into <dir>/opencode.json. A manifest at
 * .opencode/.opencode-kit.json records what was installed, so --prune never
 * deletes files the kit did not create.
 *
 * Usage: npx opencode-kit [dir] [--dry-run] [--prune] [--check]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT_DIR = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(KIT_DIR, "package.json"), "utf8"));

/** Containers the installer owns: local dir inside .opencode -> dir in the kit. */
const CONTAINERS = [
  { local: "agent", kit: "agents" },
  { local: "command", kit: "commands" },
];

/** Config keys the installer manages. Everything else in opencode.json is preserved. */
const MANAGED_CONFIG = {
  default_agent: "orchestrator",
  model: "devin/swe-2#medium",
  small_model: "devin/swe-2#low",
};

const MANIFEST_NAME = ".opencode-kit.json";

const HELP = `
opencode-kit v${pkg.version}

Install or sync the per-project swe agentic kit into <dir>/.opencode.

Usage
  npx opencode-kit [dir] [options]

Options
  -n, --dry-run   Show what would change, write nothing
      --prune     Remove files the kit installed before but no longer ships
      --check     Report drift against the kit; exit 1 when out of sync
      --no-agents-md
                  Skip the managed opencode-kit block in AGENTS.md
  -h, --help      Show this help
  -v, --version   Print the version

What it manages
  .opencode/agent/*.md          agents
  .opencode/command/*.md        slash commands
  opencode.json                 default_agent, model, small_model only
  AGENTS.md                     one delimited block, rest untouched

Safety
  A manifest at .opencode/${MANIFEST_NAME} records every installed file.
  --prune removes only files listed there, never your own agents or commands.

Requires the opencode-devin plugin connected in opencode (/connect).
`;

function fail(message, code = 1) {
  console.error(`error: ${message}`);
  process.exit(code);
}

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const opts = { target: ".", dryRun: false, prune: false, check: false, noAgentsMd: false };
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      console.log(HELP);
      process.exit(0);
    } else if (arg === "-v" || arg === "--version") {
      console.log(pkg.version);
      process.exit(0);
    } else if (arg === "-n" || arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--prune") {
      opts.prune = true;
    } else if (arg === "--check") {
      opts.check = true;
    } else if (arg === "--no-agents-md") {
      opts.noAgentsMd = true;
    } else if (arg.startsWith("-")) {
      fail(`unknown option: ${arg}\nRun with --help for usage.`);
    } else if (opts.target !== ".") {
      fail(`unexpected extra argument: ${arg}`);
    } else {
      opts.target = arg;
    }
  }
  if (opts.check && (opts.dryRun || opts.prune)) {
    fail("--check cannot be combined with --dry-run or --prune.");
  }
  return opts;
}

// ------------------------------------------------------------------ hashing

/** Normalize line endings so a CRLF checkout never reports false drift. */
const normalize = (buffer) => buffer.toString("utf8").replace(/\r\n/g, "\n");

const hashBuffer = (buffer) => createHash("sha256").update(normalize(buffer)).digest("hex");

const hashFile = (path) => hashBuffer(readFileSync(path));

// ----------------------------------------------------------- AGENTS.md block

const BLOCK_START = "<!-- opencode-kit:start";
const BLOCK_END = "<!-- opencode-kit:end -->";

function agentsBlock(version) {
  return `<!-- opencode-kit:start (managed by opencode-kit v${version} — run the installer to refresh) -->
## opencode-kit

This project runs [opencode-kit](https://github.com/JoShMiQueL/opencode-kit). Agents live in \`.opencode/agent/\`, commands in \`.opencode/command/\` — both are kit-owned copies. Edit the kit, never these files.

- Models come from the \`opencode-devin\` plugin (\`devin/*\`): no API keys, no local proxy.
- Lanes (all free): planner \`swe-2-1#low\` · worker/reviewer \`swe-2#high\` · orchestrator \`swe-2#medium\` · scout/librarian/tester \`swe-2#low\`.
- Spend expensive lanes last: delegate to low/medium lanes first, escalate only on a concrete failure.
- Sync: \`npx -y github:JoShMiQueL/opencode-kit .\` — \`--check\` reports drift, \`--prune\` removes retired files.
- Project-specific agents must use a different filename (e.g. \`worker-<project>.md\`) so a sync never overwrites them.
<!-- opencode-kit:end -->`;
}

function extractBlock(text) {
  const start = text.indexOf(BLOCK_START);
  if (start === -1) return null;
  const end = text.indexOf(BLOCK_END, start);
  if (end === -1) return null;
  return text.slice(start, end + BLOCK_END.length);
}

function mergeAgentsMd(existing, version) {
  const block = agentsBlock(version);
  if (!existing) return block + "\n";
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end !== -1 && end > start) {
    return existing.slice(0, start) + block + existing.slice(end + BLOCK_END.length);
  }
  return existing.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

// ------------------------------------------------------------------- state

function kitFiles() {
  const files = {};
  for (const container of CONTAINERS) {
    const dir = join(KIT_DIR, container.kit);
    if (!existsSync(dir)) fail(`kit is missing ${container.kit}/`);
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
      const src = join(dir, name);
      files[`${container.local}/${name}`] = { src, hash: hashFile(src) };
    }
  }
  return files;
}

function readManifest(oc) {
  const path = join(oc, MANIFEST_NAME);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed.files === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readConfig(target) {
  const path = join(target, "opencode.json");
  if (!existsSync(path)) return { path, cfg: {}, exists: false };
  try {
    return { path, cfg: JSON.parse(readFileSync(path, "utf8")), exists: true };
  } catch {
    return { path, cfg: null, exists: true };
  }
}

// ------------------------------------------------------------------ report

function printLanes() {
  console.log(`
Lanes
  planner             devin/swe-2-1#low   highest leverage, runs rarely
  orchestrator        devin/swe-2#medium  routing and synthesis only
  worker + reviewer   devin/swe-2#high    execution and judgment ceiling
  scout + librarian   devin/swe-2#low     iterative lookup
  tester              devin/swe-2#low     mechanical run-and-report

Requires the opencode-devin plugin connected (/connect). Models resolve as devin/*.`);
}

// -------------------------------------------------------------------- main

const opts = parseArgs(process.argv.slice(2));
const TARGET = resolve(opts.target);
const OC = join(TARGET, ".opencode");
const kit = kitFiles();
const previous = readManifest(OC);
const log = opts.dryRun ? (m) => console.log(`  would ${m}`) : (m) => console.log(`  ${m}`);

if (!existsSync(TARGET)) fail(`target directory does not exist: ${TARGET}`);

// ---- check mode -----------------------------------------------------------

if (opts.check) {
  const problems = [];
  if (!previous) {
    problems.push("kit is not installed here (no manifest)");
  } else {
    for (const [rel, entry] of Object.entries(kit)) {
      const dest = join(OC, rel);
      if (!existsSync(dest)) problems.push(`missing: ${rel}`);
      else if (hashFile(dest) !== entry.hash) problems.push(`modified: ${rel}`);
    }
    for (const rel of Object.keys(previous.files ?? {})) {
      if (!(rel in kit)) problems.push(`stale (run --prune): ${rel}`);
    }
  }

  const { path: cfgPath, cfg } = readConfig(TARGET);
  if (cfg === null) {
    problems.push(`invalid JSON: ${cfgPath}`);
  } else {
    for (const [key, value] of Object.entries(MANAGED_CONFIG)) {
      if (cfg[key] !== value) problems.push(`config ${key}: expected "${value}", got "${cfg[key] ?? "(unset)"}"`);
    }
  }

  if (!opts.noAgentsMd) {
    const agentsPath = join(TARGET, "AGENTS.md");
    if (!existsSync(agentsPath)) {
      problems.push("missing: AGENTS.md kit block");
    } else if (extractBlock(readFileSync(agentsPath, "utf8")) !== agentsBlock(pkg.version)) {
      problems.push("stale: AGENTS.md kit block");
    }
  }

  if (problems.length === 0) {
    console.log(`in sync: ${TARGET} (v${previous.version ?? "?"})`);
    process.exit(0);
  }
  console.log(`out of sync: ${TARGET}`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}

// ---- install / sync -------------------------------------------------------

console.log(`opencode-kit v${pkg.version}`);
console.log(`Kit:    ${KIT_DIR}`);
console.log(`Target: ${TARGET}`);

for (const container of CONTAINERS) {
  if (!opts.dryRun) mkdirSync(join(OC, container.local), { recursive: true });
}

let written = 0;
let unchanged = 0;
for (const [rel, entry] of Object.entries(kit)) {
  const dest = join(OC, rel);
  const same = existsSync(dest) && hashFile(dest) === entry.hash;
  if (same) {
    unchanged += 1;
    continue;
  }
  log(`write  .opencode/${rel}`);
  if (!opts.dryRun) copyFileSync(entry.src, dest);
  written += 1;
}

// ---- prune ----------------------------------------------------------------

let pruned = 0;
if (opts.prune && previous) {
  for (const rel of Object.keys(previous.files ?? {})) {
    if (rel in kit) continue;
    const dest = join(OC, rel);
    if (!existsSync(dest)) continue;
    log(`prune  .opencode/${rel}`);
    if (!opts.dryRun) rmSync(dest, { force: true });
    pruned += 1;
  }
}

// ---- config merge ---------------------------------------------------------

const { path: cfgPath, cfg } = readConfig(TARGET);
if (cfg === null) {
  console.warn(`  WARN: ${cfgPath} is not valid JSON (jsonc?) — leaving it untouched`);
} else {
  const next = { ...cfg };
  next["$schema"] ??= "https://opencode.ai/config.json";
  Object.assign(next, MANAGED_CONFIG);
  const changed = JSON.stringify(next) !== JSON.stringify(cfg);
  if (changed) {
    log(`update ${cfgPath}`);
    if (!opts.dryRun) writeFileSync(cfgPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  }
}

// ---- AGENTS.md managed block ----------------------------------------------

if (!opts.noAgentsMd) {
  const agentsPath = join(TARGET, "AGENTS.md");
  const current = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";
  const next = mergeAgentsMd(current, pkg.version);
  if (next !== current) {
    log(`update ${agentsPath}`);
    if (!opts.dryRun) writeFileSync(agentsPath, next, "utf8");
  }
}

// ---- manifest -------------------------------------------------------------

const manifest = {
  version: pkg.version,
  installedAt: new Date().toISOString(),
  files: Object.fromEntries(Object.entries(kit).map(([rel, entry]) => [rel, entry.hash])),
};
if (!opts.dryRun) {
  writeFileSync(join(OC, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

// ---- summary --------------------------------------------------------------

const verb = opts.dryRun ? "would apply" : "applied";
console.log(`\n${verb}: ${written} written, ${unchanged} unchanged, ${pruned} pruned`);
if (opts.dryRun) {
  console.log("Nothing was written (--dry-run).");
} else {
  printLanes();
}
