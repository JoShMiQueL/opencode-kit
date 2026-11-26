@echo off
rem Bootstrap installer for opencode-kit (cmd.exe).
rem Thin shim: runs the local install.mjs when present, otherwise npx.
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo error: Node.js ^>= 16 is required. Install it from https://nodejs.org and retry.
  exit /b 1
)

if exist "%~dp0install.mjs" (
  node "%~dp0install.mjs" %*
) else (
  npx -y github:JoShMiQueL/opencode-kit %*
)

exit /b %ERRORLEVEL%
