# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-11-27

### Fixed
- Lane map corrected against the live model catalog: `swe-2#low` never existed
  (swe-2 has medium|high|max only) — scout/tester/librarian moved to
  `swe-2#medium`, the cheapest real swe-2 lane.
- `swe-2-1` restricted to orchestrator + planner at `low` effort — never a
  worker/subagent lane. Swe lanes only; non-swe vendor references removed.
- Delegation documented as the default: escalate to a high lane only on a
  concrete failure or a task provably beyond the cheap lane.
- swe-2-1 free-tier rate-limit symptom documented (upstream closes the
  stream empty in <1s, resets in ~2 min — not a bug).

## [Unreleased]

## [1.3.0] - 2026-11-26

### Added

- The installer now maintains a delimited block in the project's `AGENTS.md`
  (`<!-- opencode-kit:start ... -->` … `<!-- opencode-kit:end -->`) describing
  the kit, the free lanes, the update command and the "spend expensive lanes
  last" rule. opencode injects `AGENTS.md` into every session, so any agent —
  not just the orchestrator — knows how the kit works and how to refresh it.
- `--no-agents-md` skips that block.
- `--check` now also reports a missing or stale `AGENTS.md` block.
- `agents/orchestrator.md` gained a **Kit maintenance** section with the
  drift-check and sync commands.

### Changed

- The managed block is refreshed on every sync, so its content tracks the
  installed version instead of drifting.

## [1.2.0] - 2026-11-26

### Added

- One-liner bootstraps for every shell: `install.ps1` (`irm ... | iex`),
  `install.cmd` (`curl ... && install.cmd`) and `install.sh`
  (`curl ... | bash`). All three are thin shims over `install.mjs` — they run
  the local copy when present and fall back to `npx` otherwise.
- `install.ps1` never calls `exit` when piped into `iex`, so it cannot close
  the caller's interactive session.
- CI now syntax-checks the bash shim and smoke-tests the PowerShell and
  cmd shims on Windows.

## [1.1.0] - 2026-11-26

### Added

- Installer manifest (`.opencode/.opencode-kit.json`) recording every managed
  file, so syncs can be verified and pruned safely.
- `--check` to report drift between a project and the kit (exit 1 when out of
  sync), `--prune` to remove files the kit no longer ships, `--dry-run` to
  preview changes, `--help` and `--version`.
- `scripts/validate-agents.mjs`: enforces required frontmatter, valid modes,
  the free-lane policy and rejects legacy v1 fields.
- `scripts/test-install.mjs`: smoke test covering fresh install, idempotency,
  drift detection, pruning, config preservation and dry-run.
- GitHub Actions CI across Linux, Windows and macOS.
- `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.gitattributes`,
  `.editorconfig`, issue and pull request templates.

### Changed

- Lanes retuned: `planner` is the only `swe-2-1` lane (at `low`, the
  highest-leverage call); `worker`/`reviewer` sit at `swe-2#high`;
  `orchestrator` at `swe-2#medium`; `scout`/`librarian`/`tester` at
  `swe-2#low`.
- Removed the legacy `temperature` field from agent frontmatter; opencode v2
  ignores it.
- `install.sh` is now a thin wrapper over `install.mjs` instead of a
  duplicate implementation.

### Fixed

- Agent descriptions no longer advertise lanes that do not exist
  ("ultrafast", "high lane" on non-high models).
- Orchestrator roster table and cost section now match the real frontmatter.

## [1.0.0] - 2026-11-26

### Added

- Initial release: seven agents (`orchestrator`, `planner`, `worker`,
  `reviewer`, `scout`, `librarian`, `tester`), three slash commands
  (`implement`, `plan-work`, `research`) and a per-project installer.

[Unreleased]: https://github.com/JoShMiQueL/opencode-kit/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/JoShMiQueL/opencode-kit/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/JoShMiQueL/opencode-kit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/JoShMiQueL/opencode-kit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JoShMiQueL/opencode-kit/releases/tag/v1.0.0
