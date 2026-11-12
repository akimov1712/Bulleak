#!/usr/bin/env bash
# Step 3: API runtime — Node 24, PostgreSQL, the bulleak system user, secrets and the systemd unit.
# Safe to run again: existing secrets and the database are kept.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
DOMAIN=${DOMAIN:-bulleak.ru}

if ! command -v node >/dev/null || [[ $(node -p 'process.versions.node.split(".")[0]') != 24 ]]; then
  apt-get -y -q install ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get -y -q install nodejs
fi
TSX_VERSION=${TSX_VERSION:-4.23.15}
npm install -g --no-fund --no-audit "tsx@${TSX_VERSION}"

apt-get -y -q install postgresql
systemctl enable --now postgresql

id bulleak >/dev/null 2>&1 || useradd --system --home /opt/bulleak --shell /usr/sbin/nologin bulleak
mkdir -p /opt/bulleak/api/releases /etc/bulleak
chmod 750 /etc/bulleak

ENV_FILE=/etc/bulleak/api.env
if [[ ! -f $ENV_FILE ]]; then
  db_password=$(openssl rand -hex 24)
  jwt_secret=$(openssl rand -base64 48 | tr -d '\n')
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bulleak') THEN
    CREATE ROLE bulleak LOGIN;
  END IF;
END \$\$;
ALTER ROLE bulleak PASSWORD '${db_password}';
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'bulleak'" | grep -q 1 ||
    sudo -u postgres createdb -O bulleak bulleak
  umask 077
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8787
APP_ORIGIN=https://${DOMAIN}
APP_URL=https://${DOMAIN}/
JWT_SECRET=${jwt_secret}
REFRESH_TRANSPORT=cookie
TRUST_PROXY=true
DATABASE_URL=postgres://bulleak:${db_password}@127.0.0.1:5432/bulleak
RESEND_API_KEY=
MAIL_FROM=
EOF
  chown root:bulleak "$ENV_FILE"
  chmod 640 "$ENV_FILE"
  echo "created $ENV_FILE (mail settings are empty)"
fi

cat > /etc/systemd/system/bulleak-api.service <<'EOF'
[Unit]
Description=Bulleak API
After=network-online.target postgresql.service
Wants=network-online.target
Requires=postgresql.service

[Service]
User=bulleak
Group=bulleak
WorkingDirectory=/opt/bulleak/api/current/server
EnvironmentFile=/etc/bulleak/api.env
ExecStart=/usr/bin/tsx src/main.ts
Restart=always
RestartSec=3
MemoryMax=400M
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/tmp

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable bulleak-api >/dev/null
echo "node $(node -v), tsx $(tsx --version | head -1), $(psql --version)"
