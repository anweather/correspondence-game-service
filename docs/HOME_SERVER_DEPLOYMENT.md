# Home Server Deployment Guide

This guide walks you through deploying the Async Boardgame Service on a home server with a custom DNS endpoint and HTTPS.

## Overview

This setup will give you:
- ✅ Production-ready deployment on your home server
- ✅ Custom domain (e.g., `games.yourdomain.com`)
- ✅ HTTPS with automatic SSL certificate management (Let's Encrypt)
- ✅ Nginx reverse proxy for security and performance
- ✅ Automatic service restart on failure
- ✅ Automated backup system
- ✅ Monitoring and logging

## Prerequisites

### Hardware Requirements
- **Server**: Any Linux machine (Ubuntu 20.04+ recommended)
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Static local IP address

### Software Requirements
- Docker and Docker Compose installed
- Domain name with DNS access
- Port 80 and 443 accessible from the internet

### Skills Required
- Basic Linux command line knowledge
- Access to your router's port forwarding settings
- Access to your domain's DNS settings

## Architecture

```
Internet
    │
    ▼
Router (Port Forward 80, 443)
    │
    ▼
Home Server (Static IP)
    │
    ├─── Nginx Reverse Proxy (HTTPS)
    │    └─── Let's Encrypt SSL
    │
    ├─── Docker Compose
    │    ├─── Backend Service (Node.js + Express)
    │    ├─── PostgreSQL Database
    │    └─── Web Client (React)
    │
    └─── Automated Backups
```

## Step-by-Step Setup

### Step 1: Prepare Your Domain

1. **Get a Domain Name** (if you don't have one):
   - Purchase from: Namecheap, Google Domains, Cloudflare, etc.
   - Or use a free subdomain service like DuckDNS

2. **Set Up DNS**:
   - Log into your domain registrar
   - Create an A record pointing to your public IP:
     ```
     Type: A
     Name: games (or @ for root domain)
     Value: <your-public-ip>
     TTL: 3600
     ```
   - Find your public IP: `curl ifconfig.me`

3. **Optional: Use Dynamic DNS** (if your ISP changes your IP):
   - Set up DuckDNS, No-IP, or similar service
   - Install their update client on your server

### Step 2: Configure Your Router

1. **Set Static IP for Your Server**:
   - Access your router's admin panel (usually 192.168.1.1)
   - Find DHCP settings
   - Reserve an IP for your server's MAC address

2. **Port Forwarding**:
   - Forward external port 80 → server IP port 80 (HTTP)
   - Forward external port 443 → server IP port 443 (HTTPS)
   - Some routers call this "Virtual Server" or "NAT"

3. **Test Port Forwarding**:
   ```bash
   # From outside your network (use your phone's data)
   curl http://<your-public-ip>
   ```

### Step 3: Install Required Software

Run the automated setup script:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/setup-server.sh | bash

# Or manually:
cd /opt
git clone <your-repo-url> async-boardgame-service
cd async-boardgame-service
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

The script will install:
- Docker and Docker Compose
- Nginx
- Certbot (for SSL certificates)
- Required dependencies

### Step 4: Configure the Application

1. **Copy and Edit Environment File**:
   ```bash
   cd /opt/async-boardgame-service
   cp .env.example .env
   nano .env
   ```

2. **Required Configuration**:
   ```bash
   # Database
   DB_PASSWORD=<generate-strong-password>
   
   # Application
   NODE_ENV=production
   PORT=3000
   LOG_LEVEL=info
   
   # Domain (for Clerk callbacks)
   DOMAIN=games.yourdomain.com
   
   # Authentication (if enabled)
   AUTH_ENABLED=true
   CLERK_PUBLISHABLE_KEY=pk_live_your_key
   CLERK_SECRET_KEY=sk_live_your_key
   ```

3. **Configure Web Client**:
   ```bash
   nano web-client/.env
   ```
   ```bash
   VITE_API_URL=https://games.yourdomain.com
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key
   ```

### Step 5: Set Up Nginx Reverse Proxy

1. **Run the Nginx setup script**:
   ```bash
   ./scripts/setup-nginx.sh games.yourdomain.com your@email.com
   ```

   This script will:
   - Configure Nginx as a reverse proxy
   - Obtain SSL certificate from Let's Encrypt
   - Set up automatic certificate renewal
   - Configure security headers

2. **Verify Nginx Configuration**:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

### Step 6: Deploy the Application

1. **Build and Start Services**:
   ```bash
   ./scripts/deploy.sh
   ```

   This script will:
   - Build Docker images
   - Start all services
   - Run database migrations
   - Verify health checks

2. **Verify Deployment**:
   ```bash
   # Check service status
   docker-compose ps
   
   # Check logs
   docker-compose logs -f backend
   
   # Test health endpoint
   curl https://games.yourdomain.com/health
   ```

### Step 7: Configure Clerk (if using authentication)

1. **Update Clerk Dashboard**:
   - Go to https://dashboard.clerk.com
   - Select your application
   - Go to **Configure > Domains**
   - Add your domain: `games.yourdomain.com`

2. **Configure OAuth Redirect URLs**:
   - In Clerk dashboard, go to **Configure > Social Connections**
   - For each provider, update redirect URLs:
     ```
     https://games.yourdomain.com/auth/callback
     ```

3. **Test Authentication**:
   - Visit `https://games.yourdomain.com`
   - Click "Sign In"
   - Verify OAuth flow works

### Step 8: Set Up Automated Backups

1. **Configure Backup Script**:
   ```bash
   ./scripts/setup-backups.sh
   ```

   This sets up:
   - Daily database backups
   - 7-day backup retention
   - Backup to `/opt/backups/async-boardgame-service`

2. **Test Backup**:
   ```bash
   ./scripts/backup.sh
   ls -lh /opt/backups/async-boardgame-service/
   ```

3. **Optional: Remote Backup**:
   - Set up rsync to remote server
   - Or use cloud storage (S3, Backblaze B2)

### Step 9: Set Up Monitoring

1. **Install Monitoring Script**:
   ```bash
   ./scripts/setup-monitoring.sh
   ```

   This sets up:
   - Health check monitoring
   - Automatic restart on failure
   - Email alerts (optional)
   - Log rotation

2. **View Logs**:
   ```bash
   # Application logs
   docker-compose logs -f backend
   
   # Nginx logs
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   
   # System logs
   journalctl -u docker -f
   ```

## Automated Setup (One Command)

For a fully automated setup, run:

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/full-setup.sh | bash -s -- \
  --domain games.yourdomain.com \
  --email your@email.com \
  --db-password "your-secure-password" \
  --clerk-publishable-key "pk_live_xxx" \
  --clerk-secret-key "sk_live_xxx"
```

This will:
1. Install all dependencies
2. Configure Nginx with SSL
3. Set up the application
4. Configure backups and monitoring
5. Start all services

## Maintenance

### Update Application

```bash
cd /opt/async-boardgame-service
./scripts/update.sh
```

This will:
- Pull latest code
- Rebuild Docker images
- Run database migrations
- Restart services with zero downtime

### Backup and Restore

**Manual Backup**:
```bash
./scripts/backup.sh
```

**Restore from Backup**:
```bash
./scripts/restore.sh /opt/backups/async-boardgame-service/backup-2025-11-25.sql.gz
```

### View Service Status

```bash
# Docker services
docker-compose ps

# System resources
docker stats

# Disk usage
df -h
du -sh /opt/async-boardgame-service
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Full rebuild
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Can't Access Site from Internet

1. **Check DNS**:
   ```bash
   nslookup games.yourdomain.com
   # Should return your public IP
   ```

2. **Check Port Forwarding**:
   ```bash
   # From outside your network
   curl -I http://<your-public-ip>
   ```

3. **Check Nginx**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

4. **Check Firewall**:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

### SSL Certificate Issues

1. **Check Certificate**:
   ```bash
   sudo certbot certificates
   ```

2. **Renew Certificate**:
   ```bash
   sudo certbot renew --dry-run
   sudo certbot renew
   ```

3. **Check Nginx SSL Config**:
   ```bash
   sudo nano /etc/nginx/sites-available/async-boardgame-service
   ```

### Application Not Starting

1. **Check Logs**:
   ```bash
   docker-compose logs backend
   docker-compose logs postgres
   ```

2. **Check Environment Variables**:
   ```bash
   cat .env
   ```

3. **Check Database Connection**:
   ```bash
   docker-compose exec postgres psql -U boardgame -d boardgame -c "SELECT 1;"
   ```

4. **Rebuild Containers**:
   ```bash
   docker-compose down -v
   docker-compose up -d --build
   ```

### High Memory Usage

1. **Check Resource Usage**:
   ```bash
   docker stats
   ```

2. **Adjust Docker Limits** (in docker-compose.yml):
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

3. **Restart Services**:
   ```bash
   docker-compose restart
   ```

## Security Best Practices

### 1. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 2. Fail2Ban (Prevent Brute Force)

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Updates

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Docker updates
docker-compose pull
docker-compose up -d
```

### 4. Strong Passwords

- Use password manager to generate strong passwords
- Minimum 32 characters for DB_PASSWORD
- Rotate passwords periodically

### 5. Backup Encryption

```bash
# Encrypt backups
gpg --symmetric --cipher-algo AES256 backup.sql.gz
```

### 6. Monitor Logs

```bash
# Set up log monitoring
./scripts/setup-monitoring.sh

# Review logs regularly
docker-compose logs --tail=100 backend
```

## Performance Optimization

### 1. Enable Nginx Caching

Already configured in setup script:
- Static assets cached for 1 year
- API responses cached for 5 minutes
- Gzip compression enabled

### 2. Database Optimization

```bash
# Increase connection pool
# In .env:
DB_POOL_SIZE=20
```

### 3. Docker Resource Limits

Set appropriate limits in docker-compose.yml to prevent resource exhaustion.

### 4. CDN (Optional)

For better performance, use Cloudflare:
- Free tier includes CDN and DDoS protection
- Point DNS to Cloudflare
- Cloudflare proxies to your server

## Cost Estimate

**One-Time Costs**:
- Domain name: $10-15/year
- Server hardware: $0 (using existing hardware)

**Ongoing Costs**:
- Electricity: ~$5-10/month (depends on hardware)
- Internet: $0 (using existing connection)
- SSL Certificate: $0 (Let's Encrypt is free)

**Total**: ~$10-15/year + electricity

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Clerk Documentation](https://clerk.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Open an issue on GitHub with logs and error messages
