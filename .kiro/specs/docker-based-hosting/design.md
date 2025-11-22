# Design Document

## Overview

This design document outlines the architecture for containerizing the Async Boardgame Service using Docker and migrating from in-memory storage to PostgreSQL. The solution provides a production-ready deployment that can run on a local server with minimal setup, while maintaining the existing hexagonal architecture and ensuring data persistence across service restarts.

The design focuses on three main areas:
1. **Containerization**: Multi-stage Docker builds for optimized images
2. **Database Integration**: PostgreSQL repository implementation with connection pooling and migrations
3. **Orchestration**: Docker Compose configuration with health checks and graceful shutdown

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Host                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Backend Service Container                          │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Node.js Application                         │  │    │
│  │  │  - Express API                               │  │    │
│  │  │  - Game Logic Services                       │  │    │
│  │  │  - PostgresGameRepository                    │  │    │
│  │  │  - Static Web Client Files                   │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │         │                                           │    │
│  │         │ TCP Connection (pg driver)                │    │
│  │         ▼                                           │    │
│  └─────────┼───────────────────────────────────────────┘    │
│            │                                                 │
│  ┌─────────┼───────────────────────────────────────────┐    │
│  │         ▼                                           │    │
│  │  PostgreSQL Container                               │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  PostgreSQL 15                               │  │    │
│  │  │  - games table                               │  │    │
│  │  │  - Persistent volume mount                   │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         │ HTTP :3000
         ▼
    External Clients
