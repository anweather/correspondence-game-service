#!/bin/bash

# =============================================================================
# Nginx Setup Script for Cloudflare
# =============================================================================
# This script configures Nginx as a reverse proxy behind Cloudflare
#
# Usage: ./scripts/setup-nginx-cloudflare.sh <domain> [ssl-mode]
# Example: ./scripts/setup-nginx-cloudflare.sh async-boardgames.org full
#
# SSL Modes:
#   flexible - HTTP only (port 8080)
#   full     - HTTPS with Cloudflare Origin Certificate (port 8443) [default]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <domain> [ssl-mode]"
    log_error "Example: $0 async-boardgames.org full"
    log_error ""
    log_error "SSL Modes:"
    log_error "  flexible - HTTP only (port 8080)"
    log_error "  full     - HTTPS with Origin Certificate (port 8443) [default]"
    exit 1
fi

DOMAIN=$1
SSL_MODE=${2:-full}
BACKEND_PORT=3000

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

log_info "Setting up Nginx for Cloudflare"
log_info "Domain: $DOMAIN"
log_info "SSL Mode: $SSL_MODE"

# Validate SSL mode
if [ "$SSL_MODE" != "flexible" ] && [ "$SSL_MODE" != "full" ]; then
    log_error "Invalid SSL mode: $SSL_MODE"
    log_error "Must be 'flexible' or 'full'"
    exit 1
fi

# Check for Origin Certificate if using full SSL
if [ "$SSL_MODE" = "full" ]; then
    if [ ! -f /etc/ssl/cloudflare/origin.pem ] || [ ! -f /etc/ssl/cloudflare/origin-key.pem ]; then
        log_error "Cloudflare Origin Certificate not found!"
        log_error ""
        log_error "Please install the certificate first:"
        log_error "1. Go to Cloudflare Dashboard → SSL/TLS → Origin Server"
        log_error "2. Create Certificate (15-year validity)"
        log_error "3. Save certificate to: /etc/ssl/cloudflare/origin.pem"
        log_error "4. Save private key to: /etc/ssl/cloudflare/origin-key.pem"
        log_error ""
        log_error "Then run this script again."
        exit 1
    fi
    log_info "Found Cloudflare Origin Certificate"
fi

# Create Nginx configuration
log_step "Creating Nginx configuration..."

cat > /etc/nginx/sites-available/async-boardgame-service << 'NGINX_CONFIG_EOF'
# Async Boardgame Service - Nginx Configuration for Cloudflare
# Domain: DOMAIN_PLACEHOLDER

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
    server localhost:BACKEND_PORT_PLACEHOLDER;
    keepalive 32;
}

NGINX_CONFIG_EOF

# Add HTTP server (port 8080) for Flexible SSL or as fallback
cat >> /etc/nginx/sites-available/async-boardgame-service << 'NGINX_CONFIG_EOF'
# HTTP server (port 8080)
server {
    listen 8080;
    listen [::]:8080;
    server_name DOMAIN_PLACEHOLDER;

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
        proxy_set_header X-Forwarded-Proto https;  # Always HTTPS from user perspective
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
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
        proxy_set_header X-Forwarded-Proto https;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

NGINX_CONFIG_EOF

# Add HTTPS server (port 8443) for Full SSL
if [ "$SSL_MODE" = "full" ]; then
    cat >> /etc/nginx/sites-available/async-boardgame-service << 'NGINX_CONFIG_EOF'
# HTTPS server (port 8443) - Full SSL with Cloudflare Origin Certificate
server {
    listen 8443 ssl http2;
    listen [::]:8443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

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
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
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
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

NGINX_CONFIG_EOF
fi

# Replace placeholders
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/async-boardgame-service
sed -i "s/BACKEND_PORT_PLACEHOLDER/$BACKEND_PORT/g" /etc/nginx/sites-available/async-boardgame-service

# Enable site
log_step "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/async-boardgame-service /etc/nginx/sites-enabled/

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
log_step "Testing Nginx configuration..."
nginx -t

# Reload Nginx
log_step "Reloading Nginx..."
systemctl reload nginx

log_info ""
log_info "=========================================="
log_info "Nginx Setup Complete!"
log_info "=========================================="
log_info ""
log_info "Configuration:"
log_info "  Domain: $DOMAIN"
log_info "  SSL Mode: $SSL_MODE"
if [ "$SSL_MODE" = "flexible" ]; then
    log_info "  Listening on: 8080 (HTTP)"
else
    log_info "  Listening on: 8080 (HTTP), 8443 (HTTPS)"
fi
log_info ""
log_info "Next steps:"
log_info ""
log_info "1. Configure Cloudflare:"
log_info "   - SSL/TLS mode: $([ "$SSL_MODE" = "flexible" ] && echo "Flexible" || echo "Full (strict)")"
log_info "   - Origin Rules: 443 → $([ "$SSL_MODE" = "flexible" ] && echo "8080" || echo "8443")"
log_info "   - DNS: A/AAAA record with proxy enabled (orange cloud)"
log_info ""
log_info "2. Configure firewall:"
log_info "   sudo ufw allow 8080/tcp"
if [ "$SSL_MODE" = "full" ]; then
    log_info "   sudo ufw allow 8443/tcp"
fi
log_info ""
log_info "3. Test locally:"
if [ "$SSL_MODE" = "flexible" ]; then
    log_info "   curl http://localhost:8080/health"
else
    log_info "   curl -k https://localhost:8443/health"
fi
log_info ""
log_info "4. Deploy application:"
log_info "   ./scripts/deploy.sh"
log_info ""
log_info "5. Test through Cloudflare:"
log_info "   curl https://$DOMAIN/health"
log_info ""
