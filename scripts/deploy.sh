#!/bin/bash

# =============================================================================
# Deployment Script
# =============================================================================
# This script builds and deploys the Async Boardgame Service
#
# Usage: ./scripts/deploy.sh
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

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR"

log_info "Starting deployment of Async Boardgame Service..."
log_info "Project directory: $PROJECT_DIR"

# Check if .env exists
if [ ! -f .env ]; then
    log_error ".env file not found!"
    log_error "Please copy .env.example to .env and configure it"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running!"
    exit 1
fi

# Step 1: Pull latest code (if in git repo)
if [ -d .git ]; then
    log_step "1/7 Pulling latest code..."
    git pull origin main || log_warn "Could not pull latest code (continuing anyway)"
else
    log_step "1/7 Skipping git pull (not a git repository)"
fi

# Step 2: Stop existing containers
log_step "2/7 Stopping existing containers..."
docker-compose down || true

# Step 3: Build Docker images
log_step "3/7 Building Docker images..."
docker-compose build --no-cache

# Step 4: Start services
log_step "4/7 Starting services..."
docker-compose up -d

# Step 5: Wait for services to be healthy
log_step "5/7 Waiting for services to be healthy..."
sleep 10

# Check if backend is healthy
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_info "Backend is healthy!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Backend failed to become healthy after $MAX_RETRIES attempts"
        log_error "Check logs with: docker-compose logs backend"
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

# Step 6: Run database migrations
log_step "6/7 Running database migrations..."
docker-compose exec -T backend npm run migrate || log_warn "Migration command not found (skipping)"

# Step 7: Display status
log_step "7/7 Checking service status..."
docker-compose ps

log_info ""
log_info "=========================================="
log_info "Deployment complete!"
log_info "=========================================="
log_info ""
log_info "Services:"
log_info "  - Backend: http://localhost:3000"
log_info "  - Health: http://localhost:3000/health"
log_info "  - Database: localhost:5432"
log_info ""
log_info "Useful commands:"
log_info "  - View logs: docker-compose logs -f"
log_info "  - Restart: docker-compose restart"
log_info "  - Stop: docker-compose down"
log_info "  - Status: docker-compose ps"
log_info ""

# Test health endpoint
log_info "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
echo "$HEALTH_RESPONSE" | jq . || echo "$HEALTH_RESPONSE"

log_info ""
log_info "Deployment successful! 🎉"
