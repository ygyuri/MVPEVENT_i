#!/usr/bin/env bash
set -euo pipefail

# Usage: curl -fsSL https://raw.githubusercontent.com/your-org/MVPEVENT_i/main/scripts/vm-bootstrap.sh | bash
# Or run after cloning the repo: ./scripts/vm-bootstrap.sh

DOMAIN=${DOMAIN:-event-i.co.ke}
CONTACT_EMAIL=${CONTACT_EMAIL:-you@example.com}
REPO_URL=${REPO_URL:-https://github.com/your-org/MVPEVENT_i.git}
BRANCH=${BRANCH:-main}

log() { echo -e "[vm-bootstrap] $*"; }

log "Updating packages and installing prerequisites..."
sudo apt-get update -y && sudo apt-get install -y ca-certificates curl gnupg git

log "Installing Docker and Docker Compose plugin..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

log "Adding current user to docker group..."
sudo usermod -aG docker "$USER" || true

log "Cloning repository (or updating if exists)..."
cd ~
if [ -d MVPEVENT_i ]; then
  cd MVPEVENT_i
  git fetch --all
  git checkout "$BRANCH"
  git pull --rebase
else
  git clone "$REPO_URL"
  cd MVPEVENT_i
  git checkout "$BRANCH" || true
fi

log "Preparing .env from env.production.example (idempotent)..."
if [ ! -f .env ]; then
  cp env.production.example .env
  sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" .env
fi

log "Attempting Let\'s Encrypt certificate issuance for $DOMAIN..."
sudo apt-get install -y certbot || true
if sudo systemctl is-active --quiet nginx; then sudo systemctl stop nginx; fi || true
if sudo certbot certonly --standalone -d "$DOMAIN" --agree-tos -m "$CONTACT_EMAIL" --non-interactive; then
  sudo mkdir -p nginx/ssl
  sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
  sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
  log "Let\'s Encrypt certs copied into nginx/ssl."
else
  log "Let\'s Encrypt failed. Falling back to self-signed certs."
  (cd nginx && ./generate-ssl.sh)
fi

log "Starting Docker Compose (production)..."
docker compose -f docker-compose.prod.yml up -d

echo
log "Deployment complete."
log "Visit: https://$DOMAIN"
log "API:   https://$DOMAIN/api/health"
log "Run:   docker compose -f docker-compose.prod.yml logs -f"
