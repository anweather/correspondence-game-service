# Cloudflare Origin Setup Guide

This guide walks you through setting up Nginx on your remote server (mediabox) to work with Cloudflare using an Origin Certificate.

## Quick Start

### Step 1: Deploy to Remote Host

From your development machine, run:

```bash
./scripts/deploy-nginx-cloudflare-test.sh user@mediabox
```

Replace `user@mediabox` with your actual SSH connection string (e.g., `john@192.168.1.100`).

This will:
- Copy Nginx configuration to mediabox
- Copy static test page
- Install and configure Nginx
- Create temporary self-signed certificates
- Start serving on ports 8080 (HTTP) and 8443 (HTTPS)

### Step 2: Get Cloudflare Origin Certificate

1. **Log into Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Select your domain**
3. **Navigate to**: SSL/TLS → Origin Server
4. **Click**: "Create Certificate"
5. **Configure**:
   - Private key type: RSA (2048)
   - Hostnames: `*.yourdomain.com, yourdomain.com`
   - Certificate Validity: 15 years
6. **Click**: "Create"
7. **Copy both**:
   - Origin Certificate (PEM format)
   - Private Key

### Step 3: Install Certificate on Remote Host

SSH into your remote host:

```bash
ssh user@mediabox
```

Install the certificate:

```bash
# Edit certificate file
sudo nano /etc/nginx/ssl/cloudflare-origin.pem
# Paste the Origin Certificate (including BEGIN and END lines)
# Save and exit (Ctrl+X, Y, Enter)

# Edit private key file
sudo nano /etc/nginx/ssl/cloudflare-origin.key
# Paste the Private Key (including BEGIN and END lines)
# Save and exit (Ctrl+X, Y, Enter)

# Set correct permissions
sudo chmod 600 /etc/nginx/ssl/cloudflare-origin.key
sudo chmod 644 /etc/nginx/ssl/cloudflare-origin.pem

# Reload Nginx
sudo systemctl reload nginx
```

### Step 4: Configure Firewall

On the remote host:

```bash
# Allow ports 8080 and 8443
sudo ufw allow 8080/tcp
sudo ufw allow 8443/tcp
sudo ufw reload
```

### Step 5: Configure Cloudflare

1. **Set SSL/TLS Mode**:
   - Go to SSL/TLS → Overview
   - Set mode to: **Full (strict)**

2. **Add DNS Record**:
   - Go to DNS → Records
   - Add A record:
     - Type: A
     - Name: @ (or subdomain)
     - IPv4 address: Your server's public IP
     - Proxy status: Proxied (orange cloud)

3. **Wait for DNS propagation** (1-5 minutes)

### Step 6: Test

Test from your browser:
```
https://yourdomain.com
```

You should see the test page!

## Architecture

```
User → Cloudflare (HTTPS) → Your Server (HTTPS on 8443) → Nginx → Static Page
       (Public SSL)           (Origin Certificate)
```

**Key Points**:
- Cloudflare handles public SSL/TLS (user to Cloudflare)
- Origin Certificate secures Cloudflare to your server
- Ports 8080/8443 are for Cloudflare origin connections
- Standard ports 80/443 are handled by Cloudflare

## Configuration Files

### Nginx Config Location
```
/etc/nginx/sites-available/cloudflare-origin
/etc/nginx/sites-enabled/cloudflare-origin
```

### SSL Certificates
```
/etc/nginx/ssl/cloudflare-origin.pem  (certificate)
/etc/nginx/ssl/cloudflare-origin.key  (private key)
```

### Static Content
```
/var/www/async-boardgame-test/index.html
```

## Testing

### Test Locally on Remote Host

SSH into mediabox:

```bash
# Test HTTP
curl http://localhost:8080

# Test HTTPS
curl -k https://localhost:8443

# Test health endpoint
curl http://localhost:8080/health
```

### Test from Internet

```bash
# Test your domain
curl https://yourdomain.com

# Check Cloudflare headers
curl -I https://yourdomain.com
# Look for: cf-ray, cf-cache-status headers
```