```

### Container Strategy


**Backend Service Container:**
- Multi-stage build: builder stage + production stage
- Builder stage: Compiles TypeScript for both backend and web client
- Production stage: Minimal Node.js Alpine image with compiled artifacts only
- Includes both API server and static web client files
- Single container simplifies deployment and reduces orchestration complexity

**PostgreSQL Container:**
- Official PostgreSQL 15 Alpine image
- Named volume for data persistence
- Not exposed to host network (internal only)
- Automatic initialization with schema on first run

### Database Schema Design

#### Games Table

The `games` table stores the complete game state as a JSONB document with indexed columns for common queries:

```sql
CREATE TABLE games (
    game_id VARCHAR(255) PRIMARY KEY,
    game_type VARCHAR(100) NOT NULL,
    lifecycle VARCHAR(50) NOT NULL,
    state JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_games_lifecycle ON games(lifecycle);
CREATE INDEX idx_games_game_type ON games(game_type);
CREATE INDEX idx_games_created_at ON games(created_at);
CREATE INDEX idx_games_players ON games USING GIN ((state->'players'));
```

**Design Rationale:**
- JSONB storage allows flexible game-specific metadata without schema changes
- Indexed columns enable efficient filtering and pagination
- GIN index on players array enables fast player-based queries
- Version column supports optimistic locking for concurrency control

#### Schema Migrations Table

```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Tracks which migrations have been applied to prevent duplicate execution.

## Components and Interfaces

### PostgresGameRepository


**Location:** `src/infrastructure/persistence/PostgresGameRepository.ts`

**Responsibilities:**
- Implements the `GameRepository` interface
- Manages PostgreSQL connection pool
- Serializes/deserializes GameState to/from JSONB
- Enforces optimistic locking on updates
- Handles database errors and connection failures

**Key Methods:**

```typescript
class PostgresGameRepository implements GameRepository {
  private pool: Pool;

  constructor(connectionString: string, poolSize: number = 10);
  
  async save(state: GameState): Promise<void>;
  async findById(gameId: string): Promise<GameState | null>;
  async findAll(filters: GameFilters): Promise<PaginatedResult<GameState>>;
  async findByPlayer(playerId: string, filters: GameFilters): Promise<PaginatedResult<GameState>>;
  async update(gameId: string, state: GameState, expectedVersion: number): Promise<GameState>;
  async delete(gameId: string): Promise<void>;
  
  async healthCheck(): Promise<boolean>;
  async close(): Promise<void>;
}
```

**Connection Pooling:**
- Uses `pg` (node-postgres) library
- Configurable pool size (default: 10 connections)
- Automatic connection retry with exponential backoff
- Connection timeout: 30 seconds
- Idle timeout: 10 seconds

**Data Serialization:**
- GameState → JSONB: Direct JSON.stringify with Date handling
- JSONB → GameState: JSON.parse with Date reconstruction
- Dates stored as ISO 8601 strings in JSONB
- Reconstructed as Date objects on retrieval

### DatabaseMigrator

**Location:** `src/infrastructure/persistence/DatabaseMigrator.ts`

**Responsibilities:**
- Applies SQL migration scripts in order
- Tracks applied migrations in schema_migrations table
- Ensures idempotent migration execution
- Provides rollback capability (future enhancement)

**Migration Files:**
- Located in `src/infrastructure/persistence/migrations/`
- Named with version prefix: `001_initial_schema.sql`, `002_add_indexes.sql`
- Executed in numerical order
- Each migration wrapped in a transaction

**Interface:**

```typescript
class DatabaseMigrator {
  constructor(pool: Pool);
  
  async applyMigrations(): Promise<void>;
  async getCurrentVersion(): Promise<number>;
  async isMigrationApplied(version: number): Promise<boolean>;
}
```

### Configuration Service

**Location:** `src/config/index.ts`

**Responsibilities:**
- Loads and validates environment variables
- Provides typed configuration object
- Fails fast on missing required config
- Supports default values for optional config

**Configuration Schema:**

```typescript
interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  database: {
    url: string;
    poolSize: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
  };
}
```

**Environment Variables:**
- `PORT`: HTTP server port (default: 3000)
- `NODE_ENV`: Environment mode (default: development)
- `DATABASE_URL`: PostgreSQL connection string (required)
- `DB_POOL_SIZE`: Connection pool size (default: 10)
- `LOG_LEVEL`: Logging verbosity (default: info)

### Health Check Endpoint

**Location:** `src/adapters/rest/healthRoutes.ts`

**Endpoint:** `GET /health`

**Response Format:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-22T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "database": {
    "connected": true,
    "responseTime": 5
  }
}
```

**Health Checks:**
1. Database connectivity test (simple SELECT 1 query)
2. Response time measurement
3. Returns 200 OK if healthy, 503 Service Unavailable if unhealthy

## Data Models

### GameState Persistence


**Storage Strategy:**

The complete `GameState` object is stored as JSONB in the `state` column, with frequently-queried fields extracted to indexed columns:

```typescript
// Database row structure
interface GameRow {
  game_id: string;        // Extracted from GameState.gameId
  game_type: string;      // Extracted from GameState.gameType
  lifecycle: string;      // Extracted from GameState.lifecycle
  state: object;          // Complete GameState as JSONB
  version: number;        // Extracted from GameState.version
  created_at: Date;       // Extracted from GameState.createdAt
  updated_at: Date;       // Extracted from GameState.updatedAt
}
```

**Serialization Example:**

```typescript
// Save operation
const row = {
  game_id: state.gameId,
  game_type: state.gameType,
  lifecycle: state.lifecycle,
  state: JSON.stringify(state),
  version: state.version,
  created_at: state.createdAt,
  updated_at: state.updatedAt
};

// Retrieve operation
const state: GameState = {
  ...JSON.parse(row.state),
  createdAt: new Date(row.state.createdAt),
  updatedAt: new Date(row.state.updatedAt),
  players: row.state.players.map(p => ({
    ...p,
    joinedAt: new Date(p.joinedAt)
  })),
  moveHistory: row.state.moveHistory.map(m => ({
    ...m,
    timestamp: new Date(m.timestamp)
  }))
};
```

### Query Optimization

**Player-based queries:**

```sql
-- Find games by player ID
SELECT * FROM games 
WHERE state->'players' @> '[{"id": "player-123"}]'::jsonb
AND lifecycle = 'active'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**Pagination:**
- Uses LIMIT/OFFSET for simplicity
- Counts total rows with separate COUNT query
- Future optimization: cursor-based pagination for large datasets

## Error Handling

### Database Connection Errors

**Startup Behavior:**
- Application attempts database connection on startup
- Retries connection up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Fails fast after max retries with clear error message
- Logs connection attempts and failures

