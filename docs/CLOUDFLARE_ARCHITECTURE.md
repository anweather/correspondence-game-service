# Cloudflare + Home Server Architecture

## Overview

This document describes the architecture for hosting the Async Boardgame Service on a home server (mediabox) behind Cloudflare with a custom domain (async-boardgames.org).

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                   │
│                                                                       │
│  Users access: https://async-boardgames.org                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ DNS Resolution
                             ▼
                    ┌─────────────────────┐
                    │    Cloudflare       │
                    │   DNS + CDN + WAF   │
                    │                     │
                    │ • SSL Termination   │
                    │ • DDoS Protection   │
                    │ • CDN Caching       │
                    │ • Web Firewall      │
                    │ • Analytics         │
                    └──────────┬──────────┘
                               │
                               │ HTTPS (443) or HTTP (80)
                               │ Routes to custom ports
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        HOME NETWORK                                  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    ISP Router                               │    │
│  │                                                             │    │
│  │  Option 1: IPv6 (Recommended)                             │    │
│  │  • Direct IPv6 connectivity                               │    │
│  │  • No port forwarding needed                              │    │
│  │  • Cloudflare connects directly to mediabox IPv6         │    │
│  │                                                             │    │
│  │  Option 2: IPv4 with Port Forwarding                      │    │
│  │  • External 8080 → mediabox:8080 (HTTP)                  │    │
│  │  • External 8443 → mediabox:8443 (HTTPS)                 │    │
│  └──────────────────────┬─────────────────────────────────────┘    │
│                         │                                            │
│                         ▼                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              mediabox (Home Server)                         │    │
│  │              IPv4: 192.168.1.100 (static)                  │    │
│  │              IPv6: 2001:db8::100 (if available)            │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │  Nginx Reverse Proxy (Host Process)                  │ │    │
│  │  │                                                       │ │    │
│  │  │  Listening on:                                       │ │    │
│  │  │  • 0.0.0.0:8080 (HTTP)  - Flexible SSL              │ │    │
│  │  │  • 0.0.0.0:8443 (HTTPS) - Full SSL (recommended)    │ │    │
│  │  │                                                       │ │    │
│  │  │  ┌─────────────────────────────────────────────┐    │ │    │
│  │  │  │  SSL Configuration (Full SSL Mode)          │    │ │    │
│  │  │  │  • Cloudflare Origin Certificate            │    │ │    │
│  │  │  │  • 15-year validity                         │    │ │    │
│  │  │  │  • No renewal needed                        │    │ │    │
│  │  │  │  • TLS 1.2/1.3                             │    │ │    │
│  │  │  └─────────────────────────────────────────────┘    │ │    │
│  │  │                                                       │ │    │
│  │  │  ┌─────────────────────────────────────────────┐    │ │    │
│  │  │  │  Security Features                          │    │ │    │
│  │  │  │  • Rate limiting                            │    │ │    │
│  │  │  │  • Security headers                         │    │ │    │
│  │  │  │  • Gzip compression                         │    │ │    │
│  │  │  │  • Request logging                          │    │ │    │
│  │  │  │  • Real IP from Cloudflare                 │    │ │    │
│  │  │  └─────────────────────────────────────────────┘    │ │    │
│  │  │                                                       │ │    │
│  │  │  Proxies to → http://localhost:3000                 │ │    │
│  │  └──────────────────┬───────────────────────────────────┘ │    │
│  │                     │                                      │    │
│  │                     │ HTTP (internal)                      │    │
│  │                     ▼                                      │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │  Docker Compose Stack                                 │ │    │
│  │  │                                                        │ │    │
│  │  │  ┌──────────────────────────────────────────────┐    │ │    │
│  │  │  │  Backend Container                            │    │ │    │
│  │  │  │  • Node.js + Express                         │    │ │    │
│  │  │  │  • React Web Client (built)                  │    │ │    │
│  │  │  │  • Port: 3000                                │    │ │    │
│  │  │  │  • Health: /health                           │    │ │    │
│  │  │  └──────────────┬───────────────────────────────┘    │ │    │
│  │  │                 │                                     │ │    │
│  │  │                 │ Database connection                 │ │    │
│  │  │                 ▼                                     │ │    │
│  │  │  ┌──────────────────────────────────────────────┐    │ │    │
│  │  │  │  PostgreSQL Container                        │    │ │    │
│  │  │  │  • Port: 5432 (internal only)               │    │ │    │
│  │  │  │  • Volume: postgres-data                    │    │ │    │
│  │  │  │  • Database: boardgame                      │    │ │    │
│  │  │  └──────────────────────────────────────────────┘    │ │    │
│  │  │                                                        │ │    │
│  │  │  Docker Network: async-boardgame-network              │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │  Additional Services                                  │ │    │
│  │  │  • Fail2ban (brute force protection)                 │ │    │
│  │  │  • UFW Firewall (ports 22, 8080, 8443)              │ │    │
│  │  │  • Cron jobs (backups, monitoring)                   │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## SSL/TLS Options

