# System Architecture

## Simple Overview

```
┌─────────────┐
│    User     │
│  (Browser)  │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│          Cloudflare                 │
│  • SSL/TLS Termination             │
│  • DDoS Protection                 │
│  • CDN & Caching                   │
│  • Web Application Firewall        │
└──────────────┬──────────────────────┘
               │ HTTPS (Origin Cert)
               │ Port 8443
               ▼
┌─────────────────────────────────────┐
│      Your Home Server               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Nginx (Reverse Proxy)        │ │
│  │  Ports: 8080 (HTTP)           │ │
│  │         8443 (HTTPS)          │ │
│  └─────────────┬─────────────────┘ │
│                │                    │
│                ▼                    │
│  ┌───────────────────────────────┐ │
│  │  Docker Compose               │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │  Backend Container      │ │ │
│  │  │  • Node.js + Express    │ │ │
│  │  │  • React Web Client     │ │ │
│  │  │  • Port 3000            │ │ │
│  │  └──────────┬──────────────┘ │ │
│  │             │                 │ │
│  │             ▼                 │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │  PostgreSQL Container   │ │ │
│  │  │  • Port 5432 (internal) │ │ │
│  │  │  • Persistent Volume    │ │ │
│  │  └─────────────────────────┘ │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Request Flow

1. **User** → Makes HTTPS request to `yourdomain.com`
2. **Cloudflare** → Terminates SSL, applies security rules, caches content
3. **Cloudflare** → Forwards to your server on port 8443 (encrypted with Origin Certificate)
4. **Nginx** → Receives request, applies rate limiting, forwards to backend
5. **Backend** → Processes request, queries database if needed
6. **PostgreSQL** → Returns data to backend
7. **Backend** → Returns response through Nginx → Cloudflare → User

## Key Components

### Cloudflare (External)
- **Purpose**: CDN, security, SSL/TLS
- **Cost**: Free tier
- **SSL**: Manages public certificates automatically
- **Features**: DDoS protection, WAF, caching, analytics

### Nginx (Host)
- **Purpose**: Reverse proxy, rate limiting
- **Ports**: 8080 (HTTP), 8443 (HTTPS)
- **SSL**: Cloudflare Origin Certificate (15-year validity)
- **Config**: `/etc/nginx/sites-available/`

### Backend Container (Docker)
- **Tech**: Node.js + Express + React
- **Port**: 3000 (internal only)
- **Features**: REST API, game logic, web UI
- **Health**: `/health` endpoint

### PostgreSQL Container (Docker)
- **Port**: 5432 (internal only, not exposed)
- **Storage**: Docker volume (persistent)
- **Database**: `boardgame`

## Network Ports

| Port | Protocol | Purpose | Exposed |
|------|----------|---------|---------|
| 22   | TCP      | SSH     | Yes (firewall protected) |
| 3000 | TCP      | Backend | No (internal only) |
| 5432 | TCP      | PostgreSQL | No (internal only) |
| 8080 | TCP      | Nginx HTTP | Yes (Cloudflare origin) |
| 8443 | TCP      | Nginx HTTPS | Yes (Cloudflare origin) |

## Security Layers

1. **Cloudflare**: DDoS protection, WAF, bot filtering
2. **Firewall (UFW)**: Only ports 22, 8080, 8443 open
3. **Fail2ban**: Brute force protection for SSH
4. **Nginx**: Rate limiting, security headers
5. **Docker**: Container isolation, no root user
6. **PostgreSQL**: Internal network only, strong password

## Data Flow

### Creating a Game
```
User → Cloudflare → Nginx → Backend → PostgreSQL
                                    ↓
                              Store game state
                                    ↓
User ← Cloudflare ← Nginx ← Backend ← PostgreSQL
```

### Making a Move
```
User → Cloudflare → Nginx → Backend → Game Engine
                                    ↓
                              Validate move
                                    ↓
                              PostgreSQL (update state)
                                    ↓
User ← Cloudflare ← Nginx ← Backend ← PostgreSQL
```

## Deployment Architecture

### Development
```
Developer → Git Push → GitHub
                         ↓
                    GitHub Actions
                         ↓
                    Run Tests
                         ↓
                    SSH to Server
                         ↓
                    Pull & Deploy
```

### Production
```
Internet → Cloudflare → Home Server → Docker Compose
```

## File Structure

```
/opt/async-boardgame-service/     # Application root
├── docker-compose.yml            # Container orchestration
├── .env                          # Environment variables
├── src/                          # Backend source code
├── web-client/                   # React frontend
└── scripts/                      # Deployment scripts

/etc/nginx/                       # Nginx configuration
├── sites-available/
│   └── async-boardgame-service
└── sites-enabled/
    └── async-boardgame-service → ../sites-available/

/etc/ssl/cloudflare/              # SSL certificates
├── origin.pem                    # Cloudflare Origin Certificate
└── origin-key.pem                # Private key

/opt/backups/                     # Database backups
└── async-boardgame-service/
    └── backup-*.sql.gz
```

## Scaling Considerations

### Current Setup (Single Instance)
- **Capacity**: ~100 concurrent users
- **Bottleneck**: Single backend container
- **Database**: Single PostgreSQL instance

### Future Scaling Options
1. **Horizontal**: Multiple backend containers with load balancer
2. **Vertical**: Increase server resources (CPU, RAM)
3. **Database**: PostgreSQL replication (primary + replicas)
4. **Caching**: Add Redis for session/game state caching
5. **CDN**: Leverage Cloudflare caching for static assets

## Monitoring

- **Health Checks**: `/health` endpoint (every 5 minutes)
- **Logs**: Docker logs + Nginx access/error logs
- **Metrics**: Docker stats (CPU, memory, network)
- **Alerts**: Optional (email, Discord, Slack)

## Backup Strategy

- **Frequency**: Daily at 2 AM
- **Retention**: 7 days
- **Location**: `/opt/backups/async-boardgame-service/`
- **Format**: Compressed SQL dumps (`.sql.gz`)
- **Restore**: `./scripts/restore.sh backup-file.sql.gz`

## Documentation Map

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** ← You are here (simple overview)
- **[CLOUDFLARE_SETUP_GUIDE.md](./CLOUDFLARE_SETUP_GUIDE.md)** - Step-by-step Cloudflare setup
- **[CLOUDFLARE_ARCHITECTURE.md](./CLOUDFLARE_ARCHITECTURE.md)** - Detailed Cloudflare architecture
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Docker deployment guide
- **[API.md](./API.md)** - REST API documentation
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Clerk authentication setup

## Quick Links

**Setup Guides:**
- [Quick Start (30 min)](./QUICK_START_HOME_SERVER.md)
- [Cloudflare Setup](./CLOUDFLARE_SETUP_GUIDE.md)
- [GitHub Actions CI/CD](./GITHUB_ACTIONS_SETUP.md)

**Reference:**
- [API Documentation](./API.md)
- [Testing Guide](./TESTING.md)
- [Plugin Development](./PLUGIN_DEVELOPMENT.md)
