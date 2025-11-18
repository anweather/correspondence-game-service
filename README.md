# Async Boardgame Service

A generic, pluggable platform for managing turn-based board games through RESTful web APIs.

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
│   │   └── services/        # GameManagerService, StateManagerService
│   │
│   ├── infrastructure/      # External concerns
│   │   ├── persistence/     # Repository implementations
│   │   └── rendering/       # RendererService, SVG generation
│   │
│   ├── adapters/            # External interfaces
│   │   ├── rest/            # Express controllers and routes
│   │   └── plugins/         # Game engine implementations
│   │
│   └── index.ts             # Application entry point
│
└── tests/                   # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

## Setup

```bash
# Install dependencies
npm install

# Run tests (watch mode)
npm test

# Run tests (single run)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Build TypeScript
npm run build

# Start development server
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js
- **Web Framework**: Express
- **Testing**: Jest with TypeScript support
- **Architecture**: Hexagonal Architecture (Ports and Adapters)

## Development Approach

This project follows **Test-Driven Development (TDD)**:
1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass
3. **Refactor**: Improve while keeping tests green

## License

MIT
