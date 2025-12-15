#!/bin/bash

# Deployment script for nginx configuration on production server
# Sets up maintenance page functionality for system-installed nginx

set -e

echo "🚀 Deploying Nginx Configuration for Async Boardgame Service"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Update these for your server
NGINX_HTML_DIR="/var/www/html"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SITE_NAME="async-boardgames"
DOMAIN="async-boardgames.org"
BACKEND_PORT="3001"

# Function to prompt for confirmation
confirm() {
    local message=$1
    echo -n -e "${YELLOW}$message (y/N): ${NC}"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to update domain in config (not needed since domain is already set)
update_domain() {
    local config_file=$1
    local domain=$2
    
    echo "Domain already configured as $domain in nginx.conf"
}

echo
echo -e "${BLUE}Prerequisites Check:${NC}"
echo "==================="

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script needs sudo privileges"
    echo "Please run with: sudo $0"
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗${NC} nginx is not installed"
    echo "Please install nginx first:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install nginx"
    echo "  CentOS/RHEL: sudo yum install nginx"
    exit 1
fi

echo -e "${GREEN}✓${NC} nginx is installed"
echo -e "${GREEN}✓${NC} Running with sudo privileges"

# Check if required files exist
if [ ! -f "nginx/nginx.conf" ]; then
    echo -e "${RED}✗${NC} nginx/nginx.conf not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

if [ ! -f "nginx/static/maintenance.html" ]; then
    echo -e "${RED}✗${NC} nginx/static/maintenance.html not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${GREEN}✓${NC} Required files found"

echo
echo -e "${BLUE}Configuration:${NC}"
echo "=============="
echo "Domain: $DOMAIN"
echo "Backend Port: $BACKEND_PORT"
echo "Nginx HTML Dir: $NGINX_HTML_DIR"
echo "Site Name: $SITE_NAME"

# Domain is already properly configured for async-boardgames.org

echo
if ! confirm "Proceed with nginx deployment?"; then
    echo "Deployment cancelled"
    exit 0
fi

echo
echo -e "${BLUE}1. Backing up existing configuration...${NC}"

# Create backup directory
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing default site if it exists
if [ -f "$NGINX_ENABLED_DIR/default" ]; then
    echo "Backing up existing default site..."
    cp "$NGINX_ENABLED_DIR/default" "$BACKUP_DIR/"
fi

# Backup existing boardgame site if it exists
if [ -f "$NGINX_CONFIG_DIR/$SITE_NAME" ]; then
    echo "Backing up existing $SITE_NAME site..."
    cp "$NGINX_CONFIG_DIR/$SITE_NAME" "$BACKUP_DIR/"
fi

echo -e "${GREEN}✓${NC} Backups created in $BACKUP_DIR"

echo
echo -e "${BLUE}2. Installing maintenance page...${NC}"

# Create nginx html directory if it doesn't exist
mkdir -p "$NGINX_HTML_DIR"

# Copy maintenance page
echo "Copying maintenance page to $NGINX_HTML_DIR..."
cp nginx/static/maintenance.html "$NGINX_HTML_DIR/"
chmod 644 "$NGINX_HTML_DIR/maintenance.html"

echo -e "${GREEN}✓${NC} Maintenance page installed"

echo
echo -e "${BLUE}3. Installing nginx configuration...${NC}"

# Copy nginx config to sites-available
echo "Installing nginx configuration..."
cp nginx/nginx.conf "$NGINX_CONFIG_DIR/$SITE_NAME"

# Update domain in config
update_domain "$NGINX_CONFIG_DIR/$SITE_NAME" "$DOMAIN"

# Set proper permissions
chmod 644 "$NGINX_CONFIG_DIR/$SITE_NAME"

echo -e "${GREEN}✓${NC} Configuration file installed"

echo
echo -e "${BLUE}4. Enabling site...${NC}"

# Disable default site if it exists and we're not using localhost
if [ "$DOMAIN" != "localhost" ] && [ -L "$NGINX_ENABLED_DIR/default" ]; then
    echo "Disabling default nginx site..."
    rm -f "$NGINX_ENABLED_DIR/default"
fi

# Enable our site
echo "Enabling $SITE_NAME site..."
ln -sf "$NGINX_CONFIG_DIR/$SITE_NAME" "$NGINX_ENABLED_DIR/$SITE_NAME"

echo -e "${GREEN}✓${NC} Site enabled"

echo
echo -e "${BLUE}5. Testing configuration...${NC}"

# Test nginx configuration
echo "Testing nginx configuration..."
if nginx -t; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "${RED}✗${NC} Nginx configuration is invalid"
    echo "Rolling back changes..."
    
    # Remove our config
    rm -f "$NGINX_ENABLED_DIR/$SITE_NAME"
    rm -f "$NGINX_CONFIG_DIR/$SITE_NAME"
    
    # Restore default if we disabled it
    if [ "$DOMAIN" != "localhost" ] && [ -f "$BACKUP_DIR/default" ]; then
        ln -sf "$NGINX_CONFIG_DIR/default" "$NGINX_ENABLED_DIR/default"
    fi
    
    exit 1
fi

echo
echo -e "${BLUE}6. Reloading nginx...${NC}"

# Reload nginx
echo "Reloading nginx..."
if systemctl reload nginx; then
    echo -e "${GREEN}✓${NC} Nginx reloaded successfully"
else
    echo -e "${RED}✗${NC} Failed to reload nginx"
    exit 1
fi

echo
echo -e "${GREEN}✅ Nginx deployment completed successfully!${NC}"
echo
echo -e "${BLUE}Configuration Summary:${NC}"
echo "====================="
echo "Site Name: $SITE_NAME"
echo "Domain: $DOMAIN"
echo "Config File: $NGINX_CONFIG_DIR/$SITE_NAME"
echo "Maintenance Page: $NGINX_HTML_DIR/maintenance.html"
echo "Backup Location: $BACKUP_DIR"
echo
echo -e "${BLUE}Testing:${NC}"
echo "========"
echo "1. Check nginx status: sudo systemctl status nginx"
echo "2. Test configuration: sudo nginx -t"
echo "3. View access logs: sudo tail -f /var/log/nginx/access.log"
echo "4. View error logs: sudo tail -f /var/log/nginx/error.log"
echo
echo -e "${BLUE}URLs to test:${NC}"
echo "============="
echo "- Main site: http://$DOMAIN/"
echo "- Health check: http://$DOMAIN/health"
echo "- API: http://$DOMAIN/api/games"
echo
echo -e "${BLUE}Maintenance Mode:${NC}"
echo "================="
echo "When your backend (port $BACKEND_PORT) is down, nginx will automatically"
echo "serve the maintenance page with HTTP 503 status."
echo
echo -e "${BLUE}To test maintenance mode:${NC}"
echo "========================="
echo "1. Stop your backend application"
echo "2. Visit http://$DOMAIN/ - should show maintenance page"
echo "3. Start your backend application"
echo "4. Visit http://$DOMAIN/ - should show normal application"
echo
echo -e "${YELLOW}Note:${NC} Make sure your backend application is running on port $BACKEND_PORT"
echo "for the proxy configuration to work properly."