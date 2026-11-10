#!/usr/bin/env bash
# Step 1: updates, key-only SSH, firewall, automatic security updates.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "== updates"
apt-get update -q
apt-get -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade
apt-get -y -q install ufw unattended-upgrades curl ca-certificates gnupg
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== ssh: keys only"
# Files in sshd_config.d are read in name order and the first value wins,
# so this one must sort before 00-freetato.conf and 50-cloud-init.conf.
cat > /etc/ssh/sshd_config.d/00-bulleak.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh
sshd -T | grep -Ei '^(passwordauthentication|permitrootlogin) '

echo "== firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose | head -12

echo "== reboot needed: $([ -f /var/run/reboot-required ] && echo yes || echo no)"
