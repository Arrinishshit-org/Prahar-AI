# PraharAI — EC2 Deployment Guide

## Table of Contents

1. [EC2 Instance Requirements](#1-ec2-instance-requirements)
2. [EC2 Instance Setup](#2-ec2-instance-setup)
3. [Application Deployment](#3-application-deployment)
4. [GitHub Actions CI/CD](#4-github-actions-cicd)
5. [Changing Credentials](#5-changing-credentials)
6. [Monitoring & Maintenance](#6-monitoring--maintenance)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. EC2 Instance Requirements

### Minimum Specifications

| Resource          | Minimum          | Recommended      | Notes                                              |
| ----------------- | ---------------- | ---------------- | -------------------------------------------------- |
| **Instance Type** | `t3.medium`      | `t3.large`       | 2 vCPU / 4GB minimum; ML + Neo4j are memory-hungry |
| **vCPUs**         | 2                | 2–4              |                                                    |
| **RAM**           | 4 GB             | 8 GB             | Neo4j alone uses 3GB (heap + page cache)           |
| **Storage (EBS)** | 30 GB gp3        | 50 GB gp3        | Docker images + Neo4j data + logs                  |
| **OS**            | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS | Script is tested for Ubuntu/Debian                 |

### Security Group (Firewall Rules)

Configure these **inbound rules** on your EC2 security group:

| Port | Protocol | Source       | Purpose               |
| ---- | -------- | ------------ | --------------------- |
| 22   | TCP      | Your IP only | SSH access            |
| 80   | TCP      | 0.0.0.0/0    | HTTP (frontend + API) |
| 443  | TCP      | 0.0.0.0/0    | HTTPS (if using SSL)  |

**DO NOT** expose these ports publicly:

- `3000` (backend) — accessed internally via Docker network
- `7474` / `7687` (Neo4j) — accessed internally via Docker network
- `6379` (Redis) — accessed internally via Docker network
- `8000` (ML service) — accessed internally via Docker network

### Key Pair

- Create an **EC2 Key Pair** (`.pem` file) during instance launch.
- Keep this file safe — you need it for SSH and GitHub Actions.

### Elastic IP (Recommended)

- Allocate an **Elastic IP** and associate it with your instance.
- This gives a fixed public IP that doesn't change on reboot.

### IAM Role (Optional)

- No special IAM role is needed for basic deployment.
- If you use AWS services (S3, SES, etc.) later, attach an appropriate role.

---

## 2. EC2 Instance Setup

### Step 1: Launch the Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose **Ubuntu Server 22.04 LTS** AMI
3. Select instance type (`t3.medium` or larger)
4. Configure storage: **30+ GB gp3**
5. Select or create a **Key Pair**
6. Configure **Security Group** (see table above)
7. Launch the instance

### Step 2: Connect via SSH

```bash
# Make your key file read-only
chmod 400 your-key.pem

# Connect
ssh -i your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

### Step 3: Run the Setup Script

```bash
# Download and run (or clone repo first)
git clone https://github.com/VishnuNambiar0602/PraharAI.git /home/ubuntu/praharai
cd /home/ubuntu/praharai
sudo chmod +x deploy/ec2-setup.sh
sudo ./deploy/ec2-setup.sh
```

This installs Docker, Git, sets up swap space, and prepares the app directory.

**After the script finishes, log out and back in** so the docker group takes effect:

```bash
exit
ssh -i your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

## 3. Application Deployment

### Step 1: Configure Environment

```bash
cd /home/ubuntu/praharai

# Copy the template
cp .env.production.example .env.production

# Auto-generate all secrets (recommended)
chmod +x deploy/change-credentials.sh
./deploy/change-credentials.sh
# Choose option 6 to auto-generate ALL secrets
```

Or manually edit:

```bash
nano .env.production
```

**Mandatory fields to change:**

- `NEO4J_PASSWORD` — database password
- `REDIS_PASSWORD` — cache password
- `JWT_SECRET` — generate with `openssl rand -hex 32`
- `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 32`
- `ENCRYPTION_KEY` — generate with `openssl rand -hex 32`
- `ADMIN_KEY` — your admin endpoint key

### Step 2: Build and Start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes several minutes (downloading images, installing dependencies, compiling).

### Step 3: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs if something fails
docker compose -f docker-compose.prod.yml logs -f

# Test health endpoints
curl http://localhost:3000/api/health   # backend
curl http://localhost:8000/health        # ML service
curl http://localhost                    # frontend
```

### Step 4: Initialize Database

```bash
docker exec praharai-backend node backend/dist/db/init-db.js
```

### Step 5: Access the Application

Open `http://<YOUR_EC2_PUBLIC_IP>` in your browser.

---

## 3.5. HTTPS / SSL Setup (prahar.app)

### Prerequisites

- Domain `prahar.app` with an **A record** pointing to your EC2 Elastic IP
- Port **443** open in your EC2 Security Group

### One-Command Setup

```bash
cd /home/ubuntu/praharai
chmod +x deploy/ssl-setup.sh
./deploy/ssl-setup.sh your-email@example.com
```

This will:

1. Install Certbot
2. Obtain a Let's Encrypt certificate for `prahar.app` and `www.prahar.app`
3. Copy certificates to `deploy/ssl/` (mounted into the nginx container)
4. Restart all containers with HTTPS enabled
5. Set up a cron job for automatic certificate renewal

### Verify HTTPS

```bash
curl -I https://prahar.app
```

### Manual Certificate Renewal

```bash
sudo certbot renew --dry-run    # test renewal
sudo ./deploy/ssl-renew.sh      # force renewal
```

### How It Works

- HTTP (port 80) → automatically redirects to HTTPS
- HTTPS (port 443) → serves frontend + proxies `/api/` to backend
- Certificates auto-renew via cron (runs at 3am and 3pm daily)
- Certificates are stored in `deploy/ssl/` (git-ignored)

---

## 4. GitHub Actions CI/CD

The workflow at `.github/workflows/deploy.yml` auto-deploys on every push to `main`.

### Setup GitHub Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions** and add:

| Secret Name    | Value                                                  |
| -------------- | ------------------------------------------------------ |
| `EC2_HOST`     | Your EC2 public IP or Elastic IP                       |
| `EC2_USERNAME` | `ubuntu` (default for Ubuntu AMI)                      |
| `EC2_SSH_KEY`  | Contents of your `.pem` key file (entire file content) |
| `EC2_SSH_PORT` | `22` (optional, defaults to 22)                        |

### How to Add the SSH Key Secret

```bash
# On your local machine, copy the key content
cat your-key.pem
```

Copy the **entire output** (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`) and paste it as the value for `EC2_SSH_KEY`.

### How It Works

1. You push code to `main` branch
2. GitHub Actions SSHs into your EC2 instance
3. Pulls latest code from `main`
4. Rebuilds Docker containers
5. Cleans up old images

### Manual Trigger

You can also trigger the deployment manually:

- Go to **Actions → Deploy to EC2 → Run workflow**

---

## 5. Changing Credentials

### Interactive Script

```bash
cd /home/ubuntu/praharai
./deploy/change-credentials.sh
```

Options:

1. Change Neo4j password
2. Change Redis password
3. Rotate JWT secrets (invalidates all sessions)
4. Rotate encryption key (caution: old encrypted data becomes unreadable)
5. Change admin key
6. Auto-generate ALL secrets

After changing credentials, redeploy:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Manual Editing

```bash
nano /home/ubuntu/praharai/.env.production
# Edit the values you want to change
# Then redeploy
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 6. Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f ml
docker compose -f docker-compose.prod.yml logs -f neo4j
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Restart Services

```bash
# Restart everything
docker compose -f docker-compose.prod.yml restart

# Restart one service
docker compose -f docker-compose.prod.yml restart backend
```

### Check Disk Space

```bash
df -h
docker system df
```

### Clean Up Docker

```bash
# Remove unused images
docker image prune -f

# Full cleanup (careful — removes all stopped containers)
docker system prune -f
```

### Update System Packages

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

---

## 7. Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service-name>

# Check if port is in use
sudo lsof -i :80
sudo lsof -i :3000
```

### Out of Memory

- Upgrade to a larger instance type, or
- Reduce Neo4j memory in `docker-compose.prod.yml`:
  ```yaml
  NEO4J_server_memory_heap_max__size=1G
  NEO4J_server_memory_pagecache_size=512M
  ```

### Can't Connect to Application

1. Check security group allows port 80 inbound
2. Check containers are running: `docker compose -f docker-compose.prod.yml ps`
3. Check nginx logs: `docker logs praharai-frontend`

### GitHub Actions Deployment Fails

1. Verify secrets are correctly set in GitHub
2. Check that the EC2 instance is running
3. Ensure SSH port 22 is open to GitHub's IP ranges
4. Test SSH manually: `ssh -i your-key.pem ubuntu@<IP>`

### Neo4j Won't Start

- Usually a memory issue. Check `docker logs praharai-neo4j`
- Ensure instance has at least 4GB RAM

### Redis Connection Refused

- Check the password matches between `.env.production` and what Redis started with
- If password was changed, restart Redis:
  ```bash
  docker compose -f docker-compose.prod.yml down redis
  docker compose -f docker-compose.prod.yml up -d redis
  ```

---

## Quick Reference

| Action             | Command                                                        |
| ------------------ | -------------------------------------------------------------- |
| Start all services | `docker compose -f docker-compose.prod.yml up -d --build`      |
| Stop all services  | `docker compose -f docker-compose.prod.yml down`               |
| View status        | `docker compose -f docker-compose.prod.yml ps`                 |
| View logs          | `docker compose -f docker-compose.prod.yml logs -f`            |
| Restart a service  | `docker compose -f docker-compose.prod.yml restart <service>`  |
| Change credentials | `./deploy/change-credentials.sh`                               |
| Init database      | `docker exec praharai-backend node backend/dist/db/init-db.js` |
| Manual deploy      | `./deploy/deploy.sh`                                           |
