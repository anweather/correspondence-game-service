#!/bin/bash

# =============================================================================
# Backup Setup Script
# =============================================================================
# This script sets up automated daily backups for the database
#
# Usage: ./scripts/setup-backups.sh
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKUP_DIR="/opt/backups/async-boardgame-service"

log_info "Setting up automated backups..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Make backup script executable
chmod +x "$SCRIPT_DIR/backup.sh"

# Create cron job for daily backups at 2 AM
log_info "Creating cron job for daily backups..."
CRON_JOB="0 2 * * * $SCRIPT_DIR/backup.sh >> /var/log/async-boardgame-service/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$SCRIPT_DIR/backup.sh"; then
    log_warn "Cron job already exists, skipping..."
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log_info "Cron job added: Daily backup at 2:00 AM"
fi

# Create log directory
mkdir -p /var/log/async-boardgame-service

# Set permissions
if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER:$SUDO_USER" "$BACKUP_DIR"
    chown -R "$SUDO_USER:$SUDO_USER" /var/log/async-boardgame-service
fi

log_info "Backup setup complete!"
log_info ""
log_info "Backup configuration:"
log_info "  - Backup directory: $BACKUP_DIR"
log_info "  - Schedule: Daily at 2:00 AM"
log_info "  - Retention: 7 days"
log_info "  - Log file: /var/log/async-boardgame-service/backup.log"
log_info ""
log_info "Manual backup: $SCRIPT_DIR/backup.sh"
log_info "View cron jobs: crontab -l"
