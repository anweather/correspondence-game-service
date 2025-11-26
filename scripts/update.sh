#!/bin/bash

# =============================================================================
# Update Script
# =============================================================================
# This script updates the application to the latest version
#
# Usage: ./scripts/update.sh
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

log_info "Starting application update..."

# Check if git repo
if [ ! -d .git ]; then
    log_error "Not a git repository!"
    exit 1
fi

# Step 1: Backup database
log_step "1/6 Creating database backup..."
if [ -f "$SCRIPT_DIR/backup.sh" ]; then
    bash "$SCRIPT_DIR/backup.sh"
else
    log_warn "Backup script not found, skipping backup"
fi

# Step 2: Pull latest code
log_step "2/6 Pulling latest code..."
CURRENT_COMMIT=$(git rev-parse HEAD)
git fetch origin
git pull origin main

NEW_COMMIT=$(git rev-parse HEAD)

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    log_info "Already up to date!"
    exit 0
fi

log_info "Updated from $CURRENT_COMMIT to $NEW_COMMIT"

# Step 3: Check for dependency changes
log_step "3/6 Checking for dependency changes..."
if git diff --name-only "$CURRENT_COMMIT" "$NEW_COMMIT" | grep -q "package.json\|package-lock.json"; then
    log_info "Dependencies changed, will rebuild images"
    REBUILD=true
else
    log_info "No dependency changes"
    REBUILD=false
fi

# Step 4: Build images
log_step "4/6 Building Docker images..."
if [ "$REBUILD" = true ]; then
    docker-compose build --no-cache
else
    docker-compose build
fi

# Step 5: Deploy with zero downtime
log_step "5/6 Deploying updated services..."

# Start new containers
docker-compose up -d

# Wait for health check
log_info "Waiting for services to be healthy..."
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_info "Services are healthy!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Services failed to become healthy!"
        log_error "Rolling back..."
        git reset --hard "$CURRENT_COMMIT"
        docker-compose up -d
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

# Step 6: Cleanup
log_step "6/6 Cleaning up old images..."
docker image prune -f

log_info ""
log_info "=========================================="
log_info "Update Complete! 🎉"
log_info "=========================================="
log_info ""
log_info "Changes:"
git log --oneline "$CURRENT_COMMIT".."$NEW_COMMIT"
log_info ""
log_info "Service status:"
docker-compose ps
log_info ""
log_info "Update successful!"
