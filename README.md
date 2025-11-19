# Async Boardgame Service

A generic, pluggable platform for managing turn-based board games through RESTful web APIs. This service enables correspondence-style gameplay where players can make moves asynchronously, retrieve game state, and generate visual board representations.

## Features

- 🎮 **Pluggable Game Engine Architecture** - Add new board games without modifying core service code
- 🔄 **Asynchronous Turn-Based Gameplay** - Players make moves at their own pace via REST API
- 🎨 **Automatic Board Visualization** - Generate SVG/PNG images of game boards
- 🔒 **Optimistic Locking** - Safe concurrent game state management
- 👥 **Multi-Player Support** - 2-8 players per game with flexible join mechanics
- 📊 **Game Lifecycle Management** - Track games from creation through completion

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm run test:run

# Start development server
npm run dev

# Build for production
npm run build
```

The server will start on `http://localhost:3000` (or the port specified in your environment).

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
- **Persistence**: In-memory (with design for easy migration to file/database)

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
