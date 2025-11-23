# Implementation Plan

- [x] 1. Set up database infrastructure and configuration
  - Create configuration service that loads and validates environment variables (PORT, NODE_ENV, DATABASE_URL, DB_POOL_SIZE, LOG_LEVEL)
  - Add `pg` (node-postgres) package dependency
  - Create database connection utility with connection pooling
  - Implement health check function for database connectivity
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Implement database schema and migrations
  - Create SQL migration file for initial schema (games table with JSONB state column)
  - Create schema_migrations tracking table
  - Add indexes on game_id, game_type, lifecycle, created_at, and GIN index on players
  - Implement DatabaseMigrator class to apply migrations on startup
  - Add migration execution to application bootstrap
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement PostgresGameRepository with TDD
- [x] 3.1 Write tests and implement basic repository structure
  - Write tests for PostgresGameRepository constructor and connection initialization
  - Write tests for serialization/deserialization of GameState to/from JSONB
  - Write tests for Date object conversion in serialization
  - Implement PostgresGameRepository class with constructor and serialization helpers
  - Verify all tests pass
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 3.2 Write tests and implement core CRUD operations
  - Write tests for save() method (insert new game)
  - Write tests for findById() method (found and not found cases)
  - Write tests for delete() method
  - Write tests for database error handling
  - Implement save(), findById(), and delete() methods
  - Verify all tests pass
  - _Requirements: 2.1, 2.2_

- [x] 3.3 Write tests and implement query operations with filtering and pagination
  - Write tests for findAll() with no filters
  - Write tests for findAll() with lifecycle and gameType filters
  - Write tests for findByPlayer() with player ID query
  - Write tests for pagination (multiple pages, edge cases)
  - Implement findAll() and findByPlayer() with filtering and pagination
  - Verify all tests pass
  - _Requirements: 2.4_

- [x] 3.4 Write tests and implement optimistic locking for updates
  - Write tests for successful update with correct version
  - Write tests for ConcurrencyError when version mismatch
  - Write tests for GameNotFoundError when game doesn't exist
  - Write tests for version increment on successful update
  - Implement update() method with optimistic locking
  - Verify all tests pass
  - _Requirements: 2.3_

- [x] 3.5 Write tests and implement connection management methods
  - Write tests for healthCheck() method (success and failure cases)
  - Write tests for close() method
  - Write tests for connection retry logic
  - Implement healthCheck(), close(), and retry logic
  - Verify all tests pass
  - _Requirements: 7.2, 10.3_

- [x] 4. Replace InMemoryGameRepository with PostgresGameRepository
  - Update src/index.ts to instantiate PostgresGameRepository instead of InMemoryGameRepository
  - Pass database configuration from config service to repository
  - Remove InMemoryGameRepository instantiation, but keep implementation in code
  - Ensure application starts only after database connection is established
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 5. Implement health check endpoint
  - Create healthRoutes.ts with GET /health endpoint
  - Include service status, uptime, timestamp, and version in response
  - Call repository.healthCheck() to verify database connectivity
  - Return HTTP 200 for healthy, HTTP 503 for unhealthy
  - Add health routes to Express app
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Implement graceful shutdown
  - Add SIGTERM signal handler to application
  - Stop accepting new HTTP requests on shutdown signal
  - Track in-flight requests with middleware counter
  - Wait for in-flight requests to complete (30s timeout)
  - Close database connections before exit
  - Log shutdown progress
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 7. Add structured logging
  - Install logging library or implement simple JSON logger
  - Configure log format based on NODE_ENV (JSON for production, pretty for development)
  - Add request ID generation middleware
  - Log database connection events, query errors, and important application events
  - Support configurable log levels via LOG_LEVEL environment variable
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Create Docker configuration
- [x] 8.1 Create multi-stage Dockerfile
  - Create builder stage for backend TypeScript compilation
  - Create web-builder stage for React client build
  - Create production stage with Node.js 20 Alpine base
  - Copy only production dependencies and built artifacts to final stage
  - Create non-root nodejs user and switch to it
  - Expose port 3000
  - Add Docker HEALTHCHECK using /health endpoint
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.5_

- [x] 8.2 Create .dockerignore file
  - Exclude node_modules, dist, .git, tests, and other unnecessary files
  - Reduce build context size for faster builds
  - _Requirements: 1.2_

- [x] 9. Create Docker Compose configuration
- [x] 9.1 Create docker-compose.yml for production
  - Define backend service with build configuration
  - Define postgres service with PostgreSQL 15 Alpine image
  - Configure environment variables for both services
  - Set up depends_on with health check condition
  - Create named volume for PostgreSQL data persistence
  - Create internal network for service communication
  - Configure restart policies
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.1, 11.2_

- [x] 9.2 Create docker-compose.dev.yml for development
  - Extend production configuration with development overrides
  - Add volume mounts for source code hot-reloading
  - Expose PostgreSQL port 5432 for debugging
  - Use development-friendly environment variables
  - Configure development command with watch mode
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 9.3 Create .env.example file
  - Document all environment variables with descriptions
  - Provide sensible default values
  - Include security warnings for production deployment
  - _Requirements: 5.3, 12.5_

- [ ] 10. Create startup script
- [ ] 10.1 Create startup.sh script with dependency checks
  - Check for Docker installation and provide installation instructions if missing
  - Check for Docker Compose installation
  - Verify Docker daemon is running
  - Check if port 3000 is available
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 10.2 Add environment setup to startup script
  - Copy .env.example to .env if it doesn't exist
  - Prompt user for database password if not set
  - Validate required environment variables
  - _Requirements: 6.4, 12.1_

- [ ] 10.3 Add build and startup logic to script
  - Build Docker images with progress output
  - Start containers with docker-compose up
  - Wait for health checks to pass (60s timeout)
  - Display service status and application URL
  - _Requirements: 6.4, 6.5_

- [ ] 10.4 Add command-line options to startup script
  - Support --dev flag for development mode
  - Support --no-build flag to skip image building
  - Support --verbose flag for detailed output
  - Make script executable (chmod +x)
  - _Requirements: 13.5_

- [ ] 11. Create deployment documentation
  - Create DEPLOYMENT.md with step-by-step deployment instructions
  - Document all environment variables and their purposes
  - Provide troubleshooting guide for common issues
  - Include examples for starting, stopping, viewing logs, and updating
  - Document backup and restore procedures for PostgreSQL data
  - Document security best practices and production recommendations
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 11.3, 11.4, 12.4_

- [ ] 12. Update main README
  - Add Docker deployment section to README.md
  - Link to DEPLOYMENT.md for detailed instructions
  - Update prerequisites to include Docker and Docker Compose
  - Add quick start commands for Docker deployment
  - _Requirements: 14.1_
