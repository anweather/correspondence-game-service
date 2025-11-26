#!/bin/bash

# =============================================================================
# Full Automated Setup Script
# =============================================================================
# This script performs a complete setup of the Async Boardgame Service
# on a home server with domain, SSL, and automated deployments.
#
# Usage: ./scripts/full-setup.sh [options]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
log_success() { echo -e "${CYAN}[SUCCESS]${NC} $1"; }

# Default values
DOMAIN=""
EMAIL=""
DB_PASSWORD=""
CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
SKIP_SSL=false
SKIP_BACKUPS=false
SKIP_MONITORING=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --clerk-publishable-key)
            CLERK_PUBLISHABLE_KEY="$2"
            shift 2
            ;;
        --clerk-secret-key)
            CLERK_SECRET_KEY="$2"
            shift 2
            ;;
        --skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        --skip-backups)
            SKIP_BACKUPS=true
            shift
            ;;
        --skip-monitoring)
            SKIP_MONITORING=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --domain <domain>                  Your domain name (e.g., games.example.com)"
            echo "  --email <email>                    Email for SSL certificate"
            echo "  --db-password <password>           Database password"
            echo "  --clerk-publishable-key <key>      Clerk publishable key (optional)"
            echo "  --clerk-secret-key <key>           Clerk secret key (optional)"
            echo "  --skip-ssl                         Skip SSL setup"
            echo "  --skip-backups                     Skip backup setup"
            echo "  --skip-monitoring                  Skip monitoring setup"
            echo "  --help                             Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --domain games.example.com --email admin@example.com --db-password 'MySecurePass123!'"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Interactive prompts if not provided
if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain name (e.g., games.example.com): " DOMAIN
fi

if [ -z "$EMAIL" ]; then
    read -p "Enter your email for SSL certificate: " EMAIL
fi

if [ -z "$DB_PASSWORD" ]; then
    read -sp "Enter database password (min 16 chars): " DB_PASSWORD
    echo ""
fi

# Validate inputs
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$DB_PASSWORD" ]; then
    log_error "Domain, email, and database password are required!"
    exit 1
fi

