#!/bin/bash

# =============================================================================
# Create Service User Script
# =============================================================================
# Creates a dedicated system user for running the Async Boardgame Service
#
# Usage: sudo ./scripts/create-service-user.sh [username]
# Example: sudo ./scripts/create-service-user.sh boardgame
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Get username (default: boardgame)
USERNAME=${1:-boardgame}
APP_DIR="/opt/async-boardgame-service"
BACKUP_DIR="/opt/backups/async-boardgame-service"

log_info "Creating service user: $USERNAME"

# Check if user already exists
if id "$USERNAME" &>/dev/null; then
    log_warn "User '$USERNAME' already exists"
    read -p "Do you want to reconfigure this user? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Exiting without changes"
        exit 0
    fi
else
    # Create system user (no login shell, no home directory)
    log_info "Creating system user..."
    useradd --system \
        --shell /bin/bash \
        --home-dir "$APP_DIR" \
        --comment "Async Boardgame Service" \
        "$USERNAME"
    
    log_info "✓ User '$USERNAME' created"
fi

# Add user to docker group (if docker is installed)
if command -v docker &> /dev/null; then
    log_info "Adding user to docker group..."
    usermod -aG docker "$USERNAME"
    log_info "✓ User added to docker group"
else
    log_warn "Docker not found - skipping docker group"
fi

# Create application directory
log_info "Setting up directories..."
mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p /var/log/async-boardgame-service

# Set ownership
chown -R "$USERNAME:$USERNAME" "$APP_DIR"
chown -R "$USERNAME:$USERNAME" "$BACKUP_DIR"
chown -R "$USERNAME:$USERNAME" /var/log/async-boardgame-service

log_info "✓ Directories created and ownership set"

# Set permissions
chmod 755 "$APP_DIR"
chmod 755 "$BACKUP_DIR"
chmod 755 /var/log/async-boardgame-service

log_info "✓ Permissions configured"

# Display summary
log_info ""
log_info "=========================================="
log_info "Service User Setup Complete!"
log_info "=========================================="
log_info ""
log_info "User Details:"
log_info "  Username: $USERNAME"
log_info "  UID: $(id -u $USERNAME)"
log_info "  GID: $(id -g $USERNAME)"
log_info "  Groups: $(groups $USERNAME | cut -d: -f2)"
log_info "  Home: $APP_DIR"
log_info ""
log_info "Directories:"
log_info "  Application: $APP_DIR"
log_info "  Backups: $BACKUP_DIR"
log_info "  Logs: /var/log/async-boardgame-service"
log_info ""
log_info "Next Steps:"
log_info "1. Clone repository to $APP_DIR"
log_info "   sudo -u $USERNAME git clone <repo-url> $APP_DIR"
log_info ""
log_info "2. Configure environment"
log_info "   sudo -u $USERNAME cp $APP_DIR/.env.example $APP_DIR/.env"
log_info "   sudo -u $USERNAME nano $APP_DIR/.env"
log_info ""
log_info "3. Deploy application"
log_info "   cd $APP_DIR"
log_info "   sudo -u $USERNAME docker-compose up -d"
log_info ""
log_info "4. (Optional) Switch to service user"
log_info "   sudo -u $USERNAME -s"
log_info ""

# Create a helper script for switching to service user
cat > /usr/local/bin/boardgame-shell << EOF
#!/bin/bash
# Helper script to switch to boardgame service user
sudo -u $USERNAME -s
EOF

chmod +x /usr/local/bin/boardgame-shell

log_info "Helper command created: boardgame-shell"
log_info "  Run 'boardgame-shell' to switch to service user"
log_info ""
