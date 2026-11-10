#!/usr/bin/env bash
# Step 2: nginx serving the static site from /var/www/bulleak/current.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get -y -q install nginx

mkdir -p /var/www/bulleak/releases

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

cat > /etc/nginx/sites-available/bulleak <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/bulleak/current;
    index index.html;
    charset utf-8;
    charset_types text/css application/javascript application/json application/manifest+json text/plain image/svg+xml;

    include snippets/bulleak-headers.conf;

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
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/bulleak /etc/nginx/sites-enabled/bulleak
nginx -t
systemctl enable --now nginx
systemctl reload nginx
echo "nginx: $(systemctl is-active nginx)"