**Runtime Behavior:**
- Connection pool handles transient failures automatically
- Query timeouts return 503 Service Unavailable
- Connection exhaustion logs warning and queues requests
- Health check endpoint reflects database status

### Migration Errors

**Failure Handling:**
- Each migration runs in a transaction
- Rollback on error prevents partial application
- Application startup fails if migrations fail
- Clear error messages indicate which migration failed

### Optimistic Locking Conflicts

**Concurrency Control:**
- Update operations check version number
- Throws `ConcurrencyError` if version mismatch
- Client receives 409 Conflict response
- Client must fetch latest state and retry

### Data Serialization Errors

**Invalid Data:**
- Validation on deserialization
- Logs corrupted data for investigation
- Returns 500 Internal Server Error
- Prevents application crash

## Testing Strategy


### Unit Tests

**PostgresGameRepository Tests:**
- Mock `pg` Pool for isolated testing
- Test each CRUD operation independently
- Verify SQL query construction
- Test error handling paths
- Test serialization/deserialization

**DatabaseMigrator Tests:**
- Mock Pool and test migration logic
- Verify migration ordering
- Test idempotency (applying same migration twice)
- Test transaction rollback on error

### Integration Tests

**Database Integration:**
- Use Testcontainers or Docker Compose for test database
- Test actual PostgreSQL interactions
- Verify indexes are used (EXPLAIN ANALYZE)
- Test concurrent updates and optimistic locking
- Test connection pool behavior under load

**End-to-End Tests:**
- Start full Docker Compose stack
- Test API endpoints with real database
- Verify data persistence across container restarts
- Test health check endpoint

### Test Database Strategy

**Option 1: Testcontainers (Recommended)**
- Spins up PostgreSQL container per test suite
- Automatic cleanup
- Isolated test environment
- Requires Docker on CI/CD

**Option 2: Shared Test Database**
- Single PostgreSQL instance for all tests
- Faster test execution
- Requires cleanup between tests
- Risk of test interference

## Docker Configuration

### Dockerfile

**Multi-Stage Build:**

```dockerfile
# Stage 1: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Build web client
FROM node:20-alpine AS web-builder
WORKDIR /app/web-client
COPY web-client/package*.json ./
RUN npm ci
COPY web-client ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy built artifacts
COPY --from=backend-builder /app/dist ./dist
COPY --from=web-builder /app/web-client/dist ./web-client/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
```

**Image Size Optimization:**
- Alpine base image (~5MB vs ~100MB for standard Node)
- Multi-stage build discards build tools
- Production dependencies only in final image
- Expected final image size: ~150-200MB

### Docker Compose

**Production Configuration (docker-compose.yml):**

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://boardgame:${DB_PASSWORD}@postgres:5432/boardgame
      - DB_POOL_SIZE=10
      - LOG_LEVEL=info
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - boardgame-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=boardgame
      - POSTGRES_USER=boardgame
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U boardgame"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - boardgame-network

volumes:
  postgres-data:
    driver: local

networks:
  boardgame-network:
    driver: bridge
```

**Development Configuration (docker-compose.dev.yml):**

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://boardgame:devpassword@postgres:5432/boardgame
      - LOG_LEVEL=debug
    volumes:
      - ./src:/app/src
      - ./web-client:/app/web-client
    command: npm run dev:all

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"  # Exposed for debugging
    environment:
      - POSTGRES_DB=boardgame
      - POSTGRES_USER=boardgame
      - POSTGRES_PASSWORD=devpassword
    volumes:
      - postgres-dev-data:/var/lib/postgresql/data

volumes:
  postgres-dev-data:
```

### Environment Variables

**.env.example:**

```bash
# Database
DB_PASSWORD=changeme_in_production

# Application
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
DB_POOL_SIZE=10
```

## Deployment Workflow


### Initial Deployment

1. **Prerequisites Check:**
   - Verify Docker and Docker Compose installed
   - Check available disk space (minimum 2GB)
   - Verify port 3000 is available

