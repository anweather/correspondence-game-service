# WebSocket + Cloudflare Troubleshooting Guide

## Issue: WebSocket connections getting 404 errors through Cloudflare

When WebSocket connections work locally but fail in production through Cloudflare, it's usually due to one of these issues:

## 1. Nginx Configuration Missing WebSocket Headers

**Problem:** Nginx isn't properly handling WebSocket upgrade requests.

**Solution:** Ensure your nginx config has proper WebSocket handling:

```nginx
# WebSocket endpoint - must come before general /api/ location
location /api/ws {
    # WebSocket upgrade headers
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket specific timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 3600s;  # 1 hour for long-lived connections
    proxy_read_timeout 3600s;  # 1 hour for long-lived connections
    
    # Disable buffering for real-time communication
    proxy_buffering off;
}
```

## 2. Cloudflare WebSocket Support Requirements

**Cloudflare Requirements:**
- WebSocket connections must be on ports: 80, 443, 2052, 2053, 2082, 2083, 2086, 2087, 2095, 2096, 8080, 8443
- Must use proper WebSocket upgrade headers
- Enterprise plans have better WebSocket support

**Check your setup:**
- ✅ Using port 8443 (supported)
- ✅ Using HTTPS (required for production)
- ❓ Proper upgrade headers (fixed in nginx config above)

## 3. Cloudflare Settings to Check

### A. SSL/TLS Settings
- Go to Cloudflare Dashboard → SSL/TLS
- Ensure SSL/TLS encryption mode is "Full" or "Full (strict)"
- "Flexible" mode can break WebSocket connections

### B. Network Settings
- Go to Cloudflare Dashboard → Network
- Ensure "WebSockets" is enabled (should be ON by default)

### C. Page Rules / Workers
- Check if any Page Rules or Workers are interfering with `/api/ws` path
- Disable any caching rules for WebSocket endpoints

## 4. Testing WebSocket Connection

### Test 1: Direct Backend Connection (Bypass Cloudflare)
```bash
# Test direct connection to your server (bypass Cloudflare)
wscat -c "ws://YOUR_SERVER_IP:8080/api/ws?token=YOUR_TOKEN"
```

### Test 2: Through Cloudflare
```bash
# Test through Cloudflare
wscat -c "wss://async-boardgames.org:8443/api/ws?token=YOUR_TOKEN"
```

### Test 3: Browser Console
```javascript
// Test in browser console
const ws = new WebSocket('wss://async-boardgames.org:8443/api/ws?token=YOUR_TOKEN');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

## 5. Common Error Patterns

### Error: 404 Not Found
- **Cause:** Nginx not handling WebSocket upgrade properly
- **Fix:** Add WebSocket location block before general `/api/` location

### Error: 400 Bad Request
- **Cause:** Missing or incorrect WebSocket headers
- **Fix:** Ensure `Upgrade` and `Connection` headers are set correctly

### Error: 502 Bad Gateway
- **Cause:** Backend not responding or nginx can't connect to backend
- **Fix:** Check backend is running on correct port (3001)

### Error: 1006 Connection Closed Abnormally
- **Cause:** Cloudflare or nginx closing connection prematurely
- **Fix:** Increase timeout values, check Cloudflare settings

## 6. Debugging Steps

### Step 1: Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/async-boardgame-error.log
sudo tail -f /var/log/nginx/async-boardgame-access.log
```

### Step 2: Check Backend Logs
Look for WebSocket upgrade requests in your Node.js logs.

### Step 3: Check Cloudflare Analytics
- Go to Cloudflare Dashboard → Analytics → Traffic
- Look for requests to `/api/ws` and their status codes

### Step 4: Test Nginx Configuration
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Alternative Solutions

### Option 1: Use Different Port
If port 8443 has issues, try port 443:
```nginx
listen 443 ssl http2;
```

### Option 2: Use Subdomain
Create a WebSocket-specific subdomain:
- `ws.async-boardgames.org` for WebSocket connections
- Point directly to your server (bypass some Cloudflare features)

### Option 3: Cloudflare Tunnel
Use Cloudflare Tunnel for more reliable WebSocket support:
```bash
cloudflared tunnel create websocket-tunnel
```

## 8. Production Deployment

After updating nginx configuration:

```bash
# Update production nginx
sudo ./scripts/update-production-nginx.sh

# Test the configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Test WebSocket connection
wscat -c "wss://async-boardgames.org:8443/api/ws?token=YOUR_TOKEN"
```

## 9. Monitoring

Set up monitoring for WebSocket connections:

```bash
# Check WebSocket connections
ss -tuln | grep :3001

# Monitor nginx WebSocket requests
grep "api/ws" /var/log/nginx/async-boardgame-access.log | tail -20
```

## 10. Fallback Strategy

The frontend should already have polling fallback:
- If WebSocket fails, it falls back to HTTP polling
- Check browser console for "Falling back to polling" messages
- Polling uses regular HTTP requests which work reliably through Cloudflare