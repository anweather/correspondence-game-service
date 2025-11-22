# Requirements Document

## Introduction

This specification defines the requirements for containerizing the Async Boardgame Service using Docker and migrating from in-memory storage to a persistent PostgreSQL database. The solution will enable deployment on a local server with a simple startup script, providing production-ready hosting without cloud infrastructure dependencies.

## Glossary

- **Application**: The Async Boardgame Service, consisting of the backend API service and the React web client
- **Backend Service**: The Node.js/Express API server that manages game logic and state
- **Web Client**: The React-based frontend application that provides the user interface
- **Container**: A Docker container running either the Backend Service or PostgreSQL database
- **Docker Compose**: A tool for defining and running multi-container Docker applications
- **PostgreSQL**: An open-source relational database system used for persistent game state storage
- **Repository**: A data access layer component implementing the GameRepository interface
- **Migration**: The process of creating or updating database schema structures
- **Health Check**: An endpoint or mechanism to verify that a service is running correctly
- **Volume**: A Docker volume used to persist data outside of container lifecycles
- **Startup Script**: A shell script that automates the installation and startup of the Application

## Requirements

### Requirement 1: Docker Containerization

**User Story:** As a system administrator, I want the Application containerized using Docker, so that I can deploy it consistently across different environments

#### Acceptance Criteria

1. WHEN the Backend Service is built, THE Application SHALL create a Docker image using a multi-stage build process
2. THE Application SHALL include a Dockerfile that produces an optimized production image under 200MB
3. THE Application SHALL expose port 3000 for HTTP traffic in the container
4. WHEN the Web Client is built, THE Application SHALL include the compiled static assets in the Backend Service container
5. THE Application SHALL use Node.js 20 Alpine Linux as the base image for minimal size

### Requirement 2: Database Integration

**User Story:** As a developer, I want game state persisted in PostgreSQL, so that data survives service restarts and can be backed up

#### Acceptance Criteria

1. THE Application SHALL implement a PostgresGameRepository class that implements the GameRepository interface
2. WHEN a game is saved, THE PostgresGameRepository SHALL persist the game state to PostgreSQL with all fields intact
3. WHEN a game is updated, THE PostgresGameRepository SHALL enforce optimistic locking using version numbers
4. THE PostgresGameRepository SHALL support all query operations including findById, findAll, findByPlayer with filters and pagination
5. THE Application SHALL use a connection pool with configurable size for database connections

### Requirement 3: Database Schema Management

**User Story:** As a developer, I want automated database schema management, so that the database structure is created and updated reliably

#### Acceptance Criteria

1. THE Application SHALL include SQL migration scripts that create the required database schema
2. WHEN the Backend Service starts, THE Application SHALL automatically apply pending database migrations
3. THE Application SHALL create tables for games, players, moves, and any other required entities
4. THE Application SHALL create appropriate indexes on gameId, playerId, gameType, and lifecycle fields
5. THE Application SHALL validate database connectivity before accepting HTTP requests

### Requirement 4: Multi-Container Orchestration

**User Story:** As a system administrator, I want a single command to start all services, so that deployment is simple and reliable

#### Acceptance Criteria

1. THE Application SHALL provide a docker-compose.yml file that defines all required services
2. WHEN docker-compose is executed, THE Application SHALL start the Backend Service container and PostgreSQL container
3. THE Application SHALL configure the Backend Service to connect to PostgreSQL using environment variables
4. THE Application SHALL ensure the Backend Service waits for PostgreSQL to be ready before starting
5. THE Application SHALL mount Docker volumes for PostgreSQL data persistence

### Requirement 5: Environment Configuration

**User Story:** As a system administrator, I want configurable environment settings, so that I can customize the deployment without modifying code

#### Acceptance Criteria

1. THE Application SHALL read database connection settings from environment variables
2. THE Application SHALL support configuration of PORT, DATABASE_URL, DB_POOL_SIZE, and NODE_ENV
3. THE Application SHALL provide a .env.example file documenting all configuration options
4. WHEN environment variables are missing, THE Application SHALL use sensible default values
5. THE Application SHALL validate required environment variables at startup and fail fast with clear error messages

### Requirement 6: Startup Script

**User Story:** As a system administrator, I want a simple startup script, so that I can install and run the Application with minimal manual steps

#### Acceptance Criteria

1. THE Application SHALL provide a startup.sh script that automates installation and startup
2. WHEN the startup script is executed, THE Application SHALL verify Docker and Docker Compose are installed
3. WHEN dependencies are missing, THE Application SHALL display clear installation instructions
4. WHEN the startup script is executed, THE Application SHALL build Docker images and start all containers
5. THE Application SHALL display the application URL and health status after successful startup

