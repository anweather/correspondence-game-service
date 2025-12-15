#!/bin/bash

# Test script for maintenance page functionality
# This script demonstrates how the maintenance page works when the backend is down
# For system-installed nginx (not Docker)

set -e

echo "🧪 Testing Maintenance Page Functionality (System Nginx)"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3001
NGINX_HTML_DIR="/var/www/html"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
DOMAIN="async-boardgames.org"
HTTP_PORT=8080
HTTPS_PORT=8443

# Function to check if service is running
check_service() {
    local service=$1
    local port=$2
    
    if [ "$service" = "nginx" ]; then
        if systemctl is-active --quiet nginx; then
            echo -e "${GREEN}✓${NC} nginx is running"
            return 0
        else
            echo -e "${RED}✗${NC} nginx is not running"
            return 1
        fi
    elif [ "$service" = "backend" ]; then
        if lsof -i:$port > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} backend is running on port $port"
            return 0
        else
            echo -e "${RED}✗${NC} backend is not running on port $port"
            return 1
        fi
    fi
}

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $status)"
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $status, expected $expected_status)"
        return 1
    fi
}

# Function to get backend PID
get_backend_pid() {
    lsof -ti:$BACKEND_PORT 2>/dev/null || echo ""
}

echo
echo -e "${BLUE}Prerequisites Check:${NC}"
echo "==================="

# Check if running as root/sudo for nginx operations
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠${NC} This script needs sudo privileges for nginx operations"
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

echo
echo -e "${BLUE}1. Setting up nginx configuration...${NC}"

# Copy maintenance page to nginx html directory
echo "Copying maintenance page to $NGINX_HTML_DIR..."
cp nginx/static/maintenance.html $NGINX_HTML_DIR/

# Backup existing nginx config if it exists
if [ -f "$NGINX_ENABLED_DIR/default" ]; then
    echo "Backing up existing nginx config..."
    cp "$NGINX_ENABLED_DIR/default" "$NGINX_ENABLED_DIR/default.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copy our nginx config
echo "Installing nginx configuration..."
cp nginx/nginx.conf "$NGINX_CONFIG_DIR/async-boardgames"

# Enable the site
ln -sf "$NGINX_CONFIG_DIR/async-boardgames" "$NGINX_ENABLED_DIR/async-boardgames"

# Test nginx configuration
echo "Testing nginx configuration..."
if nginx -t; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "${RED}✗${NC} Nginx configuration is invalid"
    exit 1
fi

# Reload nginx
echo "Reloading nginx..."
systemctl reload nginx

echo
echo -e "${BLUE}2. Checking service status...${NC}"
check_service nginx
check_service backend $BACKEND_PORT

echo
echo -e "${BLUE}3. Testing normal operation...${NC}"
test_endpoint "http://$DOMAIN:$HTTP_PORT/health" "200" "Health check through nginx (HTTP)"
test_endpoint "https://$DOMAIN:$HTTPS_PORT/health" "200" "Health check through nginx (HTTPS)"

# Only test main app if backend is running
if check_service backend $BACKEND_PORT > /dev/null 2>&1; then
    test_endpoint "http://$DOMAIN:$HTTP_PORT/" "200" "Main application through nginx (HTTP)"
    test_endpoint "https://$DOMAIN:$HTTPS_PORT/" "200" "Main application through nginx (HTTPS)"
else
    echo -e "${YELLOW}⚠${NC} Backend not running, skipping main app test"
fi

echo
echo -e "${BLUE}4. Testing maintenance page functionality...${NC}"

# Get backend PID if running
BACKEND_PID=$(get_backend_pid)

