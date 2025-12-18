#!/bin/bash

# Test WebSocket connection to production server
# This script helps debug WebSocket connection issues

set -e

echo "🔍 Testing WebSocket Connection"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="async-boardgames.org"
WWW_DOMAIN="www.async-boardgames.org"
HTTP_PORT=8080
HTTPS_PORT=8443

# Test token (you'll need to replace this with a real token)
TEST_TOKEN="your-jwt-token-here"

echo -e "${BLUE}Testing WebSocket connectivity...${NC}"
echo

# Function to test HTTP endpoint
test_http() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $status)"
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $status)"
        return 1
    fi
}

# Function to test WebSocket (using curl to check if endpoint exists)
test_websocket_endpoint() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    # Use curl to test if the endpoint responds (even if it's not a proper WebSocket handshake)
    response=$(curl -s -I -H "Connection: Upgrade" -H "Upgrade: websocket" "$url" 2>&1 || echo "failed")
    
    if echo "$response" | grep -q "101\|400\|426"; then
        echo -e "${GREEN}✓${NC} (WebSocket endpoint responding)"
        return 0
    elif echo "$response" | grep -q "404"; then
        echo -e "${RED}✗${NC} (404 Not Found - endpoint missing)"
        return 1
    elif echo "$response" | grep -q "502\|503\|504"; then
        echo -e "${YELLOW}⚠${NC} (Backend unavailable)"
        return 1
    else
        echo -e "${RED}✗${NC} (Connection failed)"
        echo "Response: $response"
        return 1
    fi
}

echo -e "${BLUE}1. Testing HTTP endpoints:${NC}"
test_http "http://$DOMAIN:$HTTP_PORT/health" "HTTP health check (no www)"
test_http "http://$WWW_DOMAIN:$HTTP_PORT/health" "HTTP health check (with www)"
test_http "https://$DOMAIN:$HTTPS_PORT/health" "HTTPS health check (no www)"
test_http "https://$WWW_DOMAIN:$HTTPS_PORT/health" "HTTPS health check (with www)"

echo
echo -e "${BLUE}2. Testing WebSocket endpoints:${NC}"
test_websocket_endpoint "http://$DOMAIN:$HTTP_PORT/api/ws" "HTTP WebSocket endpoint (no www)"
test_websocket_endpoint "http://$WWW_DOMAIN:$HTTP_PORT/api/ws" "HTTP WebSocket endpoint (with www)"
test_websocket_endpoint "https://$DOMAIN:$HTTPS_PORT/api/ws" "HTTPS WebSocket endpoint (no www)"
test_websocket_endpoint "https://$WWW_DOMAIN:$HTTPS_PORT/api/ws" "HTTPS WebSocket endpoint (with www)"

echo
echo -e "${BLUE}3. Testing through Cloudflare (default ports):${NC}"
test_http "https://$DOMAIN/health" "HTTPS health check via Cloudflare (no www)"
test_http "https://$WWW_DOMAIN/health" "HTTPS health check via Cloudflare (with www)"
test_websocket_endpoint "https://$DOMAIN/api/ws" "HTTPS WebSocket via Cloudflare (no www)"
test_websocket_endpoint "https://$WWW_DOMAIN/api/ws" "HTTPS WebSocket via Cloudflare (with www)"

echo
echo -e "${BLUE}4. Nginx configuration check:${NC}"
if [ -f "/etc/nginx/sites-available/async-boardgames" ]; then
    echo -e "${GREEN}✓${NC} Nginx config file exists"
    
    if grep -q "server_name.*www.async-boardgames.org" /etc/nginx/sites-available/async-boardgames; then
        echo -e "${GREEN}✓${NC} Nginx configured for www subdomain"
    else
        echo -e "${YELLOW}⚠${NC} Nginx might not be configured for www subdomain"
    fi
    
    if grep -q "location /api/ws" /etc/nginx/sites-available/async-boardgames; then
        echo -e "${GREEN}✓${NC} WebSocket location block found"
    else
        echo -e "${RED}✗${NC} WebSocket location block missing"
    fi
    
    if grep -q "proxy_set_header Upgrade" /etc/nginx/sites-available/async-boardgames; then
        echo -e "${GREEN}✓${NC} WebSocket upgrade headers configured"
    else
        echo -e "${RED}✗${NC} WebSocket upgrade headers missing"
    fi
else
    echo -e "${RED}✗${NC} Nginx config file not found"
fi

echo
echo -e "${BLUE}5. Backend connectivity:${NC}"
if lsof -i:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend running on port 3001"
else
    echo -e "${RED}✗${NC} Backend not running on port 3001"
fi

echo
echo -e "${BLUE}6. Manual WebSocket test:${NC}"
echo "To test WebSocket manually, use one of these commands:"
echo
echo "# Test with wscat (install with: npm install -g wscat)"
echo "wscat -c 'wss://$WWW_DOMAIN/api/ws?token=YOUR_JWT_TOKEN'"
echo "wscat -c 'wss://$DOMAIN/api/ws?token=YOUR_JWT_TOKEN'"
echo
echo "# Test in browser console:"
echo "const ws = new WebSocket('wss://$WWW_DOMAIN/api/ws?token=YOUR_JWT_TOKEN');"
echo "ws.onopen = () => console.log('Connected');"
echo "ws.onerror = (e) => console.error('Error:', e);"
echo "ws.onclose = (e) => console.log('Closed:', e.code, e.reason);"

echo
echo -e "${BLUE}7. Troubleshooting tips:${NC}"
echo "- Check nginx logs: sudo tail -f /var/log/nginx/async-boardgame-error.log"
echo "- Check backend logs for WebSocket upgrade requests"
echo "- Verify Cloudflare WebSocket settings are enabled"
echo "- Test direct connection bypassing Cloudflare if possible"

echo
echo -e "${GREEN}✅ WebSocket connectivity test completed!${NC}"