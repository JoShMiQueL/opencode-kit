# Contributing

Thanks for taking a look. This kit is small on purpose — the bar for adding
an agent or a command is high, and every change must keep the lanes free.

## Prerequisites

- Node.js >= 16 (the installer and scripts are plain ESM, no dependencies).
- The [`opencode-devin`](https://github.com/JoShMiQueL/opencode-devin) plugin
  connected in opencode (`/connect`) if you want to run the agents for real.

## Layout

```
agents/            one .md per agent (frontmatter + system prompt)
commands/          one .md per slash command
scripts/           validate-agents.mjs, test-install.mjs
install.mjs        the installer — the single source of truth
install.sh         thin bash wrapper around install.mjs
```

`install.sh` must never grow logic. If behaviour changes, it changes in
`install.mjs`.

## Lane policy — non-negotiable

Every lane must be free on a Devin Pro+ subscription.

| Allowed | Why |
| --- | --- |
| `devin/swe-2#<effort>` | permanently free |
| `devin/swe-2-1#<effort>` | promo-free; keep to at most one high-leverage agent |

Not allowed: `*-lightning` (paid per token), Claude/GPT/Gemini/GLM/Kimi
families (always paid), and `swe-2-flash` (truncates long generations
mid-file — it was tried and abandoned).

`scripts/validate-agents.mjs` enforces this. A PR that breaks it fails CI.

## Adding an agent

1. Create `agents/<name>.md` with frontmatter:

   ```yaml
   ---
   description: What it does and WHEN to use it — this is what the orchestrator reads.
   mode: subagent
   model: devin/swe-2#medium
   ---
   ```

2. Put the system prompt in the body. End it with the REPORT contract:

   ```
   REPORT
   status: ok | blocked | failed
   summary: <max 3 lines>
   artifact: <path under .opencode/reports/ or none>
   files: <key files>
   next: <next step or none>
   ```

3. Do not use legacy v1 fields (`temperature`, `top_p`, `tools`, `permission`,
   `disable`, `maxSteps`). opencode v2 ignores them.

4. Add a row to the roster table in `agents/orchestrator.md` and to the
   README lanes table.

## Adding a command

Create `commands/<name>.md` with `description` and `agent: orchestrator`, then
use `$ARGUMENTS` in the body for the user's input.

## Before opening a PR

```bash
npm test
```

This runs frontmatter validation and the installer smoke test. Both must pass.

## Commit messages

Conventional Commits, imperative mood:

```
feat(agents): add a migrations reviewer
fix(install): keep user agents during --prune
docs: document the sync flow
```

## What not to do

- Do not add a second installer implementation.
- Do not hard-code a model that is not in the lane policy.
- Do not delete or rename a managed file without a `CHANGELOG.md` entry —
  downstream projects need `--prune` to clean it up.
