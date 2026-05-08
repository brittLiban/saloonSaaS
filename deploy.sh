#!/usr/bin/env bash
# =============================================================================
#  Glasshound → pawreception.com  |  Production deploy script
#
#  Your VM already has:
#    - Docker + Docker Compose
#    - A Dockerized Nginx proxy at ~/proxy/ on the "proxy-net" Docker network
#    - Certbot for SSL (already used for maisonnima.com / jctiresshop.com)
#
#  Run from the project directory on your VM:
#    chmod +x deploy.sh && sudo ./deploy.sh
#
#  What it does:
#    1. Checks prerequisites
#    2. Generates secrets and writes .env
#    3. Builds images and starts all services
#    4. Waits for the web container to become healthy
#    5. Seeds the database with demo data
#    6. Gets an SSL cert for pawreception.com
#    7. Adds a server block to ~/proxy/nginx.conf and reloads the proxy
# =============================================================================

set -euo pipefail

DOMAIN="pawreception.com"
PROXY_DIR="${HOME}/proxy"          # where your nginx docker-compose lives
PROXY_NGINX_CONF="${PROXY_DIR}/nginx.conf"
CERTBOT_WEBROOT="/var/www/certbot"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
EMAIL="liban3367@gmail.com"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓  $*${NC}"; }
info() { echo -e "${YELLOW}→  $*${NC}"; }
fail() { echo -e "${RED}✗  $*${NC}"; exit 1; }
step() { echo -e "\n${CYAN}── $* ──${NC}"; }

# ── 0. Must run as root ────────────────────────────────────────────────────────

[[ $EUID -eq 0 ]] || fail "Run with sudo: sudo ./deploy.sh"

# Remember who actually called sudo (for home dir resolution)
REAL_USER="${SUDO_USER:-root}"
REAL_HOME=$(eval echo "~${REAL_USER}")
PROXY_DIR="${REAL_HOME}/proxy"
PROXY_NGINX_CONF="${PROXY_DIR}/nginx.conf"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║     Glasshound  ·  pawreception.com          ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Prerequisites ──────────────────────────────────────────────────────────

step "Prerequisites"

command -v docker   >/dev/null 2>&1 || fail "docker not found"
command -v certbot  >/dev/null 2>&1 || { apt-get install -y -qq certbot; ok "Certbot installed"; }
command -v openssl  >/dev/null 2>&1 || fail "openssl not found"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DC="docker-compose"
else
  fail "Docker Compose not found"
fi

[[ -f "docker-compose.yml" ]] || fail "Run this script from inside the project directory."
[[ -f "${PROXY_NGINX_CONF}" ]] || fail "Nginx config not found at ${PROXY_NGINX_CONF}"

# Make sure proxy-net exists
if ! docker network ls --format '{{.Name}}' | grep -q '^proxy-net$'; then
  info "Creating proxy-net Docker network…"
  docker network create proxy-net
fi

ok "All prerequisites met"

# ── 2. Secrets + .env ─────────────────────────────────────────────────────────

step "Environment"

ENV_FILE=".env"

if [[ -f "${ENV_FILE}" ]]; then
  ok ".env already exists — reusing"
  # Load so seed step has POSTGRES_PASSWORD
  set -o allexport; source "${ENV_FILE}"; set +o allexport
else
  POSTGRES_PASSWORD=$(openssl rand -hex 24)
  MINIO_PASSWORD=$(openssl rand -hex 24)
  SESSION_SECRET=$(openssl rand -hex 32)

  cat > "${ENV_FILE}" <<EOF
# ── App ───────────────────────────────────────────────────────────────────────
APP_URL=https://${DOMAIN}

# ── Database ──────────────────────────────────────────────────────────────────
POSTGRES_DB=glasshound
POSTGRES_USER=glasshound
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://glasshound:${POSTGRES_PASSWORD}@postgres:5432/glasshound?schema=public

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── Object storage (MinIO) ────────────────────────────────────────────────────
MINIO_ROOT_USER=glasshound
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
S3_ENDPOINT=http://minio:9000
S3_BUCKET=glasshound-assets
S3_ACCESS_KEY_ID=glasshound
S3_SECRET_ACCESS_KEY=${MINIO_PASSWORD}

# ── Auth ──────────────────────────────────────────────────────────────────────
SESSION_SECRET=${SESSION_SECRET}
EOF

  chmod 600 "${ENV_FILE}"
  set -o allexport; source "${ENV_FILE}"; set +o allexport
  ok "Secrets written to .env"
fi

# ── 3. Build + start ──────────────────────────────────────────────────────────

step "Docker build & start"

info "Building images (3–6 min on first run)…"
$DC build --pull

info "Starting services…"
$DC up -d --remove-orphans

# ── 4. Wait for web to be healthy ─────────────────────────────────────────────

step "Health check"