## Troubleshooting

### "Connection refused" on ports 8080/8443

**Check if Nginx is running**:
```bash
sudo systemctl status nginx
```

**Check if ports are listening**:
```bash
sudo netstat -tlnp | grep nginx
# Should show ports 8080 and 8443
```

**Check Nginx logs**:
```bash
sudo tail -f /var/log/nginx/cloudflare-origin-error.log
```

### "SSL certificate problem"

**Verify certificate files exist**:
```bash
ls -la /etc/nginx/ssl/
```

**Test Nginx configuration**:
```bash
sudo nginx -t
```

**Check certificate details**:
```bash
sudo openssl x509 -in /etc/nginx/ssl/cloudflare-origin.pem -text -noout
```

### Cloudflare shows "Error 526: Invalid SSL certificate"

This means Cloudflare can't validate your origin certificate.

**Solutions**:
1. Make sure you're using the Cloudflare Origin Certificate (not Let's Encrypt)
2. Verify SSL/TLS mode is set to "Full (strict)"
3. Check certificate hasn't expired
4. Ensure certificate includes your domain

### Can't access from internet

**Check DNS**:
```bash
nslookup yourdomain.com
# Should return Cloudflare IP addresses
```

**Check firewall**:
```bash
sudo ufw status
# Should show 8080/tcp and 8443/tcp ALLOW
```

**Check router port forwarding**:
- Forward external 80 → server 8080
- Forward external 443 → server 8443

## Next Steps: Connect to Docker

Once the test page is working, you can connect Nginx to your Docker application:

1. **Edit Nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/cloudflare-origin
   ```

2. **Uncomment the upstream and proxy sections**:
   ```nginx
   upstream backend {
       server localhost:3000;
       keepalive 32;
   }
   
   # In both server blocks, uncomment:
   location /api/ {
       proxy_pass http://backend;
       # ... rest of proxy config
   }
   ```

3. **Reload Nginx**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Start Docker application**:
   ```bash
   cd /opt/async-boardgame-service
   docker-compose up -d
   ```

## Security Notes

### Cloudflare Origin Certificate

- **Only valid** between Cloudflare and your server
- **Not trusted** by browsers (that's OK - Cloudflare handles public SSL)
- **15-year validity** - set a reminder to renew
- **Keep private key secure** - never commit to git

### Firewall Rules

Only expose ports needed for Cloudflare:
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8080/tcp  # HTTP from Cloudflare
sudo ufw allow 8443/tcp  # HTTPS from Cloudflare
sudo ufw default deny incoming
```

### IP Whitelisting (Optional)

For extra security, only allow Cloudflare IPs:

```bash
# Get Cloudflare IP ranges
curl https://www.cloudflare.com/ips-v4

# Add to firewall (example)
sudo ufw allow from 173.245.48.0/20 to any port 8443
# Repeat for all Cloudflare IP ranges
```

## Benefits of Cloudflare

✅ **DDoS Protection**: Automatic protection against attacks  
✅ **CDN**: Content cached globally for faster loading  
✅ **SSL/TLS**: Free SSL certificates for your domain  
✅ **Analytics**: Traffic insights and security analytics  
✅ **Firewall**: Web Application Firewall (WAF) rules  
✅ **Always Online**: Cached version if your server goes down  

## Cost

- **Cloudflare Free Tier**: $0/month
  - Unlimited DDoS protection
  - Global CDN
  - Free SSL certificates
  - Basic analytics
  - Sufficient for most use cases

- **Cloudflare Pro**: $20/month (optional)
  - Advanced DDoS protection
  - Image optimization
  - Mobile optimization
  - Priority support

## Additional Resources

- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [Cloudflare SSL Modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Nginx logs: `sudo tail -f /var/log/nginx/cloudflare-origin-error.log`
3. Check Cloudflare dashboard for errors
4. Verify DNS propagation: https://dnschecker.org
