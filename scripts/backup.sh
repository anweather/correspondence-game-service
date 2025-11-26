#!/bin/bash

# =============================================================================
# Database Backup Script
# =============================================================================
# This script creates a backup of the PostgreSQL database
#
# Usage: ./scripts/backup.sh
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

# Configuration
BACKUP_DIR="/opt/backups/async-boardgame-service"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_DIR"

log_info "Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running!"
    exit 1
fi

# Check if postgres container is running
if ! docker-compose ps postgres | grep -q "Up"; then
    log_error "PostgreSQL container is not running!"
    exit 1
fi

# Create backup
log_info "Creating backup: $BACKUP_FILE"
docker-compose exec -T postgres pg_dump -U boardgame boardgame | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log_error "Backup failed!"
    exit 1
fi

# Remove old backups
log_info "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l)
log_info "Total backups: $BACKUP_COUNT"

# Display backup list
log_info "Recent backups:"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz | tail -5

log_info "Backup complete!"
