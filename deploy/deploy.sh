#!/usr/bin/env bash
# =============================================================================
# PraharAI — Deployment Script (called by GitHub Actions or manually)
# =============================================================================
# Usage: ./deploy/deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR="/home/ubuntu/praharai"
cd "$APP_DIR"

echo "--- Pulling latest code ---"
git fetch origin main
git reset --hard origin/main

echo "--- Building and restarting containers ---"
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "--- Cleaning up old images ---"
docker image prune -f

echo "--- Deployment complete ---"
docker compose -f docker-compose.prod.yml ps
