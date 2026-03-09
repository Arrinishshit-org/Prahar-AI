#!/usr/bin/env bash
# =============================================================================
# PraharAI — Change Credentials Script
# =============================================================================
# Usage: ./deploy/change-credentials.sh
# Run on the EC2 instance to rotate passwords/secrets interactively.
# =============================================================================
set -euo pipefail

ENV_FILE="/home/ubuntu/praharai/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found."
    echo "Copy .env.production.example to .env.production first."
    exit 1
fi

echo "========================================="
echo " PraharAI Credential Manager"
echo "========================================="
echo ""
echo "Which credentials would you like to change?"
echo ""
echo "  1) Neo4j password"
echo "  2) Redis password"
echo "  3) JWT secrets (access + refresh)"
echo "  4) Encryption key"
echo "  5) Admin key"
echo "  6) Auto-generate ALL secrets (recommended for first setup)"
echo "  7) Exit"
echo ""

read -rp "Choose an option [1-7]: " choice

update_env() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
    echo "  Updated: ${key}"
}

case "$choice" in
    1)
        read -rp "Enter new Neo4j password: " neo4j_pw
        update_env "NEO4J_PASSWORD" "$neo4j_pw"
        echo ""
        echo "IMPORTANT: You must also restart Neo4j and update the database password."
        echo "  docker compose -f docker-compose.prod.yml restart neo4j"
        ;;
    2)
        read -rp "Enter new Redis password: " redis_pw
        update_env "REDIS_PASSWORD" "$redis_pw"
        echo ""
        echo "Restart Redis: docker compose -f docker-compose.prod.yml restart redis"
        ;;
    3)
        jwt_secret=$(openssl rand -hex 32)
        jwt_refresh=$(openssl rand -hex 32)
        update_env "JWT_SECRET" "$jwt_secret"
        update_env "JWT_REFRESH_SECRET" "$jwt_refresh"
        echo ""
        echo "NOTE: All existing user sessions will be invalidated."
        ;;
    4)
        enc_key=$(openssl rand -hex 32)
        update_env "ENCRYPTION_KEY" "$enc_key"
        echo ""
        echo "WARNING: If data was encrypted with the old key, it will be unreadable."
        ;;
    5)
        read -rp "Enter new admin key: " admin_key
        update_env "ADMIN_KEY" "$admin_key"
        ;;
    6)
        echo ""
        echo "Generating all secrets..."
        echo ""

        neo4j_pw=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
        redis_pw=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
        jwt_secret=$(openssl rand -hex 32)
        jwt_refresh=$(openssl rand -hex 32)
        enc_key=$(openssl rand -hex 32)
        admin_key=$(openssl rand -hex 16)

        update_env "NEO4J_PASSWORD" "$neo4j_pw"
        update_env "REDIS_PASSWORD" "$redis_pw"
        update_env "JWT_SECRET" "$jwt_secret"
        update_env "JWT_REFRESH_SECRET" "$jwt_refresh"
        update_env "ENCRYPTION_KEY" "$enc_key"
        update_env "ADMIN_KEY" "$admin_key"

        echo ""
        echo "All secrets generated and saved to $ENV_FILE"
        ;;
    7)
        echo "Exiting."
        exit 0
        ;;
    *)
        echo "Invalid option."
        exit 1
        ;;
esac

echo ""
echo "To apply changes, redeploy:"
echo "  cd /home/ubuntu/praharai"
echo "  docker compose -f docker-compose.prod.yml up -d --build"
echo ""
