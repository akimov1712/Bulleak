#!/usr/bin/env bash
# Step 4: nightly database dumps in /var/backups/bulleak (custom format, last 14 kept).
# Copies off the server: scripts/pull-backup.ps1 downloads the latest one.
set -euo pipefail

install -d -m 700 /var/backups/bulleak
chown postgres:postgres /var/backups/bulleak

cat > /usr/local/bin/bulleak-backup <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
dir=/var/backups/bulleak
file="$dir/bulleak-$(date -u +%Y%m%d-%H%M%S).dump"
cd /tmp
sudo -u postgres pg_dump -Fc -d bulleak -f "$file.part"
mv "$file.part" "$file"
chmod 600 "$file"
ls -1t "$dir"/bulleak-*.dump | tail -n +15 | xargs -r rm -f
echo "backup $(basename "$file") $(du -h "$file" | cut -f1)"
EOF
chmod 755 /usr/local/bin/bulleak-backup

cat > /etc/systemd/system/bulleak-backup.service <<'EOF'
[Unit]
Description=Bulleak database backup
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/bulleak-backup
EOF

cat > /etc/systemd/system/bulleak-backup.timer <<'EOF'
[Unit]
Description=Nightly Bulleak database backup

[Timer]
OnCalendar=*-*-* 01:30:00 UTC
RandomizedDelaySec=15m
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now bulleak-backup.timer
systemctl start bulleak-backup.service
journalctl -u bulleak-backup -n 1 --no-pager -o cat
systemctl list-timers bulleak-backup.timer --no-pager | head -2
