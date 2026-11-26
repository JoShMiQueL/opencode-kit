#!/usr/bin/env node
/**
 * Smoke test for install.mjs.
 *
 * Covers: fresh install, idempotent re-run, --check clean, drift detection,
 * --prune of a stale managed file, config merge that preserves user keys,
 * and that unmanaged files survive --prune.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL = join(ROOT, "install.mjs");

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const run = (args) => spawnSync(process.execPath, [INSTALL, ...args], { encoding: "utf8" });

const sandbox = mkdtempSync(join(tmpdir(), "opencode-kit-test-"));
const project = join(sandbox, "project");
mkdirSync(project, { recursive: true });

// Pre-existing user config + a custom agent that must survive.
writeFileSync(
  join(project, "opencode.json"),
  JSON.stringify({ $schema: "https://opencode.ai/config.json", mcp: { mine: { type: "local" } }, theme: "dark" }, null, 2),
);
mkdirSync(join(project, ".opencode", "agent"), { recursive: true });
writeFileSync(join(project, ".opencode", "agent", "mine.md"), "---\ndescription: mine\nmode: subagent\n---\n");

try {
  console.log("fresh install");
  let result = run([project]);
  check("exit 0", result.status === 0, result.stderr);
  for (const file of ["orchestrator", "planner", "worker", "reviewer", "scout", "librarian", "tester"]) {
    check(`agent ${file}.md`, existsSync(join(project, ".opencode", "agent", `${file}.md`)));
  }
  check("manifest written", existsSync(join(project, ".opencode", ".opencode-kit.json")));

  const cfg = JSON.parse(readFileSync(join(project, "opencode.json"), "utf8"));
  check("default_agent set", cfg.default_agent === "orchestrator");
  check("model set", cfg.model === "devin/swe-2#medium");
  check("user key mcp preserved", cfg.mcp?.mine?.type === "local");
  check("user key theme preserved", cfg.theme === "dark");

  console.log("idempotent re-run");
  result = run([project]);
  check("exit 0", result.status === 0, result.stderr);
  check("nothing written", /0 written/.test(result.stdout), result.stdout.split("\n").slice(-4).join(" | "));

  console.log("--check on clean tree");
  result = run([project, "--check"]);
  check("exit 0", result.status === 0, result.stdout + result.stderr);
  check("reports in sync", /in sync/.test(result.stdout));

  console.log("drift detection");
  writeFileSync(join(project, ".opencode", "agent", "worker.md"), "---\ntampered: true\n---\n");
  result = run([project, "--check"]);
  check("exit 1 on drift", result.status === 1);
  check("names the modified file", /modified: agent\/worker\.md/.test(result.stdout));

  console.log("--prune removes only managed stale files");
  const manifestPath = join(project, ".opencode", ".opencode-kit.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.files["agent/retired.md"] = "deadbeef";
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  writeFileSync(join(project, ".opencode", "agent", "retired.md"), "---\ndescription: gone\n---\n");
  result = run([project, "--prune"]);
  check("exit 0", result.status === 0, result.stderr);
  check("stale managed file removed", !existsSync(join(project, ".opencode", "agent", "retired.md")));
  check("custom agent preserved", existsSync(join(project, ".opencode", "agent", "mine.md")));

  console.log("--dry-run writes nothing");
  const before = readFileSync(join(project, ".opencode", "agent", "worker.md"), "utf8");
  result = run([project, "--dry-run"]);
  check("exit 0", result.status === 0, result.stderr);
  check("file untouched", readFileSync(join(project, ".opencode", "agent", "worker.md"), "utf8") === before);

  console.log("--help and --version");
  check("help exits 0", run(["--help"]).status === 0);
  check("version prints semver", /^\d+\.\d+\.\d+$/.test(run(["--version"]).stdout.trim()));
  check("unknown flag fails", run(["--nope"]).status === 1);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