### Requirement 7: Health Monitoring

**User Story:** As a system administrator, I want health check endpoints, so that I can monitor service availability

#### Acceptance Criteria

1. THE Backend Service SHALL expose a /health endpoint that returns service status
2. WHEN the health endpoint is called, THE Backend Service SHALL verify database connectivity
3. THE Backend Service SHALL return HTTP 200 when healthy and HTTP 503 when unhealthy
4. THE Backend Service SHALL include uptime, version, and database status in the health response
5. THE Application SHALL configure Docker health checks that use the /health endpoint

### Requirement 8: Data Migration from In-Memory Storage

**User Story:** As a developer, I want to replace in-memory storage with PostgreSQL, so that the Application is production-ready

#### Acceptance Criteria

1. THE Application SHALL remove the InMemoryGameRepository as the default repository implementation
2. WHEN the Backend Service starts, THE Application SHALL instantiate PostgresGameRepository instead of InMemoryGameRepository
3. THE Application SHALL maintain the same GameRepository interface contract
4. THE Application SHALL ensure all existing tests pass with the PostgreSQL implementation
5. THE Application SHALL provide configuration to switch between repository implementations for testing purposes

### Requirement 9: Logging and Debugging

**User Story:** As a developer, I want structured logging, so that I can troubleshoot issues in production

#### Acceptance Criteria

1. THE Backend Service SHALL output logs in JSON format when NODE_ENV is production
2. THE Backend Service SHALL log database connection events, query errors, and transaction failures
3. THE Backend Service SHALL include request IDs in logs for request tracing
4. WHEN a container fails, THE Application SHALL preserve logs in Docker log storage
5. THE Backend Service SHALL support configurable log levels via LOG_LEVEL environment variable

### Requirement 10: Graceful Shutdown

**User Story:** As a system administrator, I want graceful service shutdown, so that in-flight requests complete before the service stops

#### Acceptance Criteria

1. WHEN the Backend Service receives SIGTERM, THE Application SHALL stop accepting new requests
2. WHEN shutting down, THE Backend Service SHALL wait for in-flight requests to complete with a 30-second timeout
3. WHEN shutting down, THE Backend Service SHALL close database connections cleanly
4. WHEN shutting down, THE Backend Service SHALL log shutdown progress and completion
5. THE Application SHALL configure Docker to send SIGTERM and wait for graceful shutdown before forcing termination

### Requirement 11: Volume Management

**User Story:** As a system administrator, I want persistent data storage, so that game data survives container restarts

#### Acceptance Criteria

1. THE Application SHALL define a named Docker volume for PostgreSQL data
2. WHEN containers are stopped and restarted, THE Application SHALL preserve all game data
3. THE Application SHALL document backup procedures for the PostgreSQL volume
4. THE Application SHALL support volume mounting for database backups
5. WHEN containers are removed, THE Application SHALL retain the data volume unless explicitly deleted

### Requirement 12: Security Configuration

**User Story:** As a system administrator, I want secure default configurations, so that the Application is not vulnerable to common attacks

#### Acceptance Criteria

1. THE Application SHALL use strong default passwords for PostgreSQL that must be changed in production
2. THE Application SHALL not expose PostgreSQL port 5432 to the host machine by default
3. THE Application SHALL run containers as non-root users where possible
4. THE Application SHALL document security best practices in the README
5. THE Application SHALL use environment variables for sensitive configuration, not hardcoded values

### Requirement 13: Development vs Production Modes

**User Story:** As a developer, I want different configurations for development and production, so that I can develop efficiently while maintaining production security

#### Acceptance Criteria

1. THE Application SHALL provide separate docker-compose.yml and docker-compose.dev.yml files
2. WHEN running in development mode, THE Application SHALL enable hot-reloading and verbose logging
3. WHEN running in production mode, THE Application SHALL use optimized builds and structured logging
4. THE Application SHALL document the differences between development and production modes
5. THE startup script SHALL support a --dev flag to run in development mode

### Requirement 14: Documentation

**User Story:** As a new user, I want clear documentation, so that I can deploy the Application without prior Docker knowledge

#### Acceptance Criteria

1. THE Application SHALL include a DEPLOYMENT.md file with step-by-step deployment instructions
2. THE Application SHALL document all environment variables and their purposes
3. THE Application SHALL provide troubleshooting guidance for common issues
4. THE Application SHALL include examples of starting, stopping, and updating the Application
5. THE Application SHALL document backup and restore procedures for game data
