# Downloads the latest database dump from the VPS — a copy outside the server.
# Usage (PowerShell): $env:BULLEAK_HOST = 'root@<ip>'; ./scripts/pull-backup.ps1 [-Dest <folder>]
# Restore: pg_restore --clean --if-exists -d bulleak <file>.dump (see docs/02-architecture/hosting.md).
param([string]$Dest = (Join-Path $env:USERPROFILE 'Documents\bulleak-backups'))
$ErrorActionPreference = 'Stop'
$target = $env:BULLEAK_HOST
if (-not $target) { throw 'Set BULLEAK_HOST, e.g. root@203.0.113.10' }
$key = Join-Path $env:USERPROFILE '.ssh\bulleak_deploy'
$latest = ssh -i $key -o BatchMode=yes $target 'ls -1t /var/backups/bulleak/bulleak-*.dump | head -n 1'
if ($LASTEXITCODE -ne 0 -or -not $latest) { throw 'no backups on the server' }
New-Item -ItemType Directory -Force $Dest | Out-Null
scp -q -i $key -o BatchMode=yes "${target}:$latest" $Dest
if ($LASTEXITCODE -ne 0) { throw 'download failed' }
Write-Output "saved $(Join-Path $Dest (Split-Path -Leaf $latest))"
