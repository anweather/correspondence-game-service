#!/bin/bash

# =============================================================================
# Database Restore Script
# =============================================================================
# This script restores the PostgreSQL database from a backup
#
# Usage: ./scripts/restore.sh <backup_file>
# Example: ./scripts/restore.sh /opt/backups/async-boardgame-service/backup_20251125_020000.sql.gz
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <backup_file>"
    log_error "Example: $0 /opt/backups/async-boardgame-service/backup_20251125_020000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_warn "=========================================="
log_warn "WARNING: This will REPLACE the current database!"
log_warn "Backup file: $BACKUP_FILE"
log_warn "=========================================="
log_warn ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Restore cancelled"
    exit 0
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running!"
    exit 1
fi

# Check if postgres container is running
if ! docker-compose ps postgres | grep -q "Up"; then
    log_error "PostgreSQL container is not running!"
    log_error "Start it with: docker-compose up -d postgres"
    exit 1
fi

# Stop backend to prevent connections
log_info "Stopping backend service..."
docker-compose stop backend

# Drop and recreate database
log_info "Dropping existing database..."
docker-compose exec -T postgres psql -U boardgame -d postgres -c "DROP DATABASE IF EXISTS boardgame;"
docker-compose exec -T postgres psql -U boardgame -d postgres -c "CREATE DATABASE boardgame;"

# Restore backup
log_info "Restoring database from backup..."
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U boardgame -d boardgame

# Start backend
log_info "Starting backend service..."
docker-compose start backend

# Wait for backend to be healthy
log_info "Waiting for backend to be healthy..."
sleep 5
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_info "Backend is healthy!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Backend failed to become healthy"
        log_error "Check logs with: docker-compose logs backend"
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

log_info "Database restored successfully!"
log_info "Backup file: $BACKUP_FILE"
