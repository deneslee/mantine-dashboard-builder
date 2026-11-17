<#
.SYNOPSIS
  Creates a task worktree beside the repo (..\..\wt\<Name>, branch feat/<Name>) that starts warm.

.DESCRIPTION
  After `git worktree add` and `pnpm install`, copies from this checkout what a fresh worktree lacks:
  - .env.local (gitignored; without it VITE_CONVEX_URL is unset)
  - Vite Task's cache (node_modules/.vite/task-cache), so lint, build and tests on unchanged code replay
  - Vitest's cache (node_modules/.vitest-cache)
  - the TypeScript build info files lint and build read (*.tsbuildinfo)
  The cache only hits while the worktree's files match this checkout's, so run this from an up-to-date main.

.EXAMPLE
  ./scripts/new-worktree.ps1 storage-and-dashboards
  ./scripts/new-worktree.ps1 panels -Base main -Branch feat/panels-b
#>
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Base = 'main',
  [string]$Branch = "feat/$Name"
)

$ErrorActionPreference = 'Stop'
$root = (git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
$target = Join-Path (Split-Path (Split-Path $root)) "wt\$Name"

if (Test-Path $target) { throw "$target already exists." }

git -C $root show-ref --verify --quiet "refs/heads/$Branch"
if ($LASTEXITCODE -eq 0) { git -C $root worktree add $target $Branch }
else { git -C $root worktree add $target -b $Branch $Base }
if ($LASTEXITCODE -ne 0) { throw 'git worktree add failed.' }

Push-Location $target
try {
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw 'pnpm install failed.' }
} finally { Pop-Location }

$copied = @()
foreach ($file in @('.env.local', 'tsconfig.app.tsbuildinfo', 'tsconfig.node.tsbuildinfo', 'relay/tsconfig.tsbuildinfo')) {
  $from = Join-Path $root $file
  if (Test-Path $from) { Copy-Item $from (Join-Path $target $file) -Force; $copied += $file }
}
foreach ($dir in @('node_modules/.vite/task-cache', 'node_modules/.vitest-cache')) {
  $from = Join-Path $root $dir
  if (Test-Path $from) {
    $to = Join-Path $target $dir
    New-Item -ItemType Directory -Force (Split-Path $to) | Out-Null
    Copy-Item $from $to -Recurse -Force
    $copied += $dir
  }
}

Write-Host "Worktree: $target (branch $Branch)"
Write-Host "Copied from $root`: $($copied -join ', ')"
