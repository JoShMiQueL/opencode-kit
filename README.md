# opencode-kit

[![CI](https://github.com/JoShMiQueL/opencode-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/JoShMiQueL/opencode-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![opencode v2](https://img.shields.io/badge/opencode-v2-black)](https://opencode.ai)

A per-project agentic kit for [opencode](https://opencode.ai) built on the
[**opencode-devin**](https://github.com/JoShMiQueL/opencode-devin) plugin.
Seven agents, three slash commands, a strict delegation contract — and every
model lane is **free** on a Devin Pro+ subscription.

The primary agent is a router: it never writes code, it delegates to
specialists that run in their own context and report back a compact `REPORT`
block. The orchestrator's context stays small, the work gets done by whoever
is best at it, and the expensive lanes are only spent where they matter.

---

## Contents

- [Requirements](#requirements)
- [Install](#install)
- [Sync an existing project](#sync-an-existing-project)
- [What gets installed](#what-gets-installed)
- [Lanes](#lanes)
- [Agents](#agents)
- [Commands](#commands)
- [The REPORT contract](#the-report-contract)
- [Safety](#safety)
- [Customising without losing it on sync](#customising-without-losing-it-on-sync)
- [FAQ](#faq)
- [Development](#development)
- [License](#license)

---

## Requirements

1. **opencode v2**.
2. The **opencode-devin** plugin, connected:

   ```bash
   # in opencode
   /connect
   ```

   Every model in this kit resolves as `devin/*` against your Devin
   subscription. There are no API keys and no local proxy — the plugin owns
   auth and the model catalog.

## Install

From the project you want to kit out:

```bash
npx -y github:JoShMiQueL/opencode-kit
```

Or pass a path:

```bash
npx -y github:JoShMiQueL/opencode-kit ~/dev/my-project
```

Once published to npm, `npx opencode-kit` works the same way.

### One-liner bootstrap

If you would rather not type `npx`, each shell has a shim that downloads and
runs the installer. All three are thin wrappers — the real logic lives in
`install.mjs`.

**PowerShell**

```powershell
irm https://raw.githubusercontent.com/JoShMiQueL/opencode-kit/main/install.ps1 | iex
```

**cmd.exe**

```cmd
curl -fsSL https://raw.githubusercontent.com/JoShMiQueL/opencode-kit/main/install.cmd -o install.cmd && install.cmd && del install.cmd
```

**bash / zsh**

```bash
curl -fsSL https://raw.githubusercontent.com/JoShMiQueL/opencode-kit/main/install.sh | bash
```

Piped one-liners always install into the **current directory** and cannot take
flags. To pass a target or `--dry-run` / `--check` / `--prune`, download the
shim first and run it:

```powershell
.\install.ps1 C:\dev\my-project -DryRun
```

```bash
bash install.sh ~/dev/my-project --check
```

> Piping a remote script into your shell executes whatever the server sends.
> If that bothers you — and it reasonably might — use `npx` or clone the repo
> and run `node install.mjs` instead.

Then open the project:

```bash
cd ~/dev/my-project
opencode        # starts on the orchestrator
```

## Sync an existing project

There is no separate update command — the installer is idempotent:

```bash
npx -y github:JoShMiQueL/opencode-kit ~/dev/my-project
```

Re-running writes only what drifted and leaves everything else alone. To see
what would change first:

```bash
npx -y github:JoShMiQueL/opencode-kit ~/dev/my-project --dry-run
```

To verify a project matches the kit (exit code `1` when it does not):

```bash
npx -y github:JoShMiQueL/opencode-kit ~/dev/my-project --check
```

If the kit ever removes or renames a managed file, `--prune` deletes it from
the project — but only files recorded in the installer manifest, never your
own agents:

```bash
npx -y github:JoShMiQueL/opencode-kit ~/dev/my-project --prune
```

Full option list: `npx -y github:JoShMiQueL/opencode-kit --help`.

## What gets installed

```
<project>/
├── .opencode/
│   ├── agent/            orchestrator, planner, worker, reviewer,
│   │                     scout, librarian, tester
│   ├── command/          implement, plan-work, research
│   ├── plans/            created empty — phased plans live here
│   ├── reports/          created empty — long outputs live here
│   └── .opencode-kit.json   installer manifest (what was installed)
└── opencode.json         default_agent, model, small_model merged in
```

The installer manages **only** `.opencode/agent/*.md`, `.opencode/command/*.md`
and those three keys in `opencode.json`. Providers, MCP servers, plugins,
credentials and your own agents are left untouched.

## Lanes

The effort ladder is `none < minimal < low < medium < high < xhigh < max`.

| Lane | Agents | Why |
| --- | --- | --- |
| `devin/swe-2-1#low` | `planner` | The newest model, reserved for the single highest-leverage call. Planning is cheap to run and expensive to get wrong. |
| `devin/swe-2#high` | `worker`, `reviewer` | The ceiling for writing and judging code. |
| `devin/swe-2#medium` | `orchestrator` | Routing and synthesis only — it never executes. |
| `devin/swe-2#low` | `scout`, `librarian`, `tester` | Iterative lookup and mechanical run-and-report. |

Cost notes, verified November 2026:

- `swe-2` is **permanently free** on Pro/Max/Teams.
- `swe-2-1` is free via a launch promotion (~2 weeks from 24 Nov 2026). If it
  lapses, drop `planner` to `swe-2#low` — that is the only lane using it.
- `swe-2-flash` is **not** used: it truncates long generations mid-file.
- `*-lightning` variants are paid per token and are excluded.
- Claude, GPT, Gemini, GLM and Kimi families are always paid — outside the kit.

## Agents

| Agent | Mode | Writes | Use when |
| --- | --- | --- | --- |
| `orchestrator` | primary | nothing | Always. It routes every request and consumes `REPORT` blocks. |
| `planner` | subagent | `.opencode/plans/` | Work spans multiple phases, modules or sessions. |
| `worker` | subagent | source files | A scoped implementation, fix or refactor with a known location. |
| `reviewer` | subagent | `.opencode/reports/` | Before a merge, on a diff that is risky or security-sensitive. |
| `scout` | subagent | nothing | "Where is X", "how does Y work", tracing dependencies. |
| `librarian` | subagent | `.opencode/reports/` | The answer is **not** in the repo: docs, GitHub, web. |
| `tester` | subagent | `.opencode/reports/` | After a change: tests, lint, typecheck, build. |

The orchestrator's routing order, delegation spec and hard constraints live in
[`agents/orchestrator.md`](agents/orchestrator.md).

## Commands

| Command | What it does |
| --- | --- |
| `/implement <what>` | Route the change; scout first if the location is uncertain, then worker, then tester. |
| `/plan-work <what>` | Hand the goal to `planner`, present the phases, ask before executing phase 1. |
| `/research <what>` | Codebase question → `scout`; external docs or GitHub → `librarian`. |

## The REPORT contract

Every subagent ends its reply with exactly this block:

```
REPORT
status: ok | blocked | failed
summary: <max 3 lines>
artifact: <path under .opencode/reports/ or none>
files: <key files>
next: <next step or none>
```

The orchestrator reads only that. Long outputs go to `.opencode/reports/`, so
the parent's context never inflates with logs — and a `blocked` or `failed`
status is a signal to investigate, not to retry blindly.

## Safety

| Path | On sync |
| --- | --- |
| `.opencode/agent/*.md` | Overwritten — kit-owned |
| `.opencode/command/*.md` | Overwritten — kit-owned |
| `.opencode/.opencode-kit.json` | Rewritten — the manifest |
| `opencode.json` | Three keys merged; everything else preserved |
| `.opencode/plans/`, `.opencode/reports/` | Untouched |
| `AGENTS.md` (project root) | Untouched |
| Any other file | Untouched |

`--prune` only removes files listed in the manifest. A custom agent you added
under `.opencode/agent/` is never deleted.

## Customising without losing it on sync

Managed files are kit-owned, so edits to them are replaced on the next sync.
To keep a per-project variant, give it a different name:

```
.opencode/agent/worker-suiteland.md     # yours, never touched
.opencode/agent/worker.md               # kit-owned, replaced on sync
```

## FAQ

**Why not publish it as a `npx skills` skill?**
`skills` installs `SKILL.md` instruction files that an agent loads as context.
This kit installs *agents, commands and config* — a different mechanism. A
skill wrapper would only tell the agent to run the installer, which `npx`
already does directly.

**Why per-project instead of global?**
A global install is invisible and easy to drift. Per-project makes the kit a
reviewable file change in each repo, and lets a project pin its own lane mix.

**Why is the orchestrator not the biggest model?**
It only routes and synthesises. Spending `max` there buys nothing that
`swe-2#medium` does not, while `planner` and `worker` are where quality
actually changes the outcome.

**The UI shows `SWE-2` with no effort — is the variant applied?**
Yes. opencode passes the `#variant` to the plugin as
`providerOptions.devin.reasoningEffort`, and the plugin resolves it to the
exact per-effort model UID. The status line only prints the family name. Use
`ctrl+t` in the TUI to cycle variants.

## Development

```bash
git clone https://github.com/JoShMiQueL/opencode-kit
cd opencode-kit
npm test
```

`npm test` runs two checks:

- `scripts/validate-agents.mjs` — required frontmatter, valid modes, the
  free-lane policy, and rejection of legacy v1 fields.
- `scripts/test-install.mjs` — fresh install, idempotent re-run, `--check`
  drift detection, `--prune` scope, config preservation and `--dry-run`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the lane policy and commit style.

## License

[MIT](LICENSE) © 2026 JoShMiQueL
