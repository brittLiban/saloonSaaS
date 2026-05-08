# Glasshound — Deployment Guide (Hetzner VPS)

This guide gets Glasshound live on a Hetzner CX21 (or any Debian/Ubuntu VPS) sitting behind your existing Nginx or Caddy reverse proxy.

---

## What you need

| Item | Notes |
|---|---|
| Hetzner VM | CX21 (2 vCPU, 4 GB RAM) or larger |
| Domain / subdomain | e.g. `salon.yourdomain.com` — pointed at your VM's IP |
| SSH access | As a non-root user with `sudo` |
| Docker installed | Instructions below if not yet done |

---

## Step 1 — Install Docker on the VM

SSH into your server, then:

```sh
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker        # apply group without re-login
docker version       # should print server info
```

---

## Step 2 — Copy the project to the server

**Option A — Git clone (recommended for updates):**

```sh
git clone https://github.com/YOUR_USERNAME/glasshound.git
cd glasshound
```

**Option B — rsync from your local machine:**

```sh
# Run from your local machine:
rsync -av --exclude node_modules --exclude .next \
  /path/to/saloonSaaS/ user@YOUR_SERVER_IP:~/glasshound/
```

Then SSH in and `cd ~/glasshound`.

---

## Step 3 — Run the deploy script

```sh
sh scripts/deploy.sh
```

The script will ask you for:

| Prompt | What to enter |
|---|---|
| **Public URL** | `https://salon.yourdomain.com` |
| **Local port** | `8080` (or any free port — your proxy will forward here) |
| **PostgreSQL password** | Press Enter to accept the generated one |
| **MinIO password** | Press Enter to accept the generated one |
| **Session secret** | Press Enter to accept the auto-generated one |
| **Seed demo data?** | `y` if you want the demo account ready |

The script:
1. Writes `.env` with all secrets
2. Builds all Docker images
3. Runs database migrations automatically
4. Starts Postgres, Redis, MinIO, the app, and the BullMQ worker
5. Optionally seeds demo data (nina@example.com)

---

## Step 4 — Configure your reverse proxy

Choose whichever proxy you're already using.

### Nginx

Add a new server block (e.g. `/etc/nginx/sites-available/glasshound`):

```nginx
server {
    server_name salon.yourdomain.com;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL is handled by Certbot / your existing config
    listen 443 ssl;
    # ssl_certificate / ssl_certificate_key — already configured by Certbot
}

server {
    listen 80;
    server_name salon.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Enable and reload:

```sh
sudo ln -s /etc/nginx/sites-available/glasshound /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If you don't have SSL yet:

```sh
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d salon.yourdomain.com
```

---

### Caddy (if your main proxy is Caddy)

Add to your main `Caddyfile` (not the one inside this project):

```
salon.yourdomain.com {
    reverse_proxy 127.0.0.1:8080
}
```

Reload: `sudo systemctl reload caddy`

Caddy handles HTTPS automatically. No certbot needed.

---

## Step 5 — Verify it's live

```sh
# From the server:
curl http://127.0.0.1:8080/api/health
# → {"ok":true,"service":"glasshound-saas","status":"healthy","db":"ok"}

# From your browser:
# https://salon.yourdomain.com  →  Glasshound login page
```

---

## Updating to a new version

```sh
cd ~/glasshound
git pull                                        # fetch latest code
docker compose up -d --build                    # rebuild and restart
```

Migrations run automatically on startup via the `migrate` service.

---

## Useful commands

```sh
# Live app logs
docker compose logs -f web

# All service status
docker compose ps

# Restart just the app (no rebuild)
docker compose restart web

# Open a Postgres shell
docker compose exec postgres psql -U glasshound glasshound

# Re-seed demo data
sh scripts/seed-demo

# Full teardown (WARNING: deletes all data)
docker compose down -v
```

---

## Minimum required env vars

Everything else has safe defaults in `docker-compose.yml`. Only these matter:

| Variable | Example | Notes |
|---|---|---|
| `APP_URL` | `https://salon.yourdomain.com` | Shown in emails/redirects |
| `SESSION_SECRET` | 44-char random string | Must be at least 32 chars |
| `POSTGRES_PASSWORD` | strong random string | Postgres auth |
| `MINIO_ROOT_PASSWORD` | strong random string | File storage auth |
| `HTTP_PORT` | `8080` | Port your proxy forwards to |

The deploy script generates all secrets automatically.

---

## Troubleshooting

**App won't start:**
```sh
docker compose logs web
docker compose logs migrate   # check if migrations failed
```

**Database connection refused:**
```sh
docker compose ps postgres    # should show "healthy"
docker compose logs postgres
```

**Port already in use:**
```sh
ss -tlnp | grep 8080          # see what's using it
# Change HTTP_PORT in .env and restart: docker compose up -d
```

**Reset everything and start fresh:**
```sh
docker compose down -v        # removes all data
sh scripts/deploy.sh          # re-run setup
```