if [ -n "$BACKEND_PID" ]; then
    echo "Backend is running (PID: $BACKEND_PID)"
    echo "Stopping backend to test maintenance page..."
    
    # Stop the backend process
    kill $BACKEND_PID
    
    echo "Waiting for nginx to detect backend failure..."
    sleep 5
    
    echo "Testing maintenance page activation..."
    test_endpoint "http://$DOMAIN:$HTTP_PORT/" "503" "Maintenance page when backend is down (HTTP)"
    test_endpoint "https://$DOMAIN:$HTTPS_PORT/" "503" "Maintenance page when backend is down (HTTPS)"
    test_endpoint "http://$DOMAIN:$HTTP_PORT/api/games" "503" "API endpoints when backend is down (HTTP)"
    test_endpoint "https://$DOMAIN:$HTTPS_PORT/api/games" "503" "API endpoints when backend is down (HTTPS)"
    
    # Check if maintenance page is actually served
    echo
    echo "Verifying maintenance page content..."
    response=$(curl -s http://$DOMAIN:$HTTP_PORT/)
    if echo "$response" | grep -q "Service Temporarily Unavailable"; then
        echo -e "${GREEN}✓${NC} Maintenance page is being served correctly"
    else
        echo -e "${RED}✗${NC} Maintenance page content not found"
    fi
    
    echo
    echo "Testing health check (should still work)..."
    test_endpoint "http://$DOMAIN:$HTTP_PORT/health" "200" "Nginx health check (independent of backend - HTTP)"
    test_endpoint "https://$DOMAIN:$HTTPS_PORT/health" "200" "Nginx health check (independent of backend - HTTPS)"
    
    echo
    echo -e "${YELLOW}Note:${NC} Backend was stopped for testing. You'll need to restart it manually:"
    echo "  cd /path/to/your/app && npm start"
    
else
    echo -e "${YELLOW}⚠${NC} Backend is not running, testing maintenance page directly..."
    test_endpoint "http://$DOMAIN:$HTTP_PORT/" "503" "Maintenance page when backend is down (HTTP)"
    test_endpoint "https://$DOMAIN:$HTTPS_PORT/" "503" "Maintenance page when backend is down (HTTPS)"
    test_endpoint "http://$DOMAIN:$HTTP_PORT/api/games" "503" "API endpoints when backend is down (HTTP)"
    test_endpoint "https://$DOMAIN:$HTTPS_PORT/api/games" "503" "API endpoints when backend is down (HTTPS)"
    
    # Check if maintenance page is actually served
    echo
    echo "Verifying maintenance page content..."
    response=$(curl -s http://$DOMAIN:$HTTP_PORT/)
    if echo "$response" | grep -q "Service Temporarily Unavailable"; then
        echo -e "${GREEN}✓${NC} Maintenance page is being served correctly"
    else
        echo -e "${RED}✗${NC} Maintenance page content not found"
    fi
fi

echo
echo -e "${GREEN}✅ Maintenance page testing completed!${NC}"
echo
echo -e "${BLUE}Summary:${NC}"
echo "- ✓ Nginx configuration installed and validated"
echo "- ✓ Maintenance page copied to nginx html directory"
echo "- ✓ Nginx serves maintenance page when backend is down"
echo "- ✓ Nginx health check works independently"
echo
echo -e "${BLUE}Manual testing:${NC}"
echo "  - http://$DOMAIN:$HTTP_PORT/ (main application or maintenance page)"
echo "  - https://$DOMAIN:$HTTPS_PORT/ (main application or maintenance page)"
echo "  - http://$DOMAIN:$HTTP_PORT/health (nginx health check)"
echo "  - https://$DOMAIN:$HTTPS_PORT/health (nginx health check)"
echo
echo -e "${BLUE}Configuration files:${NC}"
echo "  - Nginx config: $NGINX_CONFIG_DIR/async-boardgames"
echo "  - Maintenance page: $NGINX_HTML_DIR/maintenance.html"
echo
echo -e "${BLUE}To manage the service:${NC}"
echo "  - Test nginx config: sudo nginx -t"
echo "  - Reload nginx: sudo systemctl reload nginx"
echo "  - Check nginx status: sudo systemctl status nginx"
echo "  - View nginx logs: sudo tail -f /var/log/nginx/access.log"