### Option 1: Flexible SSL (Simplest) ⚡

```
User → [HTTPS] → Cloudflare → [HTTP] → Nginx (8080) → Docker
```

**Configuration**:
- Cloudflare SSL/TLS mode: **Flexible**
- Nginx listens on: **8080 (HTTP only)**
- No certificates needed on server

**Pros**:
- ✅ Simplest setup
- ✅ No certificate management
- ✅ Free

**Cons**:
- ⚠️ Cloudflare → Server traffic is unencrypted
- ⚠️ Less secure (but acceptable for home network)

**When to use**: Quick setup, low-security requirements

### Option 2: Full SSL with Origin Certificate (Recommended) 🔒

```
User → [HTTPS] → Cloudflare → [HTTPS] → Nginx (8443) → Docker
```

**Configuration**:
- Cloudflare SSL/TLS mode: **Full (strict)**
- Nginx listens on: **8443 (HTTPS)**
- Certificate: **Cloudflare Origin Certificate** (15-year validity)

**Pros**:
- ✅ End-to-end encryption
- ✅ Free Cloudflare Origin Certificate
- ✅ No renewal needed (15 years!)
- ✅ More secure
- ✅ Simple setup

**Cons**:
- ⚠️ Requires certificate installation (one-time, 5 minutes)

**When to use**: Production deployments, security-conscious

### Option 3: Full SSL with Let's Encrypt

```
User → [HTTPS] → Cloudflare → [HTTPS] → Nginx (8443) → Docker
```

**Configuration**:
- Cloudflare SSL/TLS mode: **Full (strict)**
- Nginx listens on: **8443 (HTTPS)**
- Certificate: **Let's Encrypt** (90-day validity, auto-renew)

**Pros**:
- ✅ End-to-end encryption
- ✅ Publicly trusted certificate
- ✅ Free

**Cons**:
- ⚠️ Requires certbot setup
- ⚠️ Auto-renewal complexity
- ⚠️ More maintenance

**When to use**: If you want publicly trusted certs (not needed with Cloudflare)

## Recommended Setup: Full SSL with Origin Certificate

This is the **best balance** of security and simplicity.

### Step-by-Step Setup

#### 1. Configure Cloudflare DNS

1. Log into Cloudflare dashboard
2. Add your domain: `async-boardgames.org`
3. Update nameservers at your registrar
4. Add DNS records:

**IPv6 (Recommended)**:
```
Type: AAAA
Name: @
Content: <your-ipv6-address>
Proxy: Enabled (orange cloud)
```

**IPv4 (Alternative)**:
```
Type: A
Name: @
Content: <your-public-ip>
Proxy: Enabled (orange cloud)
```

#### 2. Generate Cloudflare Origin Certificate

1. In Cloudflare dashboard, go to **SSL/TLS → Origin Server**
2. Click **Create Certificate**
3. Settings:
   - Private key type: **RSA (2048)**
   - Hostnames: `async-boardgames.org`, `*.async-boardgames.org`
   - Validity: **15 years**
4. Click **Create**
5. Copy both:
   - **Origin Certificate** (save as `cloudflare-origin.pem`)
   - **Private Key** (save as `cloudflare-origin-key.pem`)

#### 3. Configure Cloudflare SSL/TLS Mode

1. Go to **SSL/TLS → Overview**
2. Set mode to: **Full (strict)**
3. Go to **SSL/TLS → Edge Certificates**
4. Enable:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2

#### 4. Configure Cloudflare Origin Rules (Custom Ports)

1. Go to **Rules → Origin Rules**
2. Create rule: **Custom Ports**
3. Settings:
   ```
   If: Hostname equals async-boardgames.org
   Then:
     - Destination Port: Override to 8443
   ```

This routes Cloudflare's HTTPS (443) to your server's port 8443.

#### 5. Install Origin Certificate on Server

```bash
# Create certificate directory
sudo mkdir -p /etc/ssl/cloudflare

# Save certificates (paste content from Cloudflare)
sudo nano /etc/ssl/cloudflare/origin.pem
sudo nano /etc/ssl/cloudflare/origin-key.pem

# Set permissions
sudo chmod 644 /etc/ssl/cloudflare/origin.pem
sudo chmod 600 /etc/ssl/cloudflare/origin-key.pem
```

#### 6. Configure Nginx for Cloudflare

Run the setup script:
```bash
sudo ./scripts/setup-nginx-cloudflare.sh async-boardgames.org
```

Or manually configure (see Nginx configuration section below).

#### 7. Configure Firewall

**IPv6** (no port forwarding needed):
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8080/tcp  # HTTP (optional)
sudo ufw allow 8443/tcp  # HTTPS
sudo ufw enable
```

**IPv4** (requires port forwarding on router):
- Forward external 8080 → mediabox:8080
- Forward external 8443 → mediabox:8443

#### 8. Deploy Application

```bash
cd /opt/async-boardgame-service
./scripts/deploy.sh
```

#### 9. Test

```bash
# Test locally
curl -k https://localhost:8443/health

# Test through Cloudflare
curl https://async-boardgames.org/health
```

## Nginx Configuration

### Full SSL Configuration (Recommended)

```nginx
# /etc/nginx/sites-available/async-boardgame-service

# Cloudflare IP ranges (for real IP detection)
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# Upstream backend
upstream backend {
    server localhost:3000;
    keepalive 32;
}

# HTTP server (port 8080) - Optional, for Flexible SSL
server {
    listen 8080;
    listen [::]:8080;
    server_name async-boardgames.org;

    # Logging
    access_log /var/log/nginx/async-boardgame-access.log;
    error_log /var/log/nginx/async-boardgame-error.log;

    # Proxy to backend
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;  # Always HTTPS from user perspective
        proxy_set_header Connection "";
    }
}

# HTTPS server (port 8443) - Recommended, for Full SSL
server {
    listen 8443 ssl http2;
    listen [::]:8443 ssl http2;
    server_name async-boardgames.org;

    # Cloudflare Origin Certificate
    ssl_certificate /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/async-boardgame-access.log;
    error_log /var/log/nginx/async-boardgame-error.log;

    # Max upload size
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Static files
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## IPv6 vs IPv4 Setup

### IPv6 (Recommended) ✅

**Advantages**:
- ✅ No port forwarding needed
- ✅ Direct connectivity
- ✅ Simpler setup
- ✅ Better for multiple services
- ✅ Future-proof

**Requirements**:
- ISP provides IPv6
- Router supports IPv6
- Cloudflare can reach your IPv6 address

**Setup**:
1. Enable IPv6 on router
2. Get mediabox IPv6 address: `ip -6 addr show`
3. Add AAAA record in Cloudflare with IPv6 address
4. Configure firewall to allow ports 8080, 8443

### IPv4 with Port Forwarding

**Advantages**:
- ✅ Works with any ISP
- ✅ Widely supported

**Disadvantages**:
- ⚠️ Requires port forwarding
- ⚠️ Limited ports available
- ⚠️ More complex for multiple services

**Setup**:
1. Configure static DHCP for mediabox
2. Forward ports on router:
   - External 8080 → mediabox:8080
   - External 8443 → mediabox:8443
3. Add A record in Cloudflare with public IP
4. Configure firewall

## Cloudflare Benefits

### Security

1. **DDoS Protection**: Automatic mitigation
2. **Web Application Firewall (WAF)**: Block malicious requests
3. **Bot Protection**: Filter bot traffic
4. **Rate Limiting**: Additional layer beyond Nginx
5. **SSL/TLS**: Managed certificates

### Performance

1. **CDN**: Cache static assets globally
2. **Compression**: Brotli + Gzip
3. **HTTP/2 & HTTP/3**: Modern protocols
4. **Smart Routing**: Optimal path to origin
5. **Image Optimization**: Automatic (paid plans)

### Reliability

1. **Always Online**: Serve cached content if origin is down
2. **Load Balancing**: Multiple origins (paid plans)
3. **Health Checks**: Monitor origin status
4. **Failover**: Automatic (paid plans)

### Analytics

1. **Traffic Analytics**: Requests, bandwidth, threats
2. **Performance Metrics**: Response times, cache hit rate
3. **Security Events**: Blocked requests, threats
4. **Visitor Insights**: Geographic distribution

## Cloudflare Configuration Checklist

### DNS Settings
- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] A or AAAA record created
- [ ] Proxy enabled (orange cloud)

