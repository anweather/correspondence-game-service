#!/bin/bash

# =============================================================================
# Home Server Setup Script
# =============================================================================
# This script installs all required dependencies for running the
# Async Boardgame Service on a home server.
#
# Usage: ./scripts/setup-server.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

log_info "Starting server setup..."

# Update system
log_info "Updating system packages..."
apt update
apt upgrade -y

# Install basic dependencies
log_info "Installing basic dependencies..."
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban

# Install Docker
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Add current user to docker group
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
        log_info "Added $SUDO_USER to docker group"
    fi
else
    log_info "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_info "Installing Docker Compose..."
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    log_info "Docker Compose already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    log_info "Installing Nginx..."
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
else
    log_info "Nginx already installed"
fi

# Configure firewall
log_info "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 8080/tcp  # HTTP (Cloudflare origin)
ufw allow 8443/tcp  # HTTPS (Cloudflare origin)
ufw reload

# Configure fail2ban
log_info "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
log_info "Creating application directory..."
mkdir -p /opt/async-boardgame-service
mkdir -p /opt/backups/async-boardgame-service
mkdir -p /var/log/async-boardgame-service

# Set permissions
if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER:$SUDO_USER" /opt/async-boardgame-service
    chown -R "$SUDO_USER:$SUDO_USER" /opt/backups/async-boardgame-service
fi

# Enable Docker service
systemctl enable docker
systemctl start docker

log_info "Server setup complete!"
log_info ""
log_info "Next steps:"
log_info "1. Clone your repository to /opt/async-boardgame-service"
log_info "2. Install Cloudflare Origin Certificate to /etc/ssl/cloudflare/"
log_info "3. Run ./scripts/setup-nginx-cloudflare.sh <domain> full"
log_info "4. Configure .env file"
log_info "5. Run ./scripts/deploy.sh"
log_info ""
log_info "See docs/CLOUDFLARE_SETUP_GUIDE.md for detailed instructions"
log_info ""
log_info "Note: You may need to log out and back in for Docker group changes to take effect"
