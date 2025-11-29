#!/bin/bash

# =============================================================================
# Nginx Cloudflare Origin Setup Script (Test Page)
# =============================================================================
# This script sets up Nginx to serve a test page on ports 8080 and 8443
# for Cloudflare origin certificate testing
#
# Usage: sudo ./scripts/setup-nginx-cloudflare-test.sh
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

log_info "=========================================="
log_info "Nginx Cloudflare Origin Setup"
log_info "=========================================="
log_info ""

# Step 1: Install Nginx if not installed
log_step "1/6 Checking Nginx installation..."
if ! command -v nginx &> /dev/null; then
    log_info "Installing Nginx..."
    apt update
    apt install -y nginx
else
    log_info "Nginx already installed"
fi

# Step 2: Create SSL directory
log_step "2/6 Creating SSL directory..."
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl

# Step 3: Create static content directory
log_step "3/6 Setting up static content..."
mkdir -p /var/www/async-boardgame-test
cp "$PROJECT_DIR/nginx/static/index.html" /var/www/async-boardgame-test/
chmod 755 /var/www/async-boardgame-test
chmod 644 /var/www/async-boardgame-test/index.html

# Step 4: Copy Nginx configuration
log_step "4/6 Installing Nginx configuration..."
cp "$PROJECT_DIR/nginx/cloudflare-origin.conf" /etc/nginx/sites-available/cloudflare-origin

# Enable the site
ln -sf /etc/nginx/sites-available/cloudflare-origin /etc/nginx/sites-enabled/

# Disable default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    log_info "Disabled default Nginx site"
fi

# Step 5: Create placeholder SSL certificates (self-signed for testing)
log_step "5/6 Creating placeholder SSL certificates..."
if [ ! -f /etc/nginx/ssl/cloudflare-origin.pem ]; then
    log_warn "Creating self-signed certificate for testing..."
    log_warn "Replace with Cloudflare Origin Certificate for production!"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/cloudflare-origin.key \
        -out /etc/nginx/ssl/cloudflare-origin.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=test.local" \
        2>/dev/null
    
    chmod 600 /etc/nginx/ssl/cloudflare-origin.key
    chmod 644 /etc/nginx/ssl/cloudflare-origin.pem
    
    log_info "Self-signed certificate created"
else
    log_info "SSL certificates already exist"
fi

# Step 6: Test and reload Nginx
log_step "6/6 Testing Nginx configuration..."
if nginx -t; then
    log_info "Nginx configuration is valid"
    systemctl reload nginx
    log_info "Nginx reloaded successfully"
else
    log_error "Nginx configuration test failed!"
    exit 1
fi

# Display status
log_info ""
log_info "=========================================="
log_info "Setup Complete!"
log_info "=========================================="
log_info ""
log_info "Test your setup:"
log_info "  HTTP:  curl http://localhost:8080"
log_info "  HTTPS: curl -k https://localhost:8443"
log_info ""
log_info "Next steps:"
log_info "  1. Get Cloudflare Origin Certificate:"
log_info "     - Go to Cloudflare Dashboard"
log_info "     - SSL/TLS > Origin Server"
log_info "     - Create Certificate"
log_info ""
log_info "  2. Replace placeholder certificates:"
log_info "     sudo nano /etc/nginx/ssl/cloudflare-origin.pem"
log_info "     sudo nano /etc/nginx/ssl/cloudflare-origin.key"
log_info ""
log_info "  3. Reload Nginx:"
log_info "     sudo systemctl reload nginx"
log_info ""
log_info "  4. Configure Cloudflare:"
log_info "     - Set SSL/TLS mode to 'Full (strict)'"
log_info "     - Point your domain to this server"
log_info ""
log_info "  5. Test from internet:"
log_info "     https://yourdomain.com"
log_info ""
log_info "Ports in use:"
log_info "  - 8080: HTTP (test page)"
log_info "  - 8443: HTTPS (test page with SSL)"
log_info ""
