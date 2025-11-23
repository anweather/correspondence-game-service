# Connect Four Game Plugin

A modular, workspace-ready implementation of the classic Connect Four game for the Async Boardgame Service. This package demonstrates the plugin architecture pattern with gravity mechanics, win detection in four directions, and comprehensive SVG rendering.

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

This package contains a complete Connect Four implementation organized into three main modules:

- **Shared**: Common types, interfaces, and constants used by both backend and frontend
- **Engine**: Backend game logic including rules, validation, gravity mechanics, state management, and rendering
- **UI**: Frontend React components for game interaction

The modular structure promotes:
- **Separation of concerns**: Each module has a single, well-defined responsibility
- **Testability**: Modules can be tested independently
- **Reusability**: Components can be imported and used in different contexts
- **Maintainability**: Changes are localized to specific modules
- **Future extraction**: Structure prepares for publishing as an independent npm package

## Package Structure

```
games/connect-four/
├── package.json              # Package metadata and exports configuration
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
│
├── docs/                     # Game documentation
│   ├── rules.md              # Detailed game rules and win conditions
│   └── gameplay.md           # Gameplay examples and API usage
│
├── shared/                   # Shared types and constants
│   ├── types.ts              # TypeScript interfaces (ConnectFourMove, ConnectFourMetadata)
│   ├── constants.ts          # Game constants (ROWS, COLUMNS, WIN_LENGTH, etc.)
│   └── index.ts              # Barrel export
│
├── engine/                   # Backend game logic
│   ├── metadata.ts           # Game metadata (name, description, player limits)
│   ├── initialization.ts     # Game state initialization
│   ├── validation.ts         # Move validation logic
│   ├── gravity.ts            # Gravity mechanics for disc placement
│   ├── rules.ts              # Game rules and state transitions
│   ├── renderer.ts           # SVG board rendering
│   ├── ConnectFourEngine.ts  # Main engine class (orchestrates modules)
│   ├── index.ts              # Barrel export
│   └── __tests__/            # Engine unit tests
│
└── ui/                       # Frontend React components
    ├── components/           # React components
    │   ├── ConnectFourMoveInput.tsx
    │   └── ConnectFourMoveInput.module.css
    ├── types.ts              # UI-specific types
    ├── index.ts              # Barrel export
    └── __tests__/            # UI component tests
```

## Module Organization

### Shared Module (`@games/connect-four/shared`)

**Purpose**: Provide type-safe contracts between engine and UI, ensuring consistency across the full stack.

**Exports**:
- `ConnectFourMove`: Move interface with column parameter
- `ConnectFourMetadata`: Game state metadata including board and last move
- `CellState`: Type for cell contents (null, 'red', 'yellow')
- `PlayerColor`: Type for player colors ('red', 'yellow')
- `ROWS`, `COLUMNS`, `TOTAL_CELLS`, `WIN_LENGTH`: Board configuration constants
- `MIN_PLAYERS`, `MAX_PLAYERS`: Player limits
- `GAME_TYPE`, `GAME_NAME`, `GAME_DESCRIPTION`: Game identification
- `PLAYER_COLORS`: Color assignment array
- `DIRECTIONS`: Win pattern direction vectors

**Design Principle**: The shared module has no dependencies on engine or UI modules to prevent circular dependencies.

### Engine Module (`@games/connect-four/engine`)

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
- `assignPlayerColors(players)`: Maps players to colors

#### `validation.ts`
Move validation (pure functions, no state mutation):
- `validateMove(state, playerId, move)`: Validates if move is legal
- `isValidColumn(column)`: Checks column bounds (0-6)
- `isColumnFull(board, column)`: Checks if column has space
- `isPlayerTurn(state, playerId)`: Verifies turn order

#### `gravity.ts`
Gravity mechanics for disc placement:
- `findLowestEmptyRow(board, column)`: Finds where disc will land
- `applyGravity(board, column, color)`: Places disc at lowest position

