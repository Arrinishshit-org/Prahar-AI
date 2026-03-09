#!/usr/bin/env bash
# =============================================================================
# PraharAI — EC2 First-Time Setup Script
# =============================================================================
# Run on a fresh Ubuntu 22.04+ EC2 instance:
#   chmod +x deploy/ec2-setup.sh && sudo ./deploy/ec2-setup.sh
# =============================================================================
set -euo pipefail

echo "========================================="
echo " PraharAI EC2 Setup"
echo "========================================="

# --- 1. System updates ---
echo "[1/6] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# --- 2. Install Docker ---
echo "[2/6] Installing Docker..."
if ! command -v docker &>/dev/null; then
    apt-get install -y ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully."
else
    echo "Docker already installed, skipping."
fi

# --- 3. Add ubuntu user to docker group ---
echo "[3/6] Configuring docker group..."
usermod -aG docker ubuntu 2>/dev/null || true

# --- 4. Install Git ---
echo "[4/6] Installing Git..."
apt-get install -y git

# --- 5. Create app directory ---
echo "[5/6] Setting up application directory..."
APP_DIR="/home/ubuntu/praharai"
mkdir -p "$APP_DIR"
chown ubuntu:ubuntu "$APP_DIR"

# --- 6. Setup swap (useful for small instances) ---
echo "[6/6] Setting up swap space (2GB)..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap enabled."
else
    echo "Swap already exists, skipping."
fi

echo ""
echo "========================================="
echo " Setup Complete!"
echo "========================================="
echo ""
echo " Next steps (run as 'ubuntu' user):"
echo ""
echo "   1. Clone your repo:"
echo "      cd /home/ubuntu/praharai"
echo "      git clone https://github.com/VishnuNambiar0602/PraharAI.git ."
echo ""
echo "   2. Copy and edit environment file:"
echo "      cp .env.production.example .env.production"
echo "      nano .env.production"
echo ""
echo "   3. Generate secure secrets:"
echo "      openssl rand -hex 32    # for JWT_SECRET"
echo "      openssl rand -hex 32    # for JWT_REFRESH_SECRET"
echo "      openssl rand -hex 32    # for ENCRYPTION_KEY"
echo ""
echo "   4. Start the application:"
echo "      docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "   5. Initialize the database:"
echo "      docker exec praharai-backend node backend/dist/db/init-db.js"
echo ""
echo "========================================="
