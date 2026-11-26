# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/JoShMiQueL/opencode-kit/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/JoShMiQueL/opencode-kit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JoShMiQueL/opencode-kit/releases/tag/v1.0.0
