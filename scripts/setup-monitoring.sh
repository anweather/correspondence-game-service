#!/bin/bash

# =============================================================================
# Monitoring Setup Script
# =============================================================================
# This script sets up health monitoring and automatic restart
#
# Usage: ./scripts/setup-monitoring.sh
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

log_info "Setting up monitoring..."

# Create monitoring script
cat > "$SCRIPT_DIR/monitor.sh" << 'EOF'
#!/bin/bash

# Health check monitoring script
# This script checks if the service is healthy and restarts if needed

HEALTH_URL="http://localhost:3000/health"
MAX_FAILURES=3
FAILURE_COUNT=0
LOG_FILE="/var/log/async-boardgame-service/monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check health endpoint
if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
    # Service is healthy
    FAILURE_COUNT=0
else
    # Service is unhealthy
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
    log "Health check failed ($FAILURE_COUNT/$MAX_FAILURES)"
    
    if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
        log "Service unhealthy after $MAX_FAILURES attempts, restarting..."
        cd PROJECT_DIR_PLACEHOLDER
        docker-compose restart backend
        log "Service restarted"
        FAILURE_COUNT=0
    fi
fi
EOF

# Replace placeholder with actual project directory
sed -i "s|PROJECT_DIR_PLACEHOLDER|$PROJECT_DIR|g" "$SCRIPT_DIR/monitor.sh"

# Make monitoring script executable
chmod +x "$SCRIPT_DIR/monitor.sh"

# Create cron job for monitoring every 5 minutes
log_info "Creating cron job for health monitoring..."
CRON_JOB="*/5 * * * * $SCRIPT_DIR/monitor.sh"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$SCRIPT_DIR/monitor.sh"; then
    log_warn "Cron job already exists, skipping..."
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log_info "Cron job added: Health check every 5 minutes"
fi

# Set up log rotation
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/async-boardgame-service << EOF
/var/log/async-boardgame-service/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
EOF

# Create log directory
mkdir -p /var/log/async-boardgame-service

# Set permissions
if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER:$SUDO_USER" /var/log/async-boardgame-service
fi

log_info "Monitoring setup complete!"
log_info ""
log_info "Monitoring configuration:"
log_info "  - Health check: Every 5 minutes"
log_info "  - Auto-restart: After 3 failed checks"
log_info "  - Log file: /var/log/async-boardgame-service/monitor.log"
log_info "  - Log rotation: Daily, keep 14 days"
log_info ""
log_info "View monitoring logs: tail -f /var/log/async-boardgame-service/monitor.log"
log_info "View cron jobs: crontab -l"