2. **Configuration:**
   - Copy `.env.example` to `.env`
   - Set secure `DB_PASSWORD`
   - Adjust other settings as needed

3. **Build and Start:**
   - Run `docker-compose build`
   - Run `docker-compose up -d`
   - Wait for health checks to pass

4. **Verification:**
   - Check `docker-compose ps` for running containers
   - Test health endpoint: `curl http://localhost:3000/health`
   - Access web UI: `http://localhost:3000`

### Updates and Maintenance

**Application Updates:**
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d

# Verify health
docker-compose ps
curl http://localhost:3000/health
```

**Database Backups:**
```bash
# Backup
docker-compose exec postgres pg_dump -U boardgame boardgame > backup.sql

# Restore
docker-compose exec -T postgres psql -U boardgame boardgame < backup.sql
```

**Log Viewing:**
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Startup Script

**startup.sh:**

The startup script automates the deployment process:

1. **Dependency Check:**
   - Checks for Docker installation
   - Checks for Docker Compose installation
   - Verifies Docker daemon is running
   - Checks port availability

2. **Environment Setup:**
   - Creates `.env` from `.env.example` if missing
   - Prompts for database password if not set
   - Validates environment configuration

3. **Build and Deploy:**
   - Builds Docker images with progress output
   - Starts containers with health check monitoring
   - Waits for services to be healthy (timeout: 60s)

4. **Post-Deployment:**
   - Displays service status
   - Shows application URL
   - Provides next steps and common commands

**Usage:**
```bash
# Production deployment
./startup.sh

# Development mode
./startup.sh --dev

# Skip build (use existing images)
./startup.sh --no-build

# Verbose output
./startup.sh --verbose
```

## Graceful Shutdown

### Signal Handling

**SIGTERM Handler:**

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown...');
  
  // 1. Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // 2. Wait for in-flight requests (max 30s)
  await waitForInFlightRequests(30000);
  
  // 3. Close database connections
  await gameRepository.close();
  console.log('Database connections closed');
  
  // 4. Exit
  process.exit(0);
});
```

**Docker Configuration:**
- Stop grace period: 30 seconds
- Sends SIGTERM first
- Sends SIGKILL after grace period
- Allows time for graceful shutdown

### Connection Draining

**In-Flight Request Tracking:**
- Middleware tracks active requests
- Shutdown waits for counter to reach zero
- Timeout ensures eventual termination
- New requests receive 503 during shutdown

## Monitoring and Observability

### Logging

**Structured Logging:**

```typescript
// Production format (JSON)
{
  "timestamp": "2025-11-22T10:30:00.000Z",
  "level": "info",
  "message": "Game created",
  "gameId": "game-123",
  "gameType": "tic-tac-toe",
  "requestId": "req-456"
}

// Development format (pretty)
[2025-11-22 10:30:00] INFO: Game created (gameId=game-123, gameType=tic-tac-toe)
```

**Log Levels:**
- ERROR: Application errors, database failures
- WARN: Retries, degraded performance
- INFO: Request logs, game events
- DEBUG: Detailed execution flow

**Log Aggregation:**
- Docker logs stored in JSON format
- Accessible via `docker-compose logs`
- Can be forwarded to external systems (future)

### Metrics

**Health Endpoint Metrics:**
- Service uptime
- Database connection status
- Response time
- Version information

**Future Enhancements:**
- Prometheus metrics endpoint
- Request rate and latency histograms
- Active game count
- Database connection pool stats

## Security Considerations


### Database Security

**Network Isolation:**
- PostgreSQL not exposed to host network by default
- Only accessible from backend container via internal network
- Development mode can expose for debugging (optional)

**Credentials:**
- Database password stored in `.env` file
- `.env` file excluded from version control (.gitignore)
- Strong password required for production
- Default development password clearly marked as insecure

**SQL Injection Prevention:**
- Parameterized queries only (no string concatenation)
- `pg` library handles escaping automatically
- Input validation before database operations

### Container Security

**Non-Root User:**
- Application runs as `nodejs` user (UID 1001)
- Reduces impact of container escape vulnerabilities
- Follows Docker security best practices

