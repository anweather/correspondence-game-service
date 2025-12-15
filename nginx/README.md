# Nginx Configuration for Async Boardgame Service

This directory contains nginx configuration files for production deployment with automatic maintenance page functionality.

## Overview

The nginx configuration provides:
- **Reverse proxy** to your Node.js backend (port 3001)
- **Automatic maintenance page** when backend is unavailable
- **Rate limiting** for API and authentication endpoints
- **Security headers** and gzip compression
- **Health check endpoint** that works independently of backend

## Files

- `nginx.conf` - Main nginx site configuration
- `static/maintenance.html` - Maintenance page served when backend is down
- `static/index.html` - Optional static landing page

## Quick Setup

### 1. Update Existing Configuration

For async-boardgames.org production server, run the update script:

```bash
sudo ./scripts/update-production-nginx.sh
```

This will:
- Backup your existing nginx configuration
- Install the maintenance page to `/var/www/html/`
- Update your nginx config with maintenance page functionality
- Preserve all your existing Cloudflare and SSL settings
- Test and reload nginx

### 2. Manual Setup

If you prefer manual setup:

```bash
# Copy maintenance page
sudo cp nginx/static/maintenance.html /var/www/html/

# Install nginx configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/boardgame

# Enable the site
sudo ln -s /etc/nginx/sites-available/boardgame /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 3. Configuration Details

The configuration is already set up for:
- Domain: `async-boardgames.org`
- HTTP Port: `8080` (Cloudflare proxy)
- HTTPS Port: `8443` (Cloudflare Origin Certificate)
- Backend: `localhost:3001`

## How It Works

### Normal Operation
- Nginx proxies all requests to your backend on `127.0.0.1:3001`
- Static assets are served with caching headers
- API requests have rate limiting applied

### Maintenance Mode (Automatic)
When your backend is down or unreachable:
- Nginx automatically serves the maintenance page
- Returns HTTP 503 (Service Unavailable) status
- Maintenance page auto-refreshes every 30 seconds
- Health check endpoint (`/health`) still works

### Endpoints

- `/` - Main application (proxied to backend or maintenance page)
- `/api/*` - API endpoints (proxied to backend or maintenance page)
- `/health` - Nginx health check (always available)
- All other routes - Proxied to backend or maintenance page

## Testing

### Test Maintenance Page

Use the test script:
```bash
sudo ./scripts/test-maintenance.sh
```

Or manually:
```bash
# Stop your backend
pkill -f "node.*3001"

# Visit your site - should show maintenance page
curl -I http://your-domain.com/

# Start your backend
npm start

# Visit your site - should show normal application
curl -I http://your-domain.com/
```

### Monitor Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Nginx status
sudo systemctl status nginx
```

## Configuration Details

### Rate Limiting
- API endpoints: 10 requests/second with burst of 20
- Auth endpoints: 5 requests/second with burst of 10

### Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Caching
- Static assets: 1 year cache with immutable flag
- API responses: No caching

### Timeouts
- Connection: 5 seconds
- Send: 30 seconds
- Read: 30 seconds

## Customization

### Update Backend Port

If your backend runs on a different port, edit the upstream in `nginx.conf`:
```nginx
upstream backend {
    server 127.0.0.1:YOUR_PORT;
    keepalive 32;
}
```

### Customize Maintenance Page

Edit `static/maintenance.html` to match your branding and requirements.

### Add SSL/HTTPS

Add SSL configuration to the server block:
```nginx
listen 443 ssl http2;
ssl_certificate /path/to/your/cert.pem;
ssl_certificate_key /path/to/your/key.pem;
```

## Troubleshooting

### Backend Not Reachable
- Check if your backend is running: `lsof -i:3001`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Test backend directly: `curl http://127.0.0.1:3001/health`

### Maintenance Page Not Showing
- Verify maintenance.html exists: `ls -la /var/www/html/maintenance.html`
- Check nginx configuration: `sudo nginx -t`
- Check file permissions: `sudo chmod 644 /var/www/html/maintenance.html`

### Configuration Issues
- Test nginx config: `sudo nginx -t`
- Check syntax: `sudo nginx -T`
- Reload configuration: `sudo systemctl reload nginx`

## Production Checklist

- [ ] Update `server_name` with your actual domain
- [ ] Configure SSL/HTTPS certificates
- [ ] Set up log rotation for nginx logs
- [ ] Configure firewall rules (ports 80, 443)
- [ ] Test maintenance page functionality
- [ ] Set up monitoring for nginx and backend
- [ ] Configure backup strategy for nginx configs