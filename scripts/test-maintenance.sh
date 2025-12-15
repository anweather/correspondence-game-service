#!/bin/bash

# Test script for maintenance page functionality
# This script demonstrates how the maintenance page works when the backend is down

set -e

echo "🧪 Testing Maintenance Page Functionality"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local service=$1
    if docker-compose -f docker-compose.prod.yml ps $service | grep -q "Up"; then
        echo -e "${GREEN}✓${NC} $service is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service is not running"
        return 1
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

echo
echo "1. Starting services with nginx proxy..."
docker-compose -f docker-compose.prod.yml up -d

echo
echo "2. Waiting for services to be ready..."
sleep 10

echo
echo "3. Checking service status..."
check_service nginx
check_service backend
check_service postgres

echo
echo "4. Testing normal operation..."
test_endpoint "http://localhost/health" "200" "Health check through nginx"
test_endpoint "http://localhost/" "200" "Main application through nginx"

echo
echo "5. Simulating backend failure..."
echo "   Stopping backend service..."
docker-compose -f docker-compose.prod.yml stop backend

echo
echo "6. Waiting for nginx to detect backend failure..."
sleep 5

echo
echo "7. Testing maintenance page activation..."
test_endpoint "http://localhost/" "503" "Maintenance page when backend is down"
test_endpoint "http://localhost/api/games" "503" "API endpoints when backend is down"

# Check if maintenance page is actually served
echo
echo "8. Verifying maintenance page content..."
response=$(curl -s http://localhost/)
if echo "$response" | grep -q "Service Temporarily Unavailable"; then
    echo -e "${GREEN}✓${NC} Maintenance page is being served correctly"
else
    echo -e "${RED}✗${NC} Maintenance page content not found"
fi

echo
echo "9. Testing health check (should still work)..."
test_endpoint "http://localhost/health" "200" "Nginx health check (independent of backend)"

echo
echo "10. Restoring backend service..."
docker-compose -f docker-compose.prod.yml start backend

echo
echo "11. Waiting for backend to be ready..."
sleep 15

echo
echo "12. Testing service restoration..."
test_endpoint "http://localhost/" "200" "Main application after backend restoration"
test_endpoint "http://localhost/api/games" "200" "API endpoints after backend restoration"

echo
echo -e "${GREEN}✅ Maintenance page testing completed!${NC}"
echo
echo "Summary:"
echo "- ✓ Nginx serves the application when backend is healthy"
echo "- ✓ Nginx shows maintenance page when backend is down"
echo "- ✓ Nginx health check works independently"
echo "- ✓ Service automatically restores when backend comes back"
echo
echo "You can manually test by visiting:"
echo "  - http://localhost/ (main application)"
echo "  - http://localhost/health (nginx health check)"
echo
echo "To simulate maintenance mode:"
echo "  docker-compose -f docker-compose.prod.yml stop backend"
echo
echo "To restore service:"
echo "  docker-compose -f docker-compose.prod.yml start backend"