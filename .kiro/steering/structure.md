# Project Structure

## Folder Organization

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
│   │       └── tic-tac-toe/ # Example game plugin
│   │
│   └── index.ts             # Application entry point
│
├── tests/                   # Test files mirror src/ structure
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .kiro/
│   ├── specs/               # Specification documents
│   └── steering/            # AI assistant guidance (this file)
│
└── package.json
```

## Key Architectural Boundaries

### Domain Layer (`src/domain`)
- Contains pure business logic and domain models
- No dependencies on infrastructure or frameworks
- Defines interfaces that outer layers implement
- All game-agnostic core concepts live here

### Application Layer (`src/application`)
- Orchestrates domain objects to fulfill use cases
- Contains service classes that coordinate operations
- Implements concurrency control (GameLockManager)
- Manages plugin registry

### Infrastructure Layer (`src/infrastructure`)
- Implements technical capabilities (persistence, rendering)
- Depends on domain interfaces
- Swappable implementations (in-memory → file → database)

### Adapters Layer (`src/adapters`)
- REST API controllers (primary adapters)
- Game engine plugins (secondary adapters)
- Translates between external formats and domain models

## Plugin Development

Game plugins live in `src/adapters/plugins/<game-name>/`:
- Extend `BaseGameEngine` abstract class
- Implement required methods: `initializeGame`, `validateMove`, `applyMove`, `renderBoard`
- Define game-specific types extending base domain models
- Register with `PluginRegistry` at startup

## Testing Structure

Tests mirror the source structure:
- **Unit tests**: Test individual classes/functions in isolation
- **Integration tests**: Test service layer interactions
- **E2E tests**: Test full REST API flows

Test files use `.test.ts` or `.spec.ts` suffix and live alongside source files or in dedicated `tests/` directory.

## Naming Conventions

- **Interfaces**: PascalCase (e.g., `GameEnginePlugin`, `GameRepository`)
- **Classes**: PascalCase (e.g., `GameManagerService`, `TicTacToeEngine`)
- **Files**: Match class/interface name (e.g., `GameManagerService.ts`)
- **Folders**: kebab-case (e.g., `tic-tac-toe/`)
- **Constants**: UPPER_SNAKE_CASE
- **Variables/Functions**: camelCase

## Import Organization

1. External dependencies (node_modules)
2. Domain layer imports
3. Application layer imports
4. Infrastructure layer imports
5. Relative imports

Use absolute imports from `src/` root when possible (configure in `tsconfig.json`).
