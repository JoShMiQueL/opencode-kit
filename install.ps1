#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Bootstrap installer for opencode-kit.

.DESCRIPTION
  Thin shim. If a local install.mjs sits next to this file it runs that,
  otherwise it delegates to npx. No install logic lives here.

.EXAMPLE
  irm https://raw.githubusercontent.com/JoShMiQueL/opencode-kit/main/install.ps1 | iex

.EXAMPLE
  .\install.ps1 C:\dev\my-project -DryRun
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$Target,

  [switch]$DryRun,
  [switch]$Prune,
  [switch]$Check,
  [switch]$Version,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js >= 16 is required. Install it from https://nodejs.org and retry.'
  return
}

$kitArgs = @()
if ($Version) {
  $kitArgs = @('--version')
} elseif ($Help) {
  $kitArgs = @('--help')
} else {
  if ($Target) { $kitArgs += $Target }
  if ($DryRun) { $kitArgs += '--dry-run' }
  if ($Prune) { $kitArgs += '--prune' }
  if ($Check) { $kitArgs += '--check' }
}

$local = if ($PSScriptRoot) { Join-Path $PSScriptRoot 'install.mjs' } else { $null }

if ($local -and (Test-Path -LiteralPath $local)) {
  & node $local @kitArgs
} else {
  & npx -y 'github:JoShMiQueL/opencode-kit' @kitArgs
}

$code = $LASTEXITCODE
# Never call exit when the script was piped into iex — it would close the
# caller's interactive session.
if ($PSScriptRoot) {
  exit $code
} elseif ($code -ne 0) {
  Write-Error "opencode-kit failed with exit code $code"
}
