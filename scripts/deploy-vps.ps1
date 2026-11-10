# Builds the site for the domain root and releases it on the VPS.
# Usage (PowerShell): $env:BULLEAK_HOST = 'root@<ip>'; ./scripts/deploy-vps.ps1
# The SSH key is ~/.ssh/bulleak_deploy; server setup scripts are in deploy/server.
$ErrorActionPreference = 'Stop'
$target = $env:BULLEAK_HOST
if (-not $target) { throw 'Set BULLEAK_HOST, e.g. root@203.0.113.10' }
$key = Join-Path $env:USERPROFILE '.ssh\bulleak_deploy'
$root = Split-Path -Parent $PSScriptRoot
$archive = Join-Path ([IO.Path]::GetTempPath()) 'bulleak-site.tar.gz'

Push-Location $root
try {
  $env:BASE_PATH = '/'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'build failed' }
  tar -czf $archive -C dist .
  scp -q -i $key -o BatchMode=yes $archive "${target}:/root/site.tar.gz"
  scp -q -i $key -o BatchMode=yes (Join-Path $root 'deploy\server\release.sh') "${target}:/root/release.sh"
  ssh -i $key -o BatchMode=yes $target 'bash /root/release.sh'
} finally {
  Remove-Item Env:BASE_PATH -ErrorAction SilentlyContinue
  Remove-Item $archive -ErrorAction SilentlyContinue
  Pop-Location
}
