#!/usr/bin/env bash
# Unpacks /root/site.tar.gz as a new release, switches `current` to it, keeps the last 3.
set -euo pipefail
base=/var/www/bulleak
id=$(date -u +%Y%m%d%H%M%S)
mkdir -p "$base/releases/$id"
tar -xzf /root/site.tar.gz -C "$base/releases/$id"
test -f "$base/releases/$id/index.html"
chown -R www-data:www-data "$base/releases/$id"
ln -sfn "$base/releases/$id" "$base/current.tmp"
mv -Tf "$base/current.tmp" "$base/current"
ls -1dt "$base"/releases/* | tail -n +4 | xargs -r rm -rf
rm -f /root/site.tar.gz
echo "released $id ($(du -sh "$base/releases/$id" | cut -f1))"
