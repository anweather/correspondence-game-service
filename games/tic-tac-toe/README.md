# Tic-Tac-Toe Game Plugin

A modular, workspace-ready implementation of the classic Tic-Tac-Toe game for the Async Boardgame Service. This package demonstrates the plugin architecture pattern and serves as a template for developing additional game plugins.

## Table of Contents

- [Overview](#overview)
- [Package Structure](#package-structure)
- [Module Organization](#module-organization)
- [Installation & Usage](#installation--usage)
- [Game Rules](#game-rules)
- [Move Format](#move-format)
- [API Examples](#api-examples)
- [Development](#development)
- [Testing](#testing)
- [Future npm Extraction](#future-npm-extraction)

## Overview

This package contains a complete Tic-Tac-Toe implementation organized into three main modules:

- **Shared**: Common types, interfaces, and constants used by both backend and frontend
- **Engine**: Backend game logic including rules, validation, state management, and rendering
- **UI**: Frontend React components for game interaction

The modular structure promotes:
- **Separation of concerns**: Each module has a single, well-defined responsibility
- **Testability**: Modules can be tested independently
- **Reusability**: Components can be imported and used in different contexts
- **Maintainability**: Changes are localized to specific modules
- **Future extraction**: Structure prepares for publishing as an independent npm package

## Package Structure

```
games/tic-tac-toe/
├── package.json              # Package metadata and exports configuration
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
│
├── docs/                     # Game documentation
│   ├── rules.md              # Detailed game rules and win conditions
│   └── gameplay.md           # Gameplay examples and API usage
│
├── shared/                   # Shared types and constants
│   ├── types.ts              # TypeScript interfaces (TicTacToeMove, TicTacToeMetadata)
│   ├── constants.ts          # Game constants (BOARD_SIZE, WIN_PATTERNS, etc.)
│   └── index.ts              # Barrel export
│
├── engine/                   # Backend game logic
│   ├── metadata.ts           # Game metadata (name, description, player limits)
│   ├── initialization.ts     # Game state initialization
│   ├── validation.ts         # Move validation logic
│   ├── rules.ts              # Game rules and state transitions
│   ├── renderer.ts           # SVG board rendering
│   ├── TicTacToeEngine.ts    # Main engine class (orchestrates modules)
│   ├── index.ts              # Barrel export
│   └── __tests__/            # Engine unit tests
│
└── ui/                       # Frontend React components
    ├── components/           # React components
    │   ├── TicTacToeMoveInput.tsx
    │   └── TicTacToeMoveInput.module.css
    ├── types.ts              # UI-specific types
    ├── index.ts              # Barrel export
    └── __tests__/            # UI component tests
```

## Module Organization

### Shared Module (`@games/tic-tac-toe/shared`)

**Purpose**: Provide type-safe contracts between engine and UI, ensuring consistency across the full stack.

**Exports**:
- `TicTacToeMove`: Move interface with row/col parameters
- `TicTacToeMetadata`: Game state metadata
- `BOARD_SIZE`, `MIN_PLAYERS`, `MAX_PLAYERS`: Game configuration constants
- `GAME_TYPE`, `GAME_NAME`, `GAME_DESCRIPTION`: Game identification
- `WIN_PATTERNS`: All possible winning combinations

**Design Principle**: The shared module has no dependencies on engine or UI modules to prevent circular dependencies.

### Engine Module (`@games/tic-tac-toe/engine`)

**Purpose**: Implement all backend game logic in a modular, testable structure.

**Submodules**:

#### `metadata.ts`
Game metadata functions (pure, stateless):
- `getGameType()`: Returns game type identifier
- `getGameName()`: Returns human-readable name
- `getMinPlayers()`, `getMaxPlayers()`: Player limits
- `getDescription()`: Game description

#### `initialization.ts`
Game state initialization:
- `initializeGame(players, config)`: Creates initial game state
- `createEmptyBoard()`: Helper for board creation

#### `validation.ts`
Move validation (pure functions, no state mutation):
- `validateMove(state, playerId, move)`: Validates if move is legal
- `isValidPosition(row, col)`: Checks coordinate bounds
- `isSpaceOccupied(state, row, col)`: Checks if space is taken
- `isPlayerTurn(state, playerId)`: Verifies turn order

#### `rules.ts`
Game rules and state transitions (immutable):
- `applyMove(state, playerId, move)`: Creates new state with move applied
- `isGameOver(state)`: Determines if game has ended
- `getWinner(state)`: Identifies winning player
- `checkWinPattern(state, pattern)`: Checks specific win pattern
- `isBoardFull(state)`: Checks for draw condition

#### `renderer.ts`
SVG board rendering:
- `renderBoard(state)`: Converts game state to SVG render data
- `createGridLayer()`: Generates grid lines
- `createTokenLayer(state)`: Generates X and O tokens
- `renderXToken(x, y)`, `renderOToken(x, y)`: Individual token rendering

#### `TicTacToeEngine.ts`
Main engine class that implements `BaseGameEngine` interface and orchestrates all modules. Acts as a facade, delegating to specialized modules while maintaining backward compatibility.

### UI Module (`@games/tic-tac-toe/ui`)

**Purpose**: Provide React components for game interaction.

**Components**:

#### `TicTacToeMoveInput`
Interactive move input component:
- Renders clickable 3x3 grid
- Shows visual feedback for selected cell
- Disables occupied cells
- Validates moves before submission
- Calls callback with move parameters

**Props**:
```typescript
interface TicTacToeMoveInputProps {
  gameState: GameState;
  onMoveChange: (move: MoveInput) => void;
  disabled?: boolean;
}
```

**Note**: Board display uses SVG rendering from the backend engine. A dedicated board component may be added in future UX enhancements.

## Installation & Usage

### Importing the Engine (Backend)

```typescript
// Import the main engine class
import { TicTacToeEngine } from '@games/tic-tac-toe/engine';

// Import shared types and constants
import { BOARD_SIZE, WIN_PATTERNS } from '@games/tic-tac-toe/shared';
import type { TicTacToeMove } from '@games/tic-tac-toe/shared';

// Create engine instance
const engine = new TicTacToeEngine();

// Initialize a game
const gameState = engine.initializeGame(
  [
    { id: 'player1', name: 'Alice' },
    { id: 'player2', name: 'Bob' }
  ],
  {}
);

// Validate and apply a move
const move: TicTacToeMove = {
  action: 'place',
  parameters: { row: 1, col: 1 }
};

const validation = engine.validateMove(gameState, 'player1', move);
if (validation.valid) {
  const newState = engine.applyMove(gameState, 'player1', move);
  
  // Check game status
  if (engine.isGameOver(newState)) {
    const winner = engine.getWinner(newState);
    console.log(winner ? `${winner} wins!` : 'Draw!');
  }
}

// Render the board
const renderData = engine.renderBoard(gameState);
```

### Importing UI Components (Frontend)

```typescript
// Import UI components
import { TicTacToeMoveInput } from '@games/tic-tac-toe/ui';

// Import shared types
import type { TicTacToeMove } from '@games/tic-tac-toe/shared';

// Use in React component
function GameView({ gameState, onMove }) {
  const handleMoveChange = (moveInput) => {
    // Submit move to backend
    onMove(moveInput);
  };

  return (
    <div>
      <TicTacToeMoveInput
        gameState={gameState}
        onMoveChange={handleMoveChange}
        disabled={gameState.status !== 'in_progress'}
      />
    </div>
  );
}
```

### Importing Shared Types and Constants

```typescript
// Backend usage
import { BOARD_SIZE, WIN_PATTERNS, GAME_TYPE } from '@games/tic-tac-toe/shared';
import type { TicTacToeMove, TicTacToeMetadata } from '@games/tic-tac-toe/shared';

// Frontend usage (same imports)
import { BOARD_SIZE } from '@games/tic-tac-toe/shared';
import type { TicTacToeMove } from '@games/tic-tac-toe/shared';
```

## Game Rules

### Objective
Be the first player to place three of your marks in a horizontal, vertical, or diagonal row on a 3x3 grid.

### Players
- Exactly 2 players required
- Player 1 uses 'X' symbol
- Player 2 uses 'O' symbol
- Player 1 always moves first

### Win Conditions
A player wins by achieving three marks in a row:
- **Horizontal**: Any complete row (3 patterns)
- **Vertical**: Any complete column (3 patterns)
- **Diagonal**: Either diagonal (2 patterns)

Total: 8 possible winning patterns

### Draw Condition
The game ends in a draw when all 9 spaces are filled and no player has three in a row.

### Valid Moves
A move is valid if:
1. It is the player's turn
2. The target position is within bounds (row and col between 0-2)
3. The target space is empty

For complete rules, see [docs/rules.md](./docs/rules.md).

## Move Format

Moves are represented as JSON objects:

```json
{
  "action": "place",
  "parameters": {
    "row": 0,
    "col": 0
  }
}
```

### Parameters
- **action**: Always `"place"` for Tic-Tac-Toe
- **row**: Integer 0-2 (0=top, 1=middle, 2=bottom)
- **col**: Integer 0-2 (0=left, 1=center, 2=right)

### Coordinate System
```
     col 0   col 1   col 2
row 0  (0,0) | (0,1) | (0,2)
       ------+-------+------
row 1  (1,0) | (1,1) | (1,2)
       ------+-------+------
row 2  (2,0) | (2,1) | (2,2)
```

For gameplay examples, see [docs/gameplay.md](./docs/gameplay.md).

## API Examples

### Creating a Game

```bash
POST /api/games
Content-Type: application/json

{
  "gameType": "tic-tac-toe",
  "players": [
    { "id": "player1", "name": "Alice" },
    { "id": "player2", "name": "Bob" }
  ]
}
```

### Making a Move

```bash
POST /api/games/{gameId}/moves
Content-Type: application/json

{
  "playerId": "player1",
  "move": {
    "action": "place",
    "parameters": {
      "row": 1,
      "col": 1
    }
  }
}
```

### Getting Game State

```bash
GET /api/games/{gameId}
```

Response includes current board state, turn information, game status, winner (if completed), and SVG rendering.

## Development

### Running Tests

```bash
# Run all tests for this game
npm run test:run -- games/tic-tac-toe

# Run specific test file
npm run test:run -- TicTacToeEngine.test.ts

# Run tests in watch mode
npm test -- games/tic-tac-toe
```

### Test Organization

Tests mirror the module structure:
- `engine/__tests__/`: Engine module tests
  - `metadata.test.ts`: Metadata functions
  - `initialization.test.ts`: Game initialization
  - `validation.test.ts`: Move validation
  - `rules.test.ts`: Game rules and state transitions
  - `renderer.test.ts`: Board rendering
  - `TicTacToeEngine.test.ts`: Integration tests
- `ui/__tests__/`: UI component tests

### Adding New Features

When extending the game:

1. **Add types to shared module**: Define new interfaces in `shared/types.ts`
2. **Update constants**: Add configuration in `shared/constants.ts`
3. **Implement engine logic**: Add functions to appropriate engine module
4. **Update main engine class**: Delegate to new module functions
5. **Add UI components**: Create new components in `ui/components/`
6. **Write tests**: Add tests mirroring the module structure
7. **Update documentation**: Document new features in this README

## Testing

### Test Coverage

The package maintains high test coverage:
- **Engine modules**: 100% coverage of all logic paths
- **UI components**: 90%+ coverage focusing on behavior
- **Integration**: Full game flow from initialization to completion

### Test Strategy

- **Unit tests**: Test each module independently
- **Integration tests**: Test modules working together
- **Component tests**: Test UI components with React Testing Library
- **E2E tests**: Verify full game flow through the API

### Running Specific Tests

```bash
# Engine tests only
npm run test:run -- games/tic-tac-toe/engine

# UI tests only
npm run test:run -- games/tic-tac-toe/ui

# Specific module
npm run test:run -- validation.test.ts
```

## Future npm Extraction

This package is structured to be easily extracted as an independent npm package when needed.

### Current Structure Benefits

1. **Self-contained**: All game code in one directory
2. **Clear exports**: Package.json defines public API
3. **No external dependencies**: Only peer dependencies (React for UI)
4. **Standard format**: Follows npm package conventions
5. **Comprehensive documentation**: Ready for npm registry

### Extraction Steps

When ready to publish as a standalone package:

1. **Remove private flag**: Delete `"private": true` from package.json
2. **Add build scripts**: Configure TypeScript compilation
   ```json
   {
     "scripts": {
       "build": "tsc",
       "prepublishOnly": "npm run build"
     }
   }
   ```
3. **Update package name**: Choose public npm package name
4. **Add publishing config**: Set registry and access level
   ```json
   {
     "publishConfig": {
       "access": "public",
       "registry": "https://registry.npmjs.org/"
     }
   }
   ```
5. **Update imports**: Change from workspace paths to npm package name
   ```typescript
   // Before (workspace)
   import { TicTacToeEngine } from '@games/tic-tac-toe/engine';
   
   // After (npm)
   import { TicTacToeEngine } from '@boardgame-plugins/tic-tac-toe/engine';
   ```
6. **Set up CI/CD**: Automate testing and publishing
7. **Publish**: `npm publish`

### Package Exports

The package.json already defines clean exports for npm:

```json
{
  "exports": {
    "./shared": "./shared/index.ts",
    "./engine": "./engine/index.ts",
    "./ui": "./ui/index.tsx"
  }
}
```

This allows consumers to import specific modules:
```typescript
import { TicTacToeEngine } from '@boardgame-plugins/tic-tac-toe/engine';
import { TicTacToeMoveInput } from '@boardgame-plugins/tic-tac-toe/ui';
import { BOARD_SIZE } from '@boardgame-plugins/tic-tac-toe/shared';
```

### Versioning Strategy

When published independently:
- Follow semantic versioning (semver)
- Major version: Breaking API changes
- Minor version: New features (backward compatible)
- Patch version: Bug fixes

### Dependency Management

The package has minimal dependencies:
- **Peer dependencies**: React 18+ (for UI module only)
- **No runtime dependencies**: Engine is pure TypeScript
- **Dev dependencies**: Testing and build tools (when extracted)

This minimal dependency footprint makes the package:
- Easy to maintain
- Quick to install
- Compatible with various project setups
- Suitable for long-term stability

## Contributing

When contributing to this game plugin:

1. Follow the modular structure
2. Write tests for all new functionality
3. Update documentation for API changes
4. Maintain backward compatibility
5. Follow TypeScript strict mode
6. Use meaningful commit messages

## License

This package is part of the Async Boardgame Service monorepo. See the root LICENSE file for details.

## Related Documentation

- [Game Rules](./docs/rules.md) - Detailed rules and win conditions
- [Gameplay Guide](./docs/gameplay.md) - Examples and API usage
- [Main Project README](../../README.md) - Overall service documentation
- [Plugin Development Guide](../../docs/PLUGIN_DEVELOPMENT.md) - Creating new game plugins

## Support

For issues, questions, or contributions, please refer to the main project repository.
