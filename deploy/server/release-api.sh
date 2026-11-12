#!/usr/bin/env bash
# Unpacks /root/api.tar.gz as a new API release, installs production dependencies, switches
# `current`, restarts the service and checks /health. Keeps the last 3 releases.
set -euo pipefail
base=/opt/bulleak/api
id=$(date -u +%Y%m%d%H%M%S)
dir="$base/releases/$id"
mkdir -p "$dir"
tar -xzf /root/api.tar.gz -C "$dir"
cd "$dir"
# Only the API and what it imports: the root dependencies belong to the site.
npm ci --omit=dev --no-fund --no-audit --ignore-scripts --loglevel=error \
  -w @bulleak/server --include-workspace-root=false
chown -R root:bulleak "$dir"
previous=$(readlink -f "$base/current" 2>/dev/null || true)
ln -sfn "$dir" "$base/current.tmp"
mv -Tf "$base/current.tmp" "$base/current"
systemctl restart bulleak-api
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8787/api/v1/health >/dev/null 2>&1; then
    ls -1dt "$base"/releases/* | tail -n +4 | xargs -r rm -rf
    rm -f /root/api.tar.gz
    echo "api released $id"
    exit 0
  fi
  sleep 1
done
echo "api $id did not answer /health; rolling back" >&2
journalctl -u bulleak-api -n 30 --no-pager >&2 || true
if [[ -n $previous && -d $previous ]]; then
  ln -sfn "$previous" "$base/current.tmp"
  mv -Tf "$base/current.tmp" "$base/current"
  systemctl restart bulleak-api
fi
exit 1
