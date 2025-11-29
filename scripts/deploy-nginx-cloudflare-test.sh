#!/bin/bash

# =============================================================================
# Deploy Nginx Cloudflare Test to Remote Host
# =============================================================================
# This script copies the Nginx configuration and static files to mediabox
# and sets everything up remotely
#
# Usage: ./scripts/deploy-nginx-cloudflare-test.sh [user@]hostname
# Example: ./scripts/deploy-nginx-cloudflare-test.sh user@mediabox
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

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 [user@]hostname"
    log_error "Example: $0 user@mediabox"
    log_error "Example: $0 192.168.1.100"
    exit 1
fi

REMOTE_HOST=$1

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

log_info "=========================================="
log_info "Deploy Nginx Cloudflare Test to Remote"
log_info "=========================================="
log_info ""
log_info "Remote host: $REMOTE_HOST"
log_info ""

# Test SSH connection
log_step "1/5 Testing SSH connection..."
if ssh -o ConnectTimeout=5 "$REMOTE_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
    log_info "SSH connection successful"
else
    log_error "Cannot connect to $REMOTE_HOST"
    log_error "Please check:"
    log_error "  - Host is reachable"
    log_error "  - SSH is running on remote host"
    log_error "  - You have SSH access"
    exit 1
fi

# Create temporary directory on remote
log_step "2/5 Creating temporary directory on remote..."
ssh "$REMOTE_HOST" "mkdir -p /tmp/nginx-cloudflare-setup"

# Copy files to remote
log_step "3/5 Copying files to remote host..."
log_info "Copying Nginx configuration..."
scp "$PROJECT_DIR/nginx/cloudflare-origin.conf" "$REMOTE_HOST:/tmp/nginx-cloudflare-setup/"

log_info "Copying static HTML..."
scp "$PROJECT_DIR/nginx/static/index.html" "$REMOTE_HOST:/tmp/nginx-cloudflare-setup/"

log_info "Copying setup script..."
scp "$SCRIPT_DIR/setup-nginx-cloudflare-test.sh" "$REMOTE_HOST:/tmp/nginx-cloudflare-setup/"

# Run setup on remote
log_step "4/5 Running setup on remote host..."
ssh "$REMOTE_HOST" << 'ENDSSH'
    set -e
    
    echo "Installing Nginx and dependencies..."
    
    # Check if running as root or can sudo
    if [ "$EUID" -eq 0 ]; then
        SUDO=""
    else
        SUDO="sudo"
    fi
    
    # Install Nginx if needed
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        $SUDO apt update
        $SUDO apt install -y nginx
    fi
    
    # Create directories
    echo "Creating directories..."
    $SUDO mkdir -p /etc/nginx/ssl
    $SUDO mkdir -p /var/www/async-boardgame-test
    $SUDO chmod 700 /etc/nginx/ssl
    
    # Copy files
    echo "Installing configuration files..."
    $SUDO cp /tmp/nginx-cloudflare-setup/cloudflare-origin.conf /etc/nginx/sites-available/
    $SUDO cp /tmp/nginx-cloudflare-setup/index.html /var/www/async-boardgame-test/
    
    # Set permissions
    $SUDO chmod 755 /var/www/async-boardgame-test
    $SUDO chmod 644 /var/www/async-boardgame-test/index.html
    
    # Enable site
    echo "Enabling Nginx site..."
    $SUDO ln -sf /etc/nginx/sites-available/cloudflare-origin /etc/nginx/sites-enabled/
    
    # Disable default site
    if [ -f /etc/nginx/sites-enabled/default ]; then
        $SUDO rm /etc/nginx/sites-enabled/default
        echo "Disabled default Nginx site"
    fi
    
    # Create self-signed certificate for testing
    if [ ! -f /etc/nginx/ssl/cloudflare-origin.pem ]; then
        echo "Creating self-signed certificate for testing..."
        echo "⚠️  Replace with Cloudflare Origin Certificate for production!"
        
        $SUDO openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/cloudflare-origin.key \
            -out /etc/nginx/ssl/cloudflare-origin.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=test.local" \
            2>/dev/null
        
        $SUDO chmod 600 /etc/nginx/ssl/cloudflare-origin.key
        $SUDO chmod 644 /etc/nginx/ssl/cloudflare-origin.pem
    fi
    
    # Test Nginx configuration
    echo "Testing Nginx configuration..."
    if $SUDO nginx -t; then
        echo "✓ Nginx configuration is valid"
        $SUDO systemctl reload nginx
        echo "✓ Nginx reloaded successfully"
    else
        echo "✗ Nginx configuration test failed!"
        exit 1
    fi
    
    # Clean up
    rm -rf /tmp/nginx-cloudflare-setup
    
    echo ""
    echo "Setup complete on remote host!"
ENDSSH

# Verify deployment
log_step "5/5 Verifying deployment..."
log_info "Testing HTTP endpoint..."
if ssh "$REMOTE_HOST" "curl -s http://localhost:8080 > /dev/null"; then
    log_info "✓ HTTP (port 8080) is working"
else
    log_warn "⚠ HTTP test failed (may be normal if firewall is blocking)"
fi

log_info "Testing HTTPS endpoint..."
if ssh "$REMOTE_HOST" "curl -k -s https://localhost:8443 > /dev/null"; then
    log_info "✓ HTTPS (port 8443) is working"
else
    log_warn "⚠ HTTPS test failed (may be normal if firewall is blocking)"
fi

log_info ""
log_info "=========================================="
log_info "Deployment Complete!"
log_info "=========================================="
log_info ""
log_info "Test from remote host:"
log_info "  ssh $REMOTE_HOST"
log_info "  curl http://localhost:8080"
log_info "  curl -k https://localhost:8443"
log_info ""
log_info "Next steps:"
log_info ""
log_info "1. Get Cloudflare Origin Certificate:"
log_info "   - Go to https://dash.cloudflare.com"
log_info "   - Select your domain"
log_info "   - SSL/TLS > Origin Server"
log_info "   - Click 'Create Certificate'"
log_info "   - Copy the certificate and private key"
log_info ""
log_info "2. Install certificate on remote host:"
log_info "   ssh $REMOTE_HOST"
log_info "   sudo nano /etc/nginx/ssl/cloudflare-origin.pem"
log_info "   # Paste certificate"
log_info "   sudo nano /etc/nginx/ssl/cloudflare-origin.key"
log_info "   # Paste private key"
log_info "   sudo systemctl reload nginx"
log_info ""
log_info "3. Configure firewall on remote host:"
log_info "   ssh $REMOTE_HOST"
log_info "   sudo ufw allow 8080/tcp"
log_info "   sudo ufw allow 8443/tcp"
log_info ""
log_info "4. Configure Cloudflare:"
log_info "   - Set SSL/TLS mode to 'Full (strict)'"
log_info "   - Add DNS A record pointing to your server"
log_info ""
log_info "5. Test from internet:"
log_info "   https://yourdomain.com"
log_info ""