#### `rules.ts`
Game rules and state transitions (immutable):
- `applyMove(state, playerId, move)`: Creates new state with move applied
- `isGameOver(state)`: Determines if game has ended
- `getWinner(state)`: Identifies winning player
- `checkWinFromPosition(board, row, col, color)`: Checks for win from specific position
- `checkDirection(board, row, col, color, direction)`: Checks win in specific direction
- `isBoardFull(board)`: Checks for draw condition

#### `renderer.ts`
SVG board rendering:
- `renderBoard(state)`: Converts game state to SVG render data
- `createGridLayer()`: Generates grid structure
- `createDiscLayer(board)`: Generates all discs
- `createWinHighlight(winningCells)`: Highlights winning pattern
- `renderDisc(row, col, color)`: Individual disc rendering

#### `ConnectFourEngine.ts`
Main engine class that implements `BaseGameEngine` interface and orchestrates all modules. Acts as a facade, delegating to specialized modules while maintaining backward compatibility.

### UI Module (`@games/connect-four/ui`)

**Purpose**: Provide React components for game interaction.

**Components**:

#### `ConnectFourMoveInput`
Interactive column selection component:
- Renders 7 clickable column buttons
- Shows visual feedback on hover
- Disables full columns
- Disables all buttons when not player's turn
- Validates moves before submission
- Calls callback with move parameters

**Props**:
```typescript
interface ConnectFourMoveInputProps {
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
import { ConnectFourEngine } from '@games/connect-four/engine';

// Import shared types and constants
import { ROWS, COLUMNS, WIN_LENGTH } from '@games/connect-four/shared';
import type { ConnectFourMove } from '@games/connect-four/shared';

// Create engine instance
const engine = new ConnectFourEngine();

// Initialize a game
const gameState = engine.initializeGame(
  [
    { id: 'player1', name: 'Alice' },
    { id: 'player2', name: 'Bob' }
  ],
  {}
);

// Validate and apply a move
const move: ConnectFourMove = {
  action: 'drop',
  parameters: { column: 3 }
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
import { ConnectFourMoveInput } from '@games/connect-four/ui';

// Import shared types
import type { ConnectFourMove } from '@games/connect-four/shared';

// Use in React component
function GameView({ gameState, onMove }) {
  const handleMoveChange = (moveInput) => {
    // Submit move to backend
    onMove(moveInput);
  };

  return (
    <div>
      <ConnectFourMoveInput
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
import { ROWS, COLUMNS, PLAYER_COLORS, GAME_TYPE } from '@games/connect-four/shared';
import type { ConnectFourMove, ConnectFourMetadata, CellState } from '@games/connect-four/shared';

// Frontend usage (same imports)
import { COLUMNS } from '@games/connect-four/shared';
import type { ConnectFourMove } from '@games/connect-four/shared';
```

## Game Rules

### Objective
Be the first player to connect four of your colored discs in a horizontal, vertical, or diagonal line on a 7×6 vertical grid.

### Players
- Exactly 2 players required
- Player 1 uses red discs
- Player 2 uses yellow discs
- Player 1 (red) always moves first

### Board
- 7 columns (numbered 0-6 from left to right)
- 6 rows (numbered 0-5 from top to bottom)
- 42 total spaces
- Discs fall to the lowest available position due to gravity

### Win Conditions
A player wins by achieving four discs in a row:
- **Horizontal**: Four consecutive discs in any row
- **Vertical**: Four consecutive discs in any column
- **Diagonal (Ascending)**: Four consecutive discs from bottom-left to top-right
- **Diagonal (Descending)**: Four consecutive discs from top-left to bottom-right

### Draw Condition
The game ends in a draw when all 42 spaces are filled and no player has four in a row.

### Valid Moves
A move is valid if:
1. It is the player's turn
2. The column number is between 0-6
3. The selected column is not completely full

For complete rules, see [docs/rules.md](./docs/rules.md).

