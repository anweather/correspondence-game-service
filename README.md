# Async Boardgame Service

A generic, pluggable platform for managing turn-based board games through RESTful web APIs. This service enables correspondence-style gameplay where players can make moves asynchronously, retrieve game state, and generate visual board representations.

## Features

- 🎮 **Pluggable Game Engine Architecture** - Add new board games without modifying core service code
- 🔄 **Asynchronous Turn-Based Gameplay** - Players make moves at their own pace via REST API
- 🎨 **Automatic Board Visualization** - Generate SVG/PNG images of game boards
- 🔒 **Optimistic Locking** - Safe concurrent game state management
- 👥 **Multi-Player Support** - 2-8 players per game with flexible join mechanics
- 📊 **Game Lifecycle Management** - Track games from creation through completion

## Prerequisites

- **Node.js** 20 or higher
- **npm** or **yarn**
- **Docker** and **Docker Compose** (for containerized deployment)

## Quick Start

### Option 1: Docker Deployment (Recommended)

The easiest way to run the service with persistent PostgreSQL storage:

```bash
# Start the service with Docker Compose
docker-compose up -d

# Check service health
curl http://localhost:3000/health

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

The service will be available at `http://localhost:3000` with data persisted in a Docker volume.

For detailed deployment instructions, troubleshooting, and production configuration, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Option 2: Local Development

For local development without Docker:

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and configure as needed (authentication is disabled by default)

# Run tests
npm run test:run

# Start development server
npm run dev

# Build for production
npm run build
```

The server will start on `http://localhost:3000` (or the port specified in your environment).

