## Quick Start: Home Server Deployment

This is a condensed guide to get your Async Boardgame Service running on a home server with a custom domain in under 30 minutes.

## Prerequisites Checklist

- [ ] Linux server (Ubuntu 20.04+ recommended)
- [ ] Domain name (e.g., `games.yourdomain.com`)
- [ ] Router access for port forwarding
- [ ] 30 minutes of time

## One-Command Setup

```bash
# Download and run the full setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/full-setup.sh | sudo bash -s -- \
  --domain games.yourdomain.com \
  --email your@email.com \
  --db-password "YourSecurePassword123!"
```

That's it! The script will:
1. Install Docker, Nginx, and dependencies
2. Configure SSL with Let's Encrypt
3. Deploy the application
4. Set up automated backups
5. Configure monitoring

## Manual Setup (Step-by-Step)

If you prefer to run each step manually:

### 1. Prepare Your Domain (5 minutes)

```bash
# Get your public IP
curl ifconfig.me

# Add DNS A record:
# Type: A
# Name: games (or @ for root)
# Value: <your-public-ip>
# TTL: 3600
```

### 2. Configure Router (5 minutes)

Forward these ports to your server's local IP:
- Port 80 → Server IP:80
- Port 443 → Server IP:443

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

# Configure Nginx and SSL
sudo ./scripts/setup-nginx.sh games.yourdomain.com your@email.com

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

# Test publicly
curl https://games.yourdomain.com/health
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
# Check DNS
nslookup games.yourdomain.com

# Check port forwarding
curl -I http://<your-public-ip>

# Check Nginx
sudo systemctl status nginx
```

### SSL certificate issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew
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

## Full Documentation

- [Complete Home Server Guide](./HOME_SERVER_DEPLOYMENT.md)
- [GitHub Actions Setup](./GITHUB_ACTIONS_SETUP.md)
- [Authentication Guide](./AUTHENTICATION.md)

## Support

Need help? Check the full documentation or open an issue on GitHub.