## Move Format

Moves are represented as JSON objects:

```json
{
  "action": "drop",
  "parameters": {
    "column": 3
  }
}
```

### Parameters
- **action**: Always `"drop"` for Connect Four
- **column**: Integer 0-6 (0=leftmost, 6=rightmost)

### Coordinate System
```
Column:  0   1   2   3   4   5   6
Row 0:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]  (top)
Row 1:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 2:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 3:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 4:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 5:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]  (bottom)
```

### Gravity Mechanics
When a disc is dropped into a column, it automatically falls to the lowest empty row in that column. Players only specify the column; the row is determined by gravity.

For gameplay examples, see [docs/gameplay.md](./docs/gameplay.md).

## API Examples

### Creating a Game

```bash
POST /api/games
Content-Type: application/json

{
  "gameType": "connect-four",
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
    "action": "drop",
    "parameters": {
      "column": 3
    }
  }
}
```

### Getting Game State

```bash
GET /api/games/{gameId}
```

Response includes current board state, turn information, game status, winner (if completed), last move information, and SVG rendering.

## Development

### Running Tests

```bash
# Run all tests for this game
npm run test:run -- games/connect-four

# Run specific test file
npm run test:run -- ConnectFourEngine.test.ts

# Run tests in watch mode
npm test -- games/connect-four
```

### Test Organization

Tests mirror the module structure:
- `engine/__tests__/`: Engine module tests
  - `metadata.test.ts`: Metadata functions
  - `initialization.test.ts`: Game initialization
  - `validation.test.ts`: Move validation
  - `gravity.test.ts`: Gravity mechanics
  - `rules.test.ts`: Game rules and win detection
  - `moveApplication.test.ts`: Move application and turn management
  - `renderer.test.ts`: Board rendering
  - `ConnectFourEngine.test.ts`: Integration tests
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
- **Property-based tests**: Verify universal properties across all inputs using fast-check
- **Integration tests**: Test modules working together
- **Component tests**: Test UI components with React Testing Library
- **E2E tests**: Verify full game flow through the API

### Property-Based Testing

The Connect Four implementation uses property-based testing with the `fast-check` library to verify correctness properties across a wide range of inputs. Each property test runs a minimum of 100 iterations.

Key properties tested:
- Board initialization structure
- Player color assignment determinism
- Gravity mechanics correctness
- Win detection in all four directions
- Move validation rules
- State immutability
- Turn alternation

### Running Specific Tests

```bash
# Engine tests only
npm run test:run -- games/connect-four/engine

# UI tests only
npm run test:run -- games/connect-four/ui

# Specific module
npm run test:run -- validation.test.ts

# Gravity mechanics tests
npm run test:run -- gravity.test.ts
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
   import { ConnectFourEngine } from '@games/connect-four/engine';
   
   // After (npm)
   import { ConnectFourEngine } from '@boardgame-plugins/connect-four/engine';
   ```
6. **Set up CI/CD**: Automate testing and publishing
7. **Publish**: `npm publish`

### Package Exports

The package.json defines clean exports for npm:

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
import { ConnectFourEngine } from '@boardgame-plugins/connect-four/engine';
import { ConnectFourMoveInput } from '@boardgame-plugins/connect-four/ui';
import { ROWS, COLUMNS } from '@boardgame-plugins/connect-four/shared';
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
7. Follow Test-Driven Development (TDD) approach

## License

This package is part of the Async Boardgame Service monorepo. See the root LICENSE file for details.

## Related Documentation

- [Game Rules](./docs/rules.md) - Detailed rules and win conditions
- [Gameplay Guide](./docs/gameplay.md) - Examples and API usage
- [Main Project README](../../README.md) - Overall service documentation
- [Plugin Development Guide](../../docs/PLUGIN_DEVELOPMENT.md) - Creating new game plugins

## Support

For issues, questions, or contributions, please refer to the main project repository.