### SSL/TLS Settings
- [ ] SSL/TLS mode: Full (strict)
- [ ] Origin certificate generated and installed
- [ ] Always Use HTTPS: Enabled
- [ ] Minimum TLS Version: 1.2
- [ ] Automatic HTTPS Rewrites: Enabled

### Origin Rules
- [ ] Custom port rule created (443 → 8443)

### Firewall Rules (Optional)
- [ ] Block countries (if needed)
- [ ] Challenge suspicious traffic
- [ ] Allow known good IPs

### Page Rules (Optional)
- [ ] Cache static assets
- [ ] Browser cache TTL
- [ ] Security level

### Speed Settings
- [ ] Auto Minify: HTML, CSS, JS
- [ ] Brotli compression: Enabled
- [ ] HTTP/2: Enabled
- [ ] HTTP/3: Enabled

## Security Considerations

### Cloudflare as Security Layer

**What Cloudflare Protects**:
- ✅ DDoS attacks
- ✅ SQL injection attempts
- ✅ XSS attacks
- ✅ Bot traffic
- ✅ Brute force (with rate limiting)

**What You Still Need**:
- ✅ Firewall on server (UFW)
- ✅ Fail2ban for SSH
- ✅ Application-level security
- ✅ Database security
- ✅ Regular updates

### Restricting Access to Cloudflare Only

For maximum security, only allow Cloudflare IPs to reach your server:

```bash
# Allow only Cloudflare IPs
sudo ufw default deny incoming
sudo ufw allow 22/tcp  # SSH

# Cloudflare IPv4 ranges
sudo ufw allow from 173.245.48.0/20 to any port 8443
sudo ufw allow from 103.21.244.0/22 to any port 8443
# ... (add all Cloudflare ranges)

# Or use a script
curl https://www.cloudflare.com/ips-v4 | while read ip; do
    sudo ufw allow from $ip to any port 8443
done
```

## Troubleshooting

### Can't Access Site

1. **Check Cloudflare DNS**:
   ```bash
   nslookup async-boardgames.org
   dig async-boardgames.org
   ```

2. **Check Cloudflare Proxy**:
   - Ensure orange cloud is enabled in DNS settings

3. **Check Origin Rules**:
   - Verify port 8443 is configured

4. **Check Server**:
   ```bash
   # Test Nginx locally
   curl -k https://localhost:8443/health
   
   # Check Nginx status
   sudo systemctl status nginx
   
   # Check firewall
   sudo ufw status
   ```

### SSL Errors

1. **Check SSL/TLS Mode**: Should be "Full (strict)"
2. **Check Origin Certificate**: Verify it's installed correctly
3. **Check Certificate Validity**:
   ```bash
   openssl x509 -in /etc/ssl/cloudflare/origin.pem -text -noout
   ```

### Real IP Not Showing

1. **Check Cloudflare IP Ranges**: Update Nginx config with latest ranges
2. **Check Header**: Verify `CF-Connecting-IP` header is set
3. **Test**:
   ```bash
   curl -H "CF-Connecting-IP: 1.2.3.4" https://async-boardgames.org/api/test
   ```

## Cost Analysis

### Cloudflare Free Tier

**Included**:
- ✅ Unlimited bandwidth
- ✅ DDoS protection
- ✅ SSL certificates
- ✅ CDN (global)
- ✅ DNS management
- ✅ Basic analytics
- ✅ Page rules (3)

**Cost**: **$0/month**

### Domain Registration

- **Cost**: $10-15/year (from registrar)

### Total Cost

**Annual**: $10-15 (domain only)  
**Monthly**: ~$1-2 + electricity

## Summary

This Cloudflare-based architecture provides:

✅ **Professional**: Enterprise-grade CDN and security  
✅ **Secure**: DDoS protection, WAF, SSL/TLS  
✅ **Fast**: Global CDN, compression, HTTP/3  
✅ **Reliable**: 100% uptime SLA (paid plans)  
✅ **Simple**: No Let's Encrypt renewal needed  
✅ **Cost-Effective**: Free tier is generous  
✅ **Scalable**: Handles traffic spikes automatically  

**Recommended Configuration**:
- SSL/TLS Mode: **Full (strict)**
- Certificate: **Cloudflare Origin Certificate**
- Nginx Ports: **8443 (HTTPS)**
- Connectivity: **IPv6** (if available)