if [ ${#DB_PASSWORD} -lt 16 ]; then
    log_error "Database password must be at least 16 characters!"
    exit 1
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

log_info "=========================================="
log_info "Async Boardgame Service - Full Setup"
log_info "=========================================="
log_info ""
log_info "Configuration:"
log_info "  Domain: $DOMAIN"
log_info "  Email: $EMAIL"
log_info "  Project: $PROJECT_DIR"
log_info "  SSL: $([ "$SKIP_SSL" = true ] && echo "Disabled" || echo "Enabled")"
log_info "  Backups: $([ "$SKIP_BACKUPS" = true ] && echo "Disabled" || echo "Enabled")"
log_info "  Monitoring: $([ "$SKIP_MONITORING" = true ] && echo "Disabled" || echo "Enabled")"
log_info ""
read -p "Continue with setup? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Setup cancelled"
    exit 0
fi

# Step 1: Install dependencies
log_step "1/8 Installing system dependencies..."
bash "$SCRIPT_DIR/setup-server.sh"

# Step 2: Configure environment
log_step "2/8 Configuring environment..."
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    cp .env.example .env
fi

# Update .env file
log_info "Updating .env configuration..."
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" .env
sed -i "s/^LOG_LEVEL=.*/LOG_LEVEL=info/" .env

if [ -n "$CLERK_PUBLISHABLE_KEY" ]; then
    sed -i "s/^AUTH_ENABLED=.*/AUTH_ENABLED=true/" .env
    sed -i "s|^CLERK_PUBLISHABLE_KEY=.*|CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY|" .env
    sed -i "s|^CLERK_SECRET_KEY=.*|CLERK_SECRET_KEY=$CLERK_SECRET_KEY|" .env
    log_info "Authentication enabled with Clerk"
else
    sed -i "s/^AUTH_ENABLED=.*/AUTH_ENABLED=false/" .env
    log_info "Authentication disabled"
fi

# Configure web client
if [ -f web-client/.env ]; then
    sed -i "s|^VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN|" web-client/.env
    if [ -n "$CLERK_PUBLISHABLE_KEY" ]; then
        sed -i "s|^VITE_CLERK_PUBLISHABLE_KEY=.*|VITE_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY|" web-client/.env
    fi
fi

# Step 3: Setup Nginx and SSL
if [ "$SKIP_SSL" = false ]; then
    log_step "3/8 Setting up Nginx and SSL..."
    bash "$SCRIPT_DIR/setup-nginx.sh" "$DOMAIN" "$EMAIL"
else
    log_step "3/8 Skipping SSL setup..."
fi

# Step 4: Deploy application
log_step "4/8 Deploying application..."
bash "$SCRIPT_DIR/deploy.sh"

# Step 5: Setup backups
if [ "$SKIP_BACKUPS" = false ]; then
    log_step "5/8 Setting up automated backups..."
    bash "$SCRIPT_DIR/setup-backups.sh"
else
    log_step "5/8 Skipping backup setup..."
fi

# Step 6: Setup monitoring
if [ "$SKIP_MONITORING" = false ]; then
    log_step "6/8 Setting up monitoring..."
    bash "$SCRIPT_DIR/setup-monitoring.sh"
else
    log_step "6/8 Skipping monitoring setup..."
fi

# Step 7: Configure firewall
log_step "7/8 Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
log_info "Firewall configured"

# Step 8: Final verification
log_step "8/8 Verifying installation..."

# Check Docker services
if docker-compose ps | grep -q "Up"; then
    log_success "Docker services are running"
else
    log_error "Docker services are not running!"
    docker-compose ps
    exit 1
fi

# Check health endpoint
sleep 5
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    log_success "Application health check passed"
else
    log_error "Application health check failed!"
    docker-compose logs --tail=50 backend
    exit 1
fi

# Check HTTPS (if SSL enabled)
if [ "$SKIP_SSL" = false ]; then
    if curl -f https://"$DOMAIN"/health > /dev/null 2>&1; then
        log_success "HTTPS health check passed"
    else
        log_warn "HTTPS health check failed (may need DNS propagation)"
    fi
fi

# Print summary
log_info ""
log_info "=========================================="
log_success "Setup Complete! 🎉"
log_info "=========================================="
log_info ""
log_info "Your Async Boardgame Service is now running!"
log_info ""
log_info "URLs:"
log_info "  - Local: http://localhost:3000"
if [ "$SKIP_SSL" = false ]; then
    log_info "  - Public: https://$DOMAIN"
fi
log_info "  - Health: https://$DOMAIN/health"
log_info ""
log_info "Useful Commands:"
log_info "  - View logs: docker-compose logs -f"
log_info "  - Restart: docker-compose restart"
log_info "  - Stop: docker-compose down"
log_info "  - Update: ./scripts/update.sh"
if [ "$SKIP_BACKUPS" = false ]; then
    log_info "  - Backup: ./scripts/backup.sh"
fi
log_info ""
log_info "Next Steps:"
log_info "  1. Test your site: https://$DOMAIN"
if [ -n "$CLERK_PUBLISHABLE_KEY" ]; then
    log_info "  2. Configure Clerk OAuth redirect URLs"
    log_info "     - Add: https://$DOMAIN/auth/callback"
fi
log_info "  3. Set up GitHub Actions for auto-deployment"
log_info "     - See: docs/GITHUB_ACTIONS_SETUP.md"
log_info "  4. Configure DNS if not already done"
log_info "  5. Set up port forwarding on your router"
log_info ""
log_info "Documentation:"
log_info "  - Home Server: docs/HOME_SERVER_DEPLOYMENT.md"
log_info "  - GitHub Actions: docs/GITHUB_ACTIONS_SETUP.md"
log_info "  - Authentication: docs/AUTHENTICATION.md"
log_info ""
log_success "Happy gaming! 🎮"
