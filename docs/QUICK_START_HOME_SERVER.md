## Quick Start: Home Server Deployment with Cloudflare

This is a condensed guide to get your Async Boardgame Service running on a home server with Cloudflare in under 30 minutes.

## Prerequisites Checklist

- [ ] Linux server (Ubuntu 20.04+ recommended)
- [ ] Domain name configured in Cloudflare
- [ ] Cloudflare Origin Certificate generated
- [ ] Router access for port forwarding (8080, 8443)
- [ ] 30 minutes of time

## Setup Overview

The setup uses Cloudflare for SSL/TLS termination and DDoS protection:
1. Install Docker and Nginx
2. Configure Nginx with Cloudflare Origin Certificate
3. Deploy the application
4. Set up automated backups
5. Configure monitoring

## Manual Setup (Step-by-Step)

If you prefer to run each step manually:

### 1. Prepare Cloudflare (10 minutes)

Follow the [Cloudflare Setup Guide](./CLOUDFLARE_SETUP_GUIDE.md):
1. Add domain to Cloudflare
2. Generate Origin Certificate
3. Configure DNS (A/AAAA record with proxy enabled)
4. Set SSL/TLS mode to "Full (strict)"
5. Configure Origin Rules (443 → 8443)

### 2. Configure Router (5 minutes)

Forward these ports to your server's local IP:
- Port 8080 → Server IP:8080 (HTTP)
- Port 8443 → Server IP:8443 (HTTPS)

### 3. Clone Repository (2 minutes)

```bash
sudo mkdir -p /opt/async-boardgame-service
sudo chown $USER:$USER /opt/async-boardgame-service
cd /opt/async-boardgame-service
git clone <your-repo-url> .
```

### 4. Run Setup Scripts (15 minutes)

```bash
# Install dependencies
sudo ./scripts/setup-server.sh

# Install Cloudflare Origin Certificate
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.pem      # Paste certificate
sudo nano /etc/ssl/cloudflare/origin-key.pem  # Paste private key
sudo chmod 644 /etc/ssl/cloudflare/origin.pem
sudo chmod 600 /etc/ssl/cloudflare/origin-key.pem

# Configure Nginx for Cloudflare
sudo ./scripts/setup-nginx-cloudflare.sh yourdomain.com full

# Configure environment
cp .env.example .env
nano .env  # Edit DB_PASSWORD and other settings

# Deploy application
./scripts/deploy.sh

# Setup backups (optional)
sudo ./scripts/setup-backups.sh

# Setup monitoring (optional)
sudo ./scripts/setup-monitoring.sh
```

### 5. Verify (3 minutes)

```bash
# Check services
docker-compose ps

# Test locally
curl http://localhost:3000/health
curl -k https://localhost:8443/health

# Test through Cloudflare
curl https://yourdomain.com/health
```

## GitHub Actions Auto-Deployment

Set up automated deployments in 10 minutes:

### 1. Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions
```

### 2. Add Public Key to Server

```bash
# Copy public key
cat ~/.ssh/github-actions.pub

# On server
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Add GitHub Secrets

Go to GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/github-actions` |
| `SERVER_HOST` | `games.yourdomain.com` |
| `SERVER_USER` | Your SSH username |
| `SERVER_PATH` | `/opt/async-boardgame-service` |
| `DOMAIN` | `games.yourdomain.com` |

### 4. Push to Deploy

```bash
git add .
git commit -m "feat: my changes"
git push origin main
```

Watch deployment at: GitHub → Actions tab

## Common Commands

```bash
# View logs
docker-compose logs -f backend

# Restart services
docker-compose restart

# Update application
./scripts/update.sh

# Backup database
./scripts/backup.sh

# Check status
docker-compose ps
```

## Troubleshooting

### Can't access site from internet

```bash
# Check DNS (should return Cloudflare IPs)
nslookup yourdomain.com

# Check Cloudflare proxy status (should be enabled)
# Visit Cloudflare Dashboard → DNS

# Check Nginx
sudo systemctl status nginx
sudo nginx -t
```

### SSL certificate issues

```bash
# Check Cloudflare Origin Certificate
sudo openssl x509 -in /etc/ssl/cloudflare/origin.pem -text -noout

# Verify SSL/TLS mode in Cloudflare Dashboard
# Should be "Full (strict)"

# Check Nginx SSL configuration
sudo nginx -t
```

### Application not starting

```bash
# Check logs
docker-compose logs backend

# Rebuild
docker-compose down
docker-compose up -d --build
```

## Next Steps

- [ ] Configure Clerk authentication (if needed)
- [ ] Set up GitHub Actions for auto-deployment
- [ ] Configure backups to remote location
- [ ] Set up monitoring alerts
- [ ] Add custom domain to Clerk dashboard
- [ ] Configure Cloudflare firewall rules
- [ ] Enable Cloudflare caching for static assets

## Full Documentation

- [Cloudflare Setup Guide](./CLOUDFLARE_SETUP_GUIDE.md)
- [Cloudflare Architecture](./CLOUDFLARE_ARCHITECTURE.md)
- [GitHub Actions Setup](./GITHUB_ACTIONS_SETUP.md)
- [Authentication Guide](./AUTHENTICATION.md)

## Support

Need help? Check the full documentation or open an issue on GitHub.
