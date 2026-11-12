#!/usr/bin/env bash
# Step 2: nginx — the static site from /var/www/bulleak/current and the API proxied at /api/.
# With a Let's Encrypt certificate for $DOMAIN the site is served over HTTPS only; without one
# (before DNS points here) it is served over HTTP. Run again after DNS is set up: it obtains the
# certificate and switches to HTTPS.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
DOMAIN=${DOMAIN:-bulleak.ru}
apt-get -y -q install nginx certbot

mkdir -p /var/www/bulleak/releases /var/www/letsencrypt

cat > /etc/nginx/conf.d/bulleak-gzip.conf <<'EOF'
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json text/plain;
EOF

# nginx drops inherited add_header lines in any block that adds its own,
# so every location includes the same security headers.
cat > /etc/nginx/snippets/bulleak-headers.conf <<'EOF'
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header X-Frame-Options DENY always;
EOF

# Site and API, shared by the HTTP (before the certificate) and HTTPS variants.
cat > /etc/nginx/snippets/bulleak-site.conf <<'EOF'
root /var/www/bulleak/current;
index index.html;
charset utf-8;
charset_types text/css application/javascript application/json application/manifest+json text/plain image/svg+xml;

include snippets/bulleak-headers.conf;

location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    client_max_body_size 3m;
}

# Hashed build files never change: cache for a year.
location /assets/ {
    include snippets/bulleak-headers.conf;
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
}

# The page and the service worker must always be fresh, or updates get stuck.
location = /index.html {
    include snippets/bulleak-headers.conf;
    add_header Cache-Control "no-cache";
}
location = /sw.js {
    include snippets/bulleak-headers.conf;
    add_header Cache-Control "no-cache";
}

location / {
    try_files $uri $uri/ /index.html;
}
EOF

cat > /etc/nginx/snippets/bulleak-acme.conf <<'EOF'
location /.well-known/acme-challenge/ {
    root /var/www/letsencrypt;
}
EOF

cert=/etc/letsencrypt/live/$DOMAIN
http_only() {
  cat > /etc/nginx/sites-available/bulleak <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN _;
    include snippets/bulleak-acme.conf;
    include snippets/bulleak-site.conf;
}
EOF
}

https() {
  cat > /etc/nginx/sites-available/bulleak <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN _;
    include snippets/bulleak-acme.conf;
    location / { return 301 https://$DOMAIN\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.$DOMAIN;
    ssl_certificate $cert/fullchain.pem;
    ssl_certificate_key $cert/privkey.pem;
    return 301 https://$DOMAIN\$request_uri;
}
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    http2 on;
    server_name $DOMAIN;
    ssl_certificate $cert/fullchain.pem;
    ssl_certificate_key $cert/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:bulleak:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=31536000" always;
    include snippets/bulleak-site.conf;
}
EOF
  # HSTS has to be repeated in every location that adds headers.
  grep -q Strict-Transport-Security /etc/nginx/snippets/bulleak-headers.conf ||
    echo 'add_header Strict-Transport-Security "max-age=31536000" always;' >> /etc/nginx/snippets/bulleak-headers.conf
}

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/bulleak /etc/nginx/sites-enabled/bulleak
[[ -f $cert/fullchain.pem ]] || http_only
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if [[ ! -f $cert/fullchain.pem && ${ISSUE_CERT:-0} == 1 ]]; then
  certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive --agree-tos --register-unsafely-without-email
fi
if [[ -f $cert/fullchain.pem ]]; then
  https
  mkdir -p /etc/letsencrypt/renewal-hooks/deploy
  printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
  chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
  nginx -t
  systemctl reload nginx
  echo "nginx: https://$DOMAIN"
else
  echo "nginx: http only (no certificate for $DOMAIN yet)"
fi
