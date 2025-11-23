# Deployment Guide

This guide provides comprehensive instructions for deploying the Async Boardgame Service using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Deployment Steps](#deployment-steps)
- [Managing the Application](#managing-the-application)
- [Backup and Restore](#backup-and-restore)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Production Recommendations](#production-recommendations)

## Prerequisites

### Required Software

1. **Docker** (version 20.10 or later)
   - Installation: https://docs.docker.com/get-docker/
   - Verify: `docker --version`

2. **Docker Compose** (version 2.0 or later)
   - Usually included with Docker Desktop
   - Verify: `docker-compose --version`

### System Requirements

- **Disk Space**: Minimum 2GB free space
- **RAM**: Minimum 2GB available memory
- **Port Availability**: Port 3000 must be available
- **Operating System**: Linux, macOS, or Windows with WSL2

### Verification

Check that Docker is running:

```bash
docker ps
```

If this command fails, start the Docker daemon:
- **Linux**: `sudo systemctl start docker`
- **macOS/Windows**: Start Docker Desktop application

## Quick Start

For a rapid deployment with default settings:

```bash
# 1. Clone the repository
git clone <repository-url>
cd async-boardgame-service

# 2. Create environment file
cp .env.example .env

# 3. Set a secure database password
# Edit .env and change DB_PASSWORD=changeme_in_production

# 4. Build and start services
docker-compose build
docker-compose up -d

# 5. Verify deployment
docker-compose ps
curl http://localhost:3000/health

# 6. Access the application
open http://localhost:3000
```

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

#### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_PASSWORD` | PostgreSQL database password | `changeme_in_production` | `MyS3cur3P@ssw0rd!` |

#### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | HTTP server port | `3000` | `8080` |
| `NODE_ENV` | Environment mode | `production` | `production` or `development` |
| `LOG_LEVEL` | Logging verbosity | `info` | `debug`, `info`, `warn`, `error` |
| `DB_POOL_SIZE` | Database connection pool size | `10` | `20` |

### Creating the .env File

```bash
# Copy the example file
cp .env.example .env

# Edit with your preferred editor
nano .env
# or
vim .env
```

### Example .env File

```bash
# Database Configuration
DB_PASSWORD=MySecurePassword123!

# Application Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
DB_POOL_SIZE=10
```

### Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` files to version control
- Use strong passwords (minimum 16 characters, mixed case, numbers, symbols)
- Change default passwords before production deployment
- Restrict file permissions: `chmod 600 .env`

## Deployment Steps

### Step 1: Prepare the Environment

```bash
# Navigate to project directory
cd async-boardgame-service

# Ensure you're on the correct branch
git checkout main
git pull origin main

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit .env and set DB_PASSWORD before continuing"
    exit 1
fi
```

### Step 2: Build Docker Images

```bash
# Build all images
docker-compose build

# Build with no cache (if needed)
docker-compose build --no-cache

# View built images
docker images | grep async-boardgame
```

Expected output:
```
async-boardgame-service-backend   latest   abc123def456   2 minutes ago   180MB
```

### Step 3: Start Services

```bash
# Start in detached mode (background)
docker-compose up -d

# Start with logs visible (foreground)
docker-compose up

# Start specific service
docker-compose up -d backend
```

### Step 4: Verify Deployment

```bash
# Check container status
docker-compose ps

# Expected output:
# NAME                    STATUS              PORTS
# backend                 Up 30 seconds       0.0.0.0:3000->3000/tcp
# postgres                Up 30 seconds       5432/tcp

# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-11-22T10:30:00.000Z",
#   "uptime": 30,
#   "version": "1.0.0",
#   "database": {
#     "connected": true,
#     "responseTime": 5
#   }
# }

# Test the web interface
curl http://localhost:3000
```

### Step 5: Initial Verification

```bash
# View logs
docker-compose logs -f

# Test API endpoints
curl http://localhost:3000/api/games
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"gameType": "tic-tac-toe", "maxPlayers": 2}'
```

## Managing the Application

### Starting and Stopping

```bash
# Start services
docker-compose up -d

# Stop services (preserves data)
docker-compose stop

# Stop and remove containers (preserves data volumes)
docker-compose down

# Stop and remove everything including volumes (⚠️ DELETES DATA)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# View last 100 lines
docker-compose logs --tail=100 backend

# View logs since specific time
docker-compose logs --since 2025-11-22T10:00:00
```

### Updating the Application

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild images
docker-compose build

# 3. Restart services with new images
docker-compose up -d

# 4. Verify health
curl http://localhost:3000/health

# 5. Check logs for any errors
docker-compose logs --tail=50 backend
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Force recreate containers
docker-compose up -d --force-recreate
```

### Scaling (Future Enhancement)

Currently, the application runs as a single backend instance. For horizontal scaling:

```bash
# This will be supported in future versions
docker-compose up -d --scale backend=3
```

## Backup and Restore

### Database Backup

#### Manual Backup

```bash
# Create backup directory
mkdir -p backups

# Backup database to SQL file
docker-compose exec postgres pg_dump -U boardgame boardgame > backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup file
ls -lh backups/
```

#### Automated Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_FILE"
docker-compose exec -T postgres pg_dump -U boardgame boardgame > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Backup successful: $BACKUP_FILE"
    gzip "$BACKUP_FILE"
    echo "✓ Compressed: $BACKUP_FILE.gz"
else
    echo "✗ Backup failed"
    exit 1
fi

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +7 -delete
```

Make it executable:

```bash
chmod +x scripts/backup.sh
```

Run backup:

```bash
./scripts/backup.sh
```

#### Scheduled Backups (Linux/macOS)

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/async-boardgame-service && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Database Restore

#### Restore from Backup

```bash
# Stop the backend service
docker-compose stop backend

# Restore database
docker-compose exec -T postgres psql -U boardgame boardgame < backups/backup-20251122-100000.sql

# Or restore from compressed backup
gunzip -c backups/backup-20251122-100000.sql.gz | docker-compose exec -T postgres psql -U boardgame boardgame

# Restart backend service
docker-compose start backend

# Verify restoration
curl http://localhost:3000/health
```

#### Complete Database Reset

⚠️ **WARNING**: This will delete all data!

```bash
# Stop all services
docker-compose down

# Remove database volume
docker volume rm async-boardgame-service_postgres-data

# Start services (will create fresh database)
docker-compose up -d

# Verify
curl http://localhost:3000/health
```

### Volume Backup (Alternative Method)

```bash
# Backup volume to tar file
docker run --rm \
  -v async-boardgame-service_postgres-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-volume-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Restore volume from tar file
docker run --rm \
  -v async-boardgame-service_postgres-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres-volume-20251122-100000.tar.gz -C /data
```

## Security Best Practices

### Production Security Checklist

- [ ] Change default database password to strong password (16+ characters)
- [ ] Restrict `.env` file permissions: `chmod 600 .env`
- [ ] Do not expose PostgreSQL port to host network
- [ ] Use HTTPS with reverse proxy (nginx/Caddy)
- [ ] Enable firewall rules to restrict access
- [ ] Regularly update Docker images
- [ ] Monitor logs for suspicious activity
- [ ] Implement rate limiting
- [ ] Use Docker secrets for sensitive data (advanced)
- [ ] Regular security audits and updates

### Password Requirements

Strong passwords should have:
- Minimum 16 characters
- Mix of uppercase and lowercase letters
- Numbers
- Special characters
- No dictionary words
- No personal information

Generate secure password:

```bash
# Linux/macOS
openssl rand -base64 24

# Or use a password manager
```

### Network Security

#### Default Configuration (Secure)

PostgreSQL is not exposed to the host network:

```yaml
# docker-compose.yml
postgres:
  # No ports section = internal only
  networks:
    - boardgame-network
```

#### Reverse Proxy Setup (Recommended for Production)

Use nginx or Caddy as a reverse proxy:

```nginx
# /etc/nginx/sites-available/boardgame
server {
    listen 80;
    server_name boardgame.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name boardgame.example.com;
    
    ssl_certificate /etc/letsencrypt/live/boardgame.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/boardgame.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Container Security

#### Run as Non-Root User

The Dockerfile already implements this:

```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

#### Security Scanning

Scan images for vulnerabilities:

```bash
# Using Docker Scout
docker scout cves async-boardgame-service-backend

# Using Trivy
trivy image async-boardgame-service-backend
```

### File Permissions

```bash
# Secure .env file
chmod 600 .env

# Secure backup directory
chmod 700 backups/

# Secure scripts
chmod 700 scripts/
```

## Troubleshooting

### Common Issues

#### Issue: Port 3000 Already in Use

**Symptoms:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**Solutions:**

1. Find process using port 3000:
```bash
# Linux/macOS
lsof -i :3000
# or
netstat -tulpn | grep 3000

# Kill the process
kill -9 <PID>
```

2. Change port in `.env`:
```bash
PORT=8080
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

#### Issue: Database Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

1. Check PostgreSQL container status:
```bash
docker-compose ps postgres
docker-compose logs postgres
```

2. Verify database is healthy:
```bash
docker-compose exec postgres pg_isready -U boardgame
```

3. Restart PostgreSQL:
```bash
docker-compose restart postgres
```

4. Check environment variables:
```bash
docker-compose exec backend env | grep DATABASE
```

#### Issue: Containers Won't Start

**Symptoms:**
```
Container exited with code 1
```

**Solutions:**

1. Check logs:
```bash
docker-compose logs backend
docker-compose logs postgres
```

2. Verify .env file exists and is valid:
```bash
cat .env
```

3. Rebuild images:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

4. Check disk space:
```bash
df -h
docker system df
```

#### Issue: Health Check Failing

**Symptoms:**
```
{
  "status": "unhealthy",
  "database": {
    "connected": false
  }
}
```

**Solutions:**

1. Check database connectivity:
```bash
docker-compose exec backend node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error);
"
```

2. Verify migrations ran:
```bash
docker-compose exec postgres psql -U boardgame -d boardgame -c "\dt"
```

3. Check backend logs:
```bash
docker-compose logs --tail=100 backend
```

#### Issue: Slow Performance

**Symptoms:**
- API requests taking >1 second
- High CPU usage

**Solutions:**

1. Check resource usage:
```bash
docker stats
```

2. Increase connection pool size in `.env`:
```bash
DB_POOL_SIZE=20
```

3. Check database query performance:
```bash
docker-compose exec postgres psql -U boardgame -d boardgame -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"
```

4. Add more resources to Docker:
- Docker Desktop → Settings → Resources
- Increase CPU and Memory allocation

#### Issue: Data Loss After Restart

**Symptoms:**
- Games disappear after `docker-compose down`

**Solutions:**

1. Verify volume exists:
```bash
docker volume ls | grep postgres-data
```

2. Don't use `-v` flag when stopping:
```bash
# WRONG (deletes volumes)
docker-compose down -v

# CORRECT (preserves volumes)
docker-compose down
```

3. Check volume mount:
```bash
docker-compose exec postgres df -h /var/lib/postgresql/data
```

### Debug Mode

Enable verbose logging:

```bash
# Edit .env
LOG_LEVEL=debug
NODE_ENV=development

# Restart
docker-compose restart backend

# View detailed logs
docker-compose logs -f backend
```

### Getting Help

If issues persist:

1. Collect diagnostic information:
```bash
# System info
docker version
docker-compose version
uname -a

# Container status
docker-compose ps

# Recent logs
docker-compose logs --tail=200 > debug-logs.txt

# Environment (redact sensitive data)
cat .env | sed 's/PASSWORD=.*/PASSWORD=***/' > debug-env.txt
```

2. Check GitHub issues: `<repository-url>/issues`
3. Create new issue with diagnostic information

## Production Recommendations

### Infrastructure

1. **Use a Reverse Proxy**
   - nginx or Caddy for HTTPS termination
   - SSL/TLS certificates (Let's Encrypt)
   - Rate limiting and DDoS protection

2. **Monitoring**
   - Set up health check monitoring (UptimeRobot, Pingdom)
   - Log aggregation (ELK stack, Grafana Loki)
   - Metrics collection (Prometheus + Grafana)

3. **Backups**
   - Automated daily backups
   - Off-site backup storage
   - Regular restore testing
   - Retention policy (30 days minimum)

4. **High Availability**
   - Multiple backend instances with load balancer
   - PostgreSQL replication (primary + replica)
   - Automatic failover
   - Health check-based routing

### Performance Optimization

1. **Database**
   - Increase connection pool size for high traffic
   - Regular VACUUM and ANALYZE
   - Monitor slow queries
   - Add indexes for common queries

2. **Application**
   - Enable HTTP/2
   - Implement caching (Redis)
   - CDN for static assets
   - Compression (gzip/brotli)

3. **Docker**
   - Use Docker Swarm or Kubernetes for orchestration
   - Resource limits and reservations
   - Health checks and auto-restart
   - Image optimization

### Maintenance

1. **Regular Updates**
   - Weekly security updates
   - Monthly dependency updates
   - Quarterly major version updates
   - Test updates in staging first

2. **Monitoring**
   - Daily health check verification
   - Weekly log review
   - Monthly performance analysis
   - Quarterly security audit

3. **Backup Verification**
   - Weekly backup integrity checks
   - Monthly restore testing
   - Quarterly disaster recovery drills

### Scaling Strategy

#### Vertical Scaling (Single Instance)

Increase resources:

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

#### Horizontal Scaling (Multiple Instances)

Future enhancement with load balancer:

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - backend
```

### Cost Optimization

1. **Resource Allocation**
   - Right-size containers based on actual usage
   - Use resource limits to prevent over-allocation
   - Monitor and adjust based on metrics

2. **Storage**
   - Regular cleanup of old logs
   - Compress backups
   - Archive old game data

3. **Network**
   - Use internal networks for service communication
   - Minimize external data transfer
   - Implement caching

## Development Mode

For development with hot-reloading:

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up

# Or with override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Development mode features:
- Source code mounted as volumes
- Hot-reloading enabled
- PostgreSQL port exposed (5432)
- Verbose logging
- Development-friendly error messages

## Additional Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose Documentation**: https://docs.docker.com/compose/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Project README**: See `README.md` for API documentation
- **API Documentation**: See `docs/API.md` for endpoint details

## Support

For issues, questions, or contributions:
- GitHub Issues: `<repository-url>/issues`
- Documentation: `<repository-url>/wiki`
- Email: `<support-email>`

---

**Last Updated**: November 22, 2025  
**Version**: 1.0.0