**Image Security:**
- Official base images only (node:20-alpine, postgres:15-alpine)
- Minimal attack surface with Alpine Linux
- Regular base image updates recommended

**Secrets Management:**
- Environment variables for configuration
- No secrets in Dockerfile or source code
- `.env` file for local deployment
- Future: Docker secrets or external secret management

### Network Security

**Firewall Configuration:**
- Only port 3000 exposed to host
- PostgreSQL port 5432 internal only (production)
- Use reverse proxy (nginx) for HTTPS in production
- Rate limiting recommended (future enhancement)

## Performance Considerations

### Database Performance

**Connection Pooling:**
- Default pool size: 10 connections
- Prevents connection exhaustion
- Reuses connections for efficiency
- Configurable based on load

**Query Optimization:**
- Indexes on frequently queried columns
- GIN index for JSONB player queries
- EXPLAIN ANALYZE for query tuning
- Pagination limits result set size

**JSONB Performance:**
- Fast for read-heavy workloads
- Efficient storage with compression
- Flexible schema without migrations
- Trade-off: Slightly slower than normalized tables

### Application Performance

**Startup Time:**
- Database connection: ~1-2 seconds
- Migration application: ~1-5 seconds (depends on migrations)
- Total startup: ~5-10 seconds
- Health check start period: 40 seconds

**Request Latency:**
- Simple queries: <10ms
- Complex queries with joins: <50ms
- Game state serialization: <5ms
- Target p95 latency: <100ms

### Scalability Limitations

**Single Instance:**
- Current design: single backend container
- Vertical scaling only (more CPU/RAM)
- Database connection pool limits concurrency
- Suitable for small to medium deployments

**Future Horizontal Scaling:**
- Multiple backend containers with load balancer
- Shared PostgreSQL instance
- Distributed locking for game state (Redis)
- Session affinity not required (stateless API)

## Migration from In-Memory Storage

### Backward Compatibility

**Interface Compatibility:**
- PostgresGameRepository implements same GameRepository interface
- No changes required to service layer
- Drop-in replacement for InMemoryGameRepository
- Tests verify interface compliance

**Data Format:**
- GameState structure unchanged
- Serialization preserves all fields
- Date objects handled correctly
- Metadata preserved as-is

### Migration Steps

1. **Implement PostgresGameRepository**
   - Create repository class
   - Implement all interface methods
   - Add connection pooling
   - Handle serialization

2. **Create Migration Scripts**
   - Initial schema creation
   - Index creation
   - Migration tracking table

3. **Update Application Bootstrap**
   - Replace InMemoryGameRepository with PostgresGameRepository
   - Add database configuration
   - Add migration execution

4. **Testing**
   - Unit tests for repository
   - Integration tests with real database
   - Verify all existing tests pass

5. **Documentation**
   - Update README with database requirements
   - Document environment variables
   - Provide migration guide

### Rollback Plan

**If Issues Arise:**
- Revert to InMemoryGameRepository in code
- Redeploy previous version
- Data loss acceptable (no production data yet)
- Future: Export/import utilities for data migration

## Future Enhancements

### Database Optimizations

**Read Replicas:**
- Separate read and write operations
- Scale read capacity independently
- Reduce load on primary database

**Caching Layer:**
- Redis for frequently accessed games
- Cache invalidation on updates
- Reduce database load

**Normalized Schema:**
- Separate tables for players, moves
- Better query performance for complex joins
- More complex migration process

### Monitoring Improvements

**Prometheus Integration:**
- Metrics endpoint for Prometheus scraping
- Custom metrics for game events
- Grafana dashboards

**Distributed Tracing:**
- OpenTelemetry integration
- Request tracing across services
- Performance bottleneck identification

### Deployment Enhancements

**CI/CD Pipeline:**
- Automated testing on push
- Automated Docker builds
- Automated deployment to staging/production

**Blue-Green Deployment:**
- Zero-downtime updates
- Quick rollback capability
- Database migration challenges

**Kubernetes Support:**
- Helm charts for Kubernetes deployment
- Horizontal pod autoscaling
- Managed PostgreSQL (Cloud SQL, RDS)