info "Waiting for web container…"
ATTEMPTS=0
until $DC ps web 2>/dev/null | grep -q "healthy"; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [[ $ATTEMPTS -ge 40 ]] && fail "Web container never became healthy. Check: $DC logs web"
  printf "."
  sleep 15
done
echo ""
ok "Web container is healthy"

# ── 5. Seed demo data ─────────────────────────────────────────────────────────

step "Demo data"

SEED_FLAG=".seeded"

if [[ -f "${SEED_FLAG}" ]]; then
  ok "Already seeded (delete .seeded to re-seed)"
else
  info "Running seed…"
  $DC run --rm \
    -e DATABASE_URL="postgresql://glasshound:${POSTGRES_PASSWORD}@postgres:5432/glasshound?schema=public" \
    migrate \
    npx tsx prisma/seed.ts

  touch "${SEED_FLAG}"
  ok "Seeded: 8 clients, 10 animals, 26 appointments"
  echo "     Login: nina@example.com  /  demo-password"
fi

# ── 6. SSL certificate ────────────────────────────────────────────────────────

step "SSL certificate"

if [[ -f "${CERT_DIR}/fullchain.pem" ]]; then
  ok "Certificate for ${DOMAIN} already exists"
else
  echo ""
  echo "  ┌─────────────────────────────────────────────────────────┐"
  echo "  │  DNS check — point pawreception.com at this server      │"
  echo "  │                                                         │"
  echo "  │  In Namecheap → Advanced DNS, add:                      │"
  echo "  │    A Record   @    →  $(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  echo "  │    A Record   www  →  $(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  echo "  │                                                         │"
  echo "  │  Check: https://dnschecker.org/#A/${DOMAIN}    │"
  echo "  └─────────────────────────────────────────────────────────┘"
  echo ""
  read -rp "  DNS is live — press Enter to issue certificate: "

  # Use certbot webroot (same method your other domains use)
  certbot certonly \
    --webroot \
    --webroot-path "${CERTBOT_WEBROOT}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}"

  ok "Certificate issued at ${CERT_DIR}"
fi

# ── 7. Add server block to proxy nginx.conf ───────────────────────────────────

step "Proxy nginx config"

PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/-*$//')
CONTAINER_NAME="${PROJECT_NAME}-web-1"

info "Writing ${DOMAIN} server block into ${PROXY_NGINX_CONF}…"

# Use Python to safely insert the block INSIDE the http{} closing brace.
# Also removes any previous pawreception block first so re-runs are safe.
python3 - <<PYEOF
import re, sys

conf_path  = '${PROXY_NGINX_CONF}'
domain     = '${DOMAIN}'
container  = '${CONTAINER_NAME}'
cert_dir   = '${CERT_DIR}'

with open(conf_path, 'r') as f:
    content = f.read()

# Strip any existing pawreception block (handles broken previous runs)
content = re.sub(
    r'\n[ \t]*# ── pawreception\.com.*',
    '',
    content,
    flags=re.DOTALL
).rstrip() + '\n'

server_block = f"""
  # ── pawreception.com ─────────────────────────────────────────────────────
  server {{
    listen 443 ssl;
    server_name {domain} www.{domain};

    ssl_certificate     {cert_dir}/fullchain.pem;
    ssl_certificate_key {cert_dir}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {{
      proxy_pass         http://{container}:3000;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade \$http_upgrade;
      proxy_set_header   Connection 'upgrade';
      proxy_set_header   Host \$host;
      proxy_set_header   X-Real-IP \$remote_addr;
      proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto https;
      proxy_read_timeout 120s;
    }}
  }}
"""

# Insert before the final closing }} that ends the http{{}} block
last_brace = content.rfind('\n}')
if last_brace == -1:
    print('ERROR: could not find closing }} of http block')
    sys.exit(1)

content = content[:last_brace] + server_block + '}\n'

with open(conf_path, 'w') as f:
    f.write(content)

print('nginx.conf updated OK')
PYEOF

ok "Server block inserted inside http{} block"

# Reload the proxy container (no restart — zero downtime for other sites)
info "Reloading proxy Nginx…"
(cd "${PROXY_DIR}" && $DC exec nginx nginx -s reload) \
  || (cd "${PROXY_DIR}" && $DC restart nginx)

ok "Proxy reloaded"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Glasshound is live!                             ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo "  URL       →  https://${DOMAIN}"
echo "  Login     →  nina@example.com"
echo "  Password  →  demo-password"
echo ""
echo "  Useful commands (run from project dir):"
echo "    $DC logs -f web        # live app logs"
echo "    $DC ps                 # container status"
echo "    $DC restart web        # restart just the app"
echo ""
echo "  To update the app after a git pull:"
echo "    $DC build && $DC up -d"
echo ""
echo "  To re-seed:"
echo "    rm .seeded && sudo ./deploy.sh"
echo ""
