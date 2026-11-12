# Builds the site for the domain root (with accounts) and releases the site and the API on the VPS.
# Usage (PowerShell): $env:BULLEAK_HOST = 'root@<ip>'; ./scripts/deploy-vps.ps1
# Optional: $env:BULLEAK_DOMAIN (default bulleak.ru), $env:BULLEAK_ONLY = 'site' | 'api'.
# The SSH key is ~/.ssh/bulleak_deploy; server setup scripts are in deploy/server.
$ErrorActionPreference = 'Stop'
$target = $env:BULLEAK_HOST
if (-not $target) { throw 'Set BULLEAK_HOST, e.g. root@203.0.113.10' }
$domain = if ($env:BULLEAK_DOMAIN) { $env:BULLEAK_DOMAIN } else { 'bulleak.ru' }
$only = $env:BULLEAK_ONLY
$key = Join-Path $env:USERPROFILE '.ssh\bulleak_deploy'
$ssh = @('-i', $key, '-o', 'BatchMode=yes')
$root = Split-Path -Parent $PSScriptRoot
$tmp = [IO.Path]::GetTempPath()
$site = Join-Path $tmp 'bulleak-site.tar.gz'
$api = Join-Path $tmp 'bulleak-api.tar.gz'

Push-Location $root
try {
  # Both halves must be what git has: the API is taken from HEAD, so the site is too.
  $dirty = git status --porcelain --untracked-files=no
  if ($dirty -and -not $env:BULLEAK_ALLOW_DIRTY) {
    throw "Uncommitted changes - commit or stash them first (BULLEAK_ALLOW_DIRTY=1 to override):`n$($dirty -join "`n")"
  }
  if ($only -ne 'site') {
    # Committed sources only: the API release must match what is in git.
    git archive --format=tar.gz -o $api HEAD package.json package-lock.json shared server
    if ($LASTEXITCODE -ne 0) { throw 'git archive failed' }
    scp -q @ssh $api "${target}:/root/api.tar.gz"
    scp -q @ssh (Join-Path $root 'deploy\server\release-api.sh') "${target}:/root/release-api.sh"
    ssh @ssh $target 'bash /root/release-api.sh'
    if ($LASTEXITCODE -ne 0) { throw 'api release failed' }
  }
  if ($only -ne 'api') {
    $env:BASE_PATH = '/'
    $env:VITE_API_URL = "https://$domain/api/v1"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'build failed' }
    tar -czf $site -C dist .
    scp -q @ssh $site "${target}:/root/site.tar.gz"
    scp -q @ssh (Join-Path $root 'deploy\server\release.sh') "${target}:/root/release.sh"
    ssh @ssh $target 'bash /root/release.sh'
    if ($LASTEXITCODE -ne 0) { throw 'site release failed' }
  }
} finally {
  Remove-Item Env:BASE_PATH, Env:VITE_API_URL -ErrorAction SilentlyContinue
  Remove-Item $site, $api -ErrorAction SilentlyContinue
  Pop-Location
}
