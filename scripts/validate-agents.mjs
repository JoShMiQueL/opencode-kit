#!/usr/bin/env node
/**
 * Validates agent and command frontmatter against the opencode v2 schema
 * and the kit's lane policy. Fails the build on drift.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MODES = new Set(["primary", "subagent", "all"]);
const EFFORTS = new Set(["none", "minimal", "low", "medium", "high", "xhigh", "max"]);
/** Legacy v1 fields that opencode v2 silently ignores. */
const FORBIDDEN = ["temperature", "top_p", "prompt", "permission", "tools", "disable", "maxSteps", "max_steps"];
/** Every lane must be free: no paid lightning variants, no non-swe families. */
const ALLOWED_FAMILIES = new Set(["swe-2", "swe-2-1"]);

const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);

function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  return data;
}

function checkModel(file, model) {
  const m = /^devin\/([a-z0-9.-]+)(?:#([a-z]+))?$/.exec(model ?? "");
  if (!m) return fail(file, `model "${model}" is not devin/<family>[#effort]`);
  const [, family, effort] = m;
  if (!ALLOWED_FAMILIES.has(family)) fail(file, `family "${family}" is outside the free lane policy`);
  if (family.includes("lightning")) fail(file, `family "${family}" is paid per token`);
  if (effort && !EFFORTS.has(effort)) fail(file, `unknown effort "${effort}"`);
}

// ---------------------------------------------------------------- agents

const agentsDir = join(ROOT, "agents");
const agents = readdirSync(agentsDir).filter((f) => f.endsWith(".md")).sort();

for (const name of agents) {
  const fm = parseFrontmatter(readFileSync(join(agentsDir, name), "utf8"));
  if (!fm) {
    fail(name, "missing frontmatter block");
    continue;
  }
  for (const key of ["description", "mode", "model"]) {
    if (!fm[key]) fail(name, `missing required field "${key}"`);
  }
  if (fm.mode && !MODES.has(fm.mode)) fail(name, `invalid mode "${fm.mode}"`);
  if (fm.model) checkModel(name, fm.model);
  for (const legacy of FORBIDDEN) {
    if (legacy in fm) fail(name, `legacy v1 field "${legacy}" is ignored by opencode v2`);
  }
}

const primaries = agents.filter((name) => {
  const fm = parseFrontmatter(readFileSync(join(agentsDir, name), "utf8"));
  return fm?.mode === "primary";
});
if (primaries.length !== 1) fail("agents/", `expected exactly 1 primary agent, found ${primaries.length}`);

// -------------------------------------------------------------- commands

const commandsDir = join(ROOT, "commands");
for (const name of readdirSync(commandsDir).filter((f) => f.endsWith(".md")).sort()) {
  const fm = parseFrontmatter(readFileSync(join(commandsDir, name), "utf8"));
  if (!fm) {
    fail(`commands/${name}`, "missing frontmatter block");
    continue;
  }
  if (!fm.description) fail(`commands/${name}`, 'missing required field "description"');
  if (!fm.agent) fail(`commands/${name}`, 'missing required field "agent"');
  else if (!agents.some((a) => a === `${fm.agent}.md`)) {
    fail(`commands/${name}`, `agent "${fm.agent}" does not exist in agents/`);
  }
}

// ---------------------------------------------------------------- result

if (errors.length > 0) {
  console.error(`frontmatter validation failed (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`ok: ${agents.length} agents, ${readdirSync(commandsDir).filter((f) => f.endsWith(".md")).length} commands`);
for (const name of agents) {
  const fm = parseFrontmatter(readFileSync(join(agentsDir, name), "utf8"));
  console.log(`  ${name.replace(/\.md$/, "").padEnd(14)} ${fm.mode.padEnd(9)} ${fm.model}`);
}
