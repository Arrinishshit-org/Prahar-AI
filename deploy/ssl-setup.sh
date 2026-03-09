#!/bin/bash
# ─── SSL Certificate Setup for prahar.app ───
# Run this on the EC2 instance to obtain and configure Let's Encrypt certificates.
#
# Prerequisites:
#   - Domain prahar.app must point to this server's IP (A record)
#   - Port 80 and 443 open in security group
#   - Docker containers stopped (this script handles it)

set -e

DOMAIN="prahar.app"
EMAIL="${1:?Usage: ./deploy/ssl-setup.sh your-email@example.com}"
APP_DIR="/home/ubuntu/praharai"
SSL_DIR="${APP_DIR}/deploy/ssl"

echo "=== SSL Setup for ${DOMAIN} ==="
echo ""

# 1. Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# 2. Stop containers so port 80 is free for standalone verification
echo "⏹️  Stopping containers to free port 80..."
cd "${APP_DIR}"
docker compose --env-file .env.production -f docker-compose.prod.yml down 2>/dev/null || true

# 3. Obtain certificate
echo "🔐 Requesting certificate for ${DOMAIN}..."
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

# 4. Copy certs to deploy/ssl so Docker can mount them
echo "📁 Copying certificates to ${SSL_DIR}..."
sudo mkdir -p "${SSL_DIR}"
sudo cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
sudo cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${SSL_DIR}/privkey.pem"
sudo chown -R ubuntu:ubuntu "${SSL_DIR}"
chmod 600 "${SSL_DIR}/privkey.pem"
chmod 644 "${SSL_DIR}/fullchain.pem"

# 5. Restart containers
echo "🚀 Starting containers with HTTPS..."
cd "${APP_DIR}"
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 6. Set up auto-renewal cron job
echo "⏰ Setting up auto-renewal..."
RENEW_SCRIPT="${APP_DIR}/deploy/ssl-renew.sh"

cat > "${RENEW_SCRIPT}" << 'RENEW_EOF'
#!/bin/bash
# Auto-renew SSL certificate and copy to Docker mount
set -e
DOMAIN="prahar.app"
APP_DIR="/home/ubuntu/praharai"
SSL_DIR="${APP_DIR}/deploy/ssl"

# Renew (certbot skips if not due)
certbot renew --quiet --standalone --pre-hook "docker compose --env-file ${APP_DIR}/.env.production -f ${APP_DIR}/docker-compose.prod.yml stop frontend" --post-hook "docker compose --env-file ${APP_DIR}/.env.production -f ${APP_DIR}/docker-compose.prod.yml start frontend"

# Copy renewed certs
cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${SSL_DIR}/privkey.pem"
chown ubuntu:ubuntu "${SSL_DIR}"/*.pem
chmod 600 "${SSL_DIR}/privkey.pem"
chmod 644 "${SSL_DIR}/fullchain.pem"

# Reload nginx to pick up new certs
docker exec praharai-frontend nginx -s reload 2>/dev/null || true
RENEW_EOF

chmod +x "${RENEW_SCRIPT}"

# Add cron job (runs twice daily as recommended by Let's Encrypt)
CRON_LINE="0 3,15 * * * ${RENEW_SCRIPT} >> /var/log/certbot-renew.log 2>&1"
(sudo crontab -l 2>/dev/null | grep -v "ssl-renew.sh"; echo "${CRON_LINE}") | sudo crontab -

echo ""
echo "✅ SSL setup complete!"
echo ""
echo "   https://${DOMAIN} should now be live."
echo "   Auto-renewal cron job installed (runs at 3am and 3pm daily)."
echo ""
echo "   To test renewal: sudo certbot renew --dry-run"
