#!/bin/bash

# Quick script to update nginx configuration on production server
# This script updates your existing nginx config to add maintenance page functionality

set -e

echo "🔄 Updating Production Nginx Configuration"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NGINX_HTML_DIR="/var/www/html"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SITE_NAME="async-boardgames"
DOMAIN="async-boardgames.org"

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
echo -e "${BLUE}Current Configuration:${NC}"
echo "====================="
echo "Domain: $DOMAIN"
echo "Site Name: $SITE_NAME"
echo "Nginx HTML Dir: $NGINX_HTML_DIR"

echo
echo "This will:"
echo "1. Backup your current nginx configuration"
echo "2. Install the maintenance page to $NGINX_HTML_DIR"
echo "3. Update your nginx configuration with maintenance page support"
echo "4. Test and reload nginx"

if ! confirm "Proceed with nginx update?"; then
    echo "Update cancelled"
    exit 0
fi

echo
echo -e "${BLUE}1. Creating backup...${NC}"

# Create backup directory
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing config if it exists
if [ -f "$NGINX_CONFIG_DIR/$SITE_NAME" ]; then
    echo "Backing up existing $SITE_NAME configuration..."
    cp "$NGINX_CONFIG_DIR/$SITE_NAME" "$BACKUP_DIR/"
    echo -e "${GREEN}✓${NC} Backup created: $BACKUP_DIR/$SITE_NAME"
else
    echo -e "${YELLOW}⚠${NC} No existing configuration found at $NGINX_CONFIG_DIR/$SITE_NAME"
fi

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
echo -e "${BLUE}3. Updating nginx configuration...${NC}"

# Copy nginx config to sites-available
echo "Installing updated nginx configuration..."
cp nginx/nginx.conf "$NGINX_CONFIG_DIR/$SITE_NAME"

# Set proper permissions
chmod 644 "$NGINX_CONFIG_DIR/$SITE_NAME"

echo -e "${GREEN}✓${NC} Configuration file updated"

echo
echo -e "${BLUE}4. Testing configuration...${NC}"

# Test nginx configuration
echo "Testing nginx configuration..."
if nginx -t; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "${RED}✗${NC} Nginx configuration is invalid"
    echo "Rolling back changes..."
    
    # Restore backup if it exists
    if [ -f "$BACKUP_DIR/$SITE_NAME" ]; then
        cp "$BACKUP_DIR/$SITE_NAME" "$NGINX_CONFIG_DIR/$SITE_NAME"
        echo "Configuration restored from backup"
    fi
    
    exit 1
fi

echo
echo -e "${BLUE}5. Reloading nginx...${NC}"

# Reload nginx
echo "Reloading nginx..."
if systemctl reload nginx; then
    echo -e "${GREEN}✓${NC} Nginx reloaded successfully"
else
    echo -e "${RED}✗${NC} Failed to reload nginx"
    
    # Restore backup if it exists
    if [ -f "$BACKUP_DIR/$SITE_NAME" ]; then
        cp "$BACKUP_DIR/$SITE_NAME" "$NGINX_CONFIG_DIR/$SITE_NAME"
        systemctl reload nginx
        echo "Configuration restored from backup"
    fi
    
    exit 1
fi

echo
echo -e "${GREEN}✅ Nginx configuration updated successfully!${NC}"
echo
echo -e "${BLUE}What's New:${NC}"
echo "==========="
echo "✓ Automatic maintenance page when backend is down"
echo "✓ Maintenance page serves HTTP 503 status"
echo "✓ Health check endpoint works independently of backend"
echo "✓ All your existing Cloudflare and SSL configuration preserved"
echo
echo -e "${BLUE}Testing:${NC}"
echo "========"
echo "1. Your site should work normally: https://$DOMAIN:8443/"
echo "2. Stop your backend to test maintenance page"
echo "3. Health check: https://$DOMAIN:8443/health"
echo
echo -e "${BLUE}Files:${NC}"
echo "======"
echo "- Configuration: $NGINX_CONFIG_DIR/$SITE_NAME"
echo "- Maintenance page: $NGINX_HTML_DIR/maintenance.html"
echo "- Backup: $BACKUP_DIR/$SITE_NAME"
echo
echo -e "${BLUE}To test maintenance mode:${NC}"
echo "========================"
echo "1. Stop your backend: sudo systemctl stop your-backend-service"
echo "2. Visit https://$DOMAIN:8443/ - should show maintenance page"
echo "3. Start your backend: sudo systemctl start your-backend-service"
echo "4. Visit https://$DOMAIN:8443/ - should show normal application"
echo
echo -e "${YELLOW}Note:${NC} The maintenance page will automatically appear whenever"
echo "your backend on port 3001 is unreachable. No manual intervention needed!"