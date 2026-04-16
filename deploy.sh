#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# Imanifest VPS Deploy Script
# Usage:  bash <(curl -fsSL https://raw.githubusercontent.com/mentari92/Imanifestapp/main/deploy.sh)
# ────────────────────────────────────────────────────────────────
set -e

REPO_URL="https://github.com/mentari92/Imanifestapp.git"
TARGET_DIR="/root/imanifestapp"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Imanifest Auto-Deploy Script           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Find existing repo ───────────────────────────────────
REPO_DIR=""
for candidate in /root/imanifestapp /root/Imanifestapp /home/imanifestapp /opt/imanifestapp /var/www/imanifestapp; do
  if [ -f "$candidate/docker-compose.yml" ]; then
    REPO_DIR="$candidate"
    echo "✅ Found existing repo at: $REPO_DIR"
    break
  fi
done

# ── Step 2: If not found, clone fresh ────────────────────────────
if [ -z "$REPO_DIR" ]; then
  echo "📥 Repo not found locally. Cloning from GitHub..."
  git clone "$REPO_URL" "$TARGET_DIR"
  REPO_DIR="$TARGET_DIR"
  echo "✅ Cloned to $REPO_DIR"

  # Try to restore .env from running API container
  echo "🔑 Trying to restore .env from running container..."
  API_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i "api\|server\|imanifest" | head -1 || true)
  if [ -n "$API_CONTAINER" ]; then
    docker inspect "$API_CONTAINER" \
      --format='{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' \
      | grep -v "^PATH=\|^HOSTNAME=\|^HOME=\|^TERM=" \
      > "$REPO_DIR/.env" 2>/dev/null || true
    echo "✅ .env restored from container: $API_CONTAINER"
  else
    echo "⚠️  No running API container found. Creating minimal .env..."
    cat > "$REPO_DIR/.env" << 'ENVEOF'
POSTGRES_USER=imanifest
POSTGRES_PASSWORD=imanifest_secure_2025
POSTGRES_DB=imanifest
DATABASE_URL=postgresql://imanifest:imanifest_secure_2025@db:5432/imanifest?schema=public
REDIS_URL=redis://redis:6379
PORT=3001
ENVEOF
    echo "⚠️  Please update $REPO_DIR/.env with your real credentials!"
  fi
fi

cd "$REPO_DIR"
echo ""
echo "📁 Working in: $REPO_DIR"

# ── Step 3: Pull latest code ──────────────────────────────────────
echo ""
echo "⬇️  Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main
echo "✅ Code updated to latest version"

# ── Step 4: Show what changed ─────────────────────────────────────
echo ""
echo "📝 Latest commits:"
git log --oneline -5

# ── Step 5: Rebuild containers ────────────────────────────────────
echo ""
echo "🔨 Rebuilding Docker containers (this takes 3-5 minutes)..."
docker compose build --no-cache api web
echo "✅ Build complete"

# ── Step 6: Restart containers ────────────────────────────────────
echo ""
echo "🚀 Restarting containers..."
docker compose up -d --force-recreate api web
echo "✅ Containers restarted"

# ── Step 7: Wait and verify ───────────────────────────────────────
echo ""
echo "⏳ Waiting 15 seconds for startup..."
sleep 15

echo ""
echo "📊 Container status:"
docker compose ps

# ── Step 8: Reconnect to n8n network ─────────────────────────────
echo ""
echo "🔗 Reconnecting to network..."
WEB_ID=$(docker compose ps -q web 2>/dev/null || true)
if [ -n "$WEB_ID" ]; then
  docker network connect --alias imanifest-web n8n_default "$WEB_ID" 2>/dev/null \
    && echo "✅ Web connected to n8n_default" \
    || echo "ℹ️  n8n_default network not found (ok if Caddy is configured differently)"
fi

# ── Step 9: Quick API test ────────────────────────────────────────
echo ""
echo "🧪 Testing API..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API is responding (HTTP $HTTP_CODE)"
else
  echo "⚠️  API returned HTTP $HTTP_CODE — check logs with: docker compose logs api"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ Deploy selesai!                     ║"
echo "║   Buka https://imanifestapp.com          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