**Note**: Authentication is disabled by default for local development. See the [Authentication](#authentication) section below for details.

## Project Structure

```
async-boardgame-service/
├── src/
│   ├── domain/              # Core domain models and interfaces
│   │   ├── models/          # GameState, Player, Move, Board, etc.
│   │   ├── interfaces/      # GameEnginePlugin, GameRepository
│   │   └── errors/          # Domain-specific error classes
│   │
│   ├── application/         # Service layer (use cases)
│   │   ├── services/        # GameManagerService, StateManagerService
│   │   ├── PluginRegistry.ts
│   │   └── GameLockManager.ts
│   │
│   ├── infrastructure/      # External concerns
│   │   ├── persistence/     # Repository implementations
│   │   └── rendering/       # RendererService, SVG generation
│   │
│   ├── adapters/            # External interfaces
│   │   ├── rest/            # Express controllers and routes
│   │   └── plugins/         # Game engine implementations
│   │       └── tic-tac-toe/ # Example: Tic-Tac-Toe plugin
│   │
│   └── index.ts             # Application entry point
│
└── tests/                   # Test files
    ├── unit/                # Unit tests
    ├── integration/         # Integration tests
    ├── e2e/                 # End-to-end tests
    └── utils/               # Test utilities and fixtures
```

## Architecture

This project follows **Hexagonal Architecture (Ports and Adapters)** to maintain clear boundaries and enable testability:

- **Domain Layer**: Pure business logic, game-agnostic core concepts
- **Application Layer**: Service orchestration, use cases, concurrency control
- **Infrastructure Layer**: Technical capabilities (persistence, rendering)
- **Adapters Layer**: External interfaces (REST API, game plugins)

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js
- **Web Framework**: Express
- **Testing**: Jest with TypeScript support
- **Image Generation**: SVG.js for board rendering
- **Database**: PostgreSQL 15 (production), In-memory (development/testing)
- **Containerization**: Docker and Docker Compose

## Authentication

The service supports optional authentication using [Clerk](https://clerk.com), a managed authentication service. Authentication is **disabled by default** for local development and can be enabled for production/Docker deployments.

### Authentication Modes

#### Development Mode (Default)
- Authentication is **disabled** by default (`AUTH_ENABLED=false`)
- All API endpoints are accessible without authentication
- No Clerk configuration required
- Ideal for local development and testing

#### Production Mode
- Authentication is **enabled** (`AUTH_ENABLED=true`)
- Protected endpoints require valid Clerk session tokens
- OAuth providers: Discord, Google, GitHub
- User identities are managed through Clerk

### Quick Setup for Production

1. **Create a Clerk Account**
   - Sign up at [https://clerk.com](https://clerk.com)
   - Create a new application in the Clerk dashboard

2. **Configure OAuth Providers**
   - In Clerk dashboard, go to **Configure > Social Connections**
   - Enable Discord, Google, and/or GitHub
   - Configure OAuth redirect URLs

3. **Get API Keys**
   - In Clerk dashboard, go to **Configure > API Keys**
   - Copy your **Publishable Key** (starts with `pk_`)
   - Copy your **Secret Key** (starts with `sk_`)

4. **Configure Environment Variables**
   ```bash
   # Enable authentication
   AUTH_ENABLED=true
   
   # Add Clerk keys
   CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   CLERK_SECRET_KEY=sk_test_your_secret_key_here
   ```

5. **Configure Web Client**
   ```bash
   # In web-client/.env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

### Disabling Authentication for Local Development

Authentication is disabled by default. To explicitly disable it:

```bash
# In .env
AUTH_ENABLED=false
```

When authentication is disabled:
- No Clerk configuration is required
- All API endpoints work without authentication headers
- Player IDs can be any string value
- Ideal for rapid development and testing

### Protected vs Public Endpoints

When authentication is **enabled**:

**Protected Endpoints** (require authentication):
- `POST /api/games` - Create a new game
- `POST /api/games/:gameId/moves` - Make a move
- `POST /api/games/:gameId/join` - Join a game

**Public Endpoints** (no authentication required):
- `GET /api/games` - List games
- `GET /api/games/:gameId` - View game state
- `GET /api/games/:gameId/board.svg` - View board rendering
- `GET /api/game-types` - List available game types
- `GET /health` - Health check

### Authentication Flow

1. User clicks "Sign In" in web client
2. Clerk handles OAuth flow with chosen provider (Discord/Google/GitHub)
3. User authorizes the application
4. Clerk creates a session and returns a token
5. Web client includes token in API requests
6. Backend validates token with Clerk and associates actions with user identity

### Testing with Authentication

For testing authenticated endpoints:

```bash
# 1. Get a session token from Clerk (via web client or Clerk API)
# 2. Include it in the Authorization header

curl -X POST http://localhost:3000/api/games \
  -H "Authorization: Bearer <clerk_session_token>" \
  -H "Content-Type: application/json" \
  -d '{"gameType": "tic-tac-toe"}'
```

For detailed Clerk setup instructions, see [CLERK_SETUP_GUIDE.md](./CLERK_SETUP_GUIDE.md).

## Home Server Deployment

Deploy to your own home server with a custom domain:

**Quick Start** (30 minutes):
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/full-setup.sh | sudo bash -s -- \
  --domain games.yourdomain.com \
  --email your@email.com \
  --db-password "YourSecurePassword123!"
```

This automated script will:
- ✅ Install Docker, Nginx, and all dependencies
- ✅ Configure SSL with Let's Encrypt (automatic HTTPS)
- ✅ Deploy the application with PostgreSQL
- ✅ Set up automated daily backups
- ✅ Configure health monitoring and auto-restart
- ✅ Configure firewall rules

**What you need**:
- Linux server (Ubuntu 20.04+)
- Domain name pointing to your server
- Router with port forwarding (80, 443)

**Documentation**:
- [Quick Start Guide](./docs/QUICK_START_HOME_SERVER.md) - Get running in 30 minutes
- [Complete Home Server Guide](./docs/HOME_SERVER_DEPLOYMENT.md) - Detailed setup and troubleshooting
- [GitHub Actions Auto-Deployment](./docs/GITHUB_ACTIONS_SETUP.md) - Push to deploy

## Docker Deployment

The service is fully containerized and ready for production deployment with Docker.

### Quick Start with Docker

```bash
# Clone the repository
git clone <repository-url>
cd async-boardgame-service

# Copy environment template
cp .env.example .env

# Edit .env and set a secure database password
# DB_PASSWORD=your_secure_password_here

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# Check health
curl http://localhost:3000/health
```

### Docker Architecture

The Docker setup includes:
- **Backend Service**: Node.js application with Express API and React web client
- **PostgreSQL Database**: Persistent game state storage with automatic migrations
- **Named Volume**: Data persistence across container restarts
- **Health Checks**: Automatic service monitoring and restart policies

### Common Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose build
docker-compose up -d

# Database backup
docker-compose exec postgres pg_dump -U boardgame boardgame > backup.sql

# Database restore
docker-compose exec -T postgres psql -U boardgame boardgame < backup.sql

# Clean up (removes containers and volumes)
docker-compose down -v
```

### Development Mode

For development with hot-reloading:

```bash
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use the dev configuration directly
docker-compose -f docker-compose.dev.yml up
```

### Environment Configuration

Key environment variables (see `.env.example` for full list):

**Database:**
- `DB_PASSWORD`: PostgreSQL password (required)
- `DB_POOL_SIZE`: Database connection pool size (default: 10)

**Application:**
- `PORT`: HTTP server port (default: 3000)
- `NODE_ENV`: Environment mode (production/development)
- `LOG_LEVEL`: Logging verbosity (debug/info/warn/error)

**Authentication:**
- `AUTH_ENABLED`: Enable/disable authentication (default: false)
- `CLERK_PUBLISHABLE_KEY`: Clerk publishable key (required when AUTH_ENABLED=true)
- `CLERK_SECRET_KEY`: Clerk secret key (required when AUTH_ENABLED=true)

### Production Deployment

For production deployment:

1. Set a strong `DB_PASSWORD` in `.env`
2. Configure appropriate `LOG_LEVEL` (info or warn)
3. Set `NODE_ENV=production`
4. Consider using a reverse proxy (nginx) for HTTPS
5. Set up regular database backups
6. Monitor logs and health endpoint

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment documentation including:
- Detailed setup instructions
- Security best practices
- Backup and restore procedures
- Troubleshooting guide
- Production recommendations

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run all tests once
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Lint code with ESLint
npm run format           # Format code with Prettier
npm run type-check       # Check TypeScript types
```

## REST API Documentation

See [API.md](./docs/API.md) for complete API documentation with examples.

### Quick API Overview

#### Game Management

```bash
# Create a new game
POST /api/games
{
  "gameType": "tic-tac-toe",
  "config": {
    "players": [
      { "id": "player1", "name": "Alice" },
      { "id": "player2", "name": "Bob" }
    ]
  }
}

# Get game state
GET /api/games/:gameId

# List games
GET /api/games?playerId=player1&lifecycle=active

# Join a game
POST /api/games/:gameId/join
{
  "id": "player3",
  "name": "Charlie"
}

# List available game types
GET /api/game-types
```

#### Gameplay

```bash
# Make a move
POST /api/games/:gameId/moves
{
  "playerId": "player1",
  "move": {
    "action": "place",
    "parameters": { "row": 0, "col": 0 }
  },
  "version": 5
}

# Get move history
GET /api/games/:gameId/moves
```

#### Rendering

```bash
# Get board as SVG
GET /api/games/:gameId/board.svg

# Get board as PNG
GET /api/games/:gameId/board.png
```

## Plugin Development Guide

See [PLUGIN_DEVELOPMENT.md](./docs/PLUGIN_DEVELOPMENT.md) for a complete guide to creating custom game plugins.

### Quick Plugin Example

Here's a minimal game plugin structure:

```typescript
import { BaseGameEngine } from '@domain/interfaces';
import { GameState, Player, Move } from '@domain/models';

export class MyGameEngine extends BaseGameEngine {
  getGameType(): string {
    return 'my-game';
  }

  getMinPlayers(): number {
    return 2;
  }

  getMaxPlayers(): number {
    return 4;
  }

  getDescription(): string {
    return 'My custom board game';
  }

  initializeGame(players: Player[], config: GameConfig): GameState {
    // Create initial game state
  }

  validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
    // Validate if move is legal
  }

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    // Apply move and return new state
  }

  renderBoard(state: GameState): BoardRenderData {
    // Generate visual representation
  }
}
```

## Test-Driven Development

This project follows strict **TDD (Test-Driven Development)** methodology:

1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### Test Utilities

The project includes comprehensive test utilities in `tests/utils/`:

```typescript
import { GameStateBuilder, MockGameEngine, fixtures } from '@tests/utils';

// Use the builder pattern for test data
const gameState = new GameStateBuilder()
  .withGameType('tic-tac-toe')
  .withPlayers([player1, player2])
  .withLifecycle(GameLifecycle.ACTIVE)
  .build();

// Use pre-configured fixtures
const game = fixtures.twoPlayerGame();

// Use mock engine for testing
const mockEngine = new MockGameEngine('test-game')
  .withMinPlayers(2)
  .withValidationResult({ valid: true });
```

See [TESTING.md](./docs/TESTING.md) for complete testing documentation.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes (TDD approach)
4. Implement your changes
5. Ensure all tests pass (`npm run test:run`)
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Commit Message Format

```
<type>: <short summary>

<optional detailed description>

- Requirement(s): <requirement IDs>
- Tests: <test coverage info>
```

Types: `feat`, `test`, `refactor`, `fix`, `docs`, `chore`

## License

MIT
