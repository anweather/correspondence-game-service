# Design Document

## Overview

This design document outlines the architecture for refactoring the tic-tac-toe game into a modular, workspace-ready package structure. The refactoring establishes a pattern for all future game plugins, separating concerns into distinct modules while maintaining backward compatibility and preparing for potential extraction into independent npm packages.

**This is a refactoring effort, not a rebuild.** The goal is to reorganize existing, working code into a better structure without changing functionality. We will:
- Move and reorganize existing code, not rewrite it
- Extract functions from the monolithic engine file into focused modules
- Update imports and paths to use the new structure
- Maintain all existing tests and functionality
- Preserve the same public API and behavior

The design follows hexagonal architecture principles, with clear boundaries between game logic, rendering, and UI presentation. It leverages npm workspaces for monorepo management and TypeScript path aliases for clean imports.

## Architecture

### High-Level Structure

```
async-boardgame-service/
├── games/                          # Game plugins workspace
│   └── tic-tac-toe/               # Tic-tac-toe game package
│       ├── package.json           # Package metadata and exports
│       ├── tsconfig.json          # Game-specific TypeScript config
│       ├── README.md              # Package documentation
│       ├── docs/                  # Game rules and documentation
│       │   ├── rules.md           # Detailed game rules
│       │   └── gameplay.md        # Gameplay instructions
│       ├── shared/                # Shared types and constants
│       ├── engine/                # Backend game logic
│       └── ui/                    # Frontend React components
├── src/                           # Core backend service
├── web-client/                    # Core frontend application
├── package.json                   # Root package with workspaces
└── tsconfig.json                  # Root TypeScript config
```

### Package Structure

Each game plugin is organized as a workspace package with four main sections:

1. **Shared Module**: Types, interfaces, and constants used by both engine and UI
2. **Engine Module**: Backend game logic (rules, validation, rendering)
3. **UI Module**: Frontend React components for game interaction
4. **Docs Folder**: Game rules, gameplay instructions, and documentation


## Components and Interfaces

### Shared Module (`games/tic-tac-toe/shared/`)

**Purpose**: Provide type-safe contracts between engine and UI, ensuring consistency across the full stack.

**Files**:
- `types.ts`: Game-specific TypeScript interfaces and types
- `constants.ts`: Game configuration constants
- `index.ts`: Barrel export for clean imports

**Key Types**:
```typescript
// types.ts
export interface TicTacToeMove {
  action: 'place';
  parameters: {
    row: number;
    col: number;
  };
}

export interface TicTacToeMetadata {
  boardSize: number;
}

export interface TicTacToeConfig {
  // Future: configurable board size, win condition, etc.
}
```

**Key Constants**:
```typescript
// constants.ts
export const BOARD_SIZE = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;
export const GAME_TYPE = 'tic-tac-toe';
export const GAME_NAME = 'Tic-Tac-Toe';
export const GAME_DESCRIPTION = 'Classic Tic-Tac-Toe game on a 3x3 grid...';

export const WIN_PATTERNS = [
  ['0,0', '0,1', '0,2'], // Rows
  ['1,0', '1,1', '1,2'],
  ['2,0', '2,1', '2,2'],
  ['0,0', '1,0', '2,0'], // Columns
  ['0,1', '1,1', '2,1'],
  ['0,2', '1,2', '2,2'],
  ['0,0', '1,1', '2,2'], // Diagonals
  ['0,2', '1,1', '2,0'],
];
```

**Design Rationale**: Centralizing types and constants prevents duplication and drift between frontend and backend. Constants can be imported by both engine logic and UI components, ensuring consistency.


### Engine Module (`games/tic-tac-toe/engine/`)

**Purpose**: Implement all backend game logic in a modular, testable structure.

**Files**:
- `metadata.ts`: Game metadata functions
- `initialization.ts`: Game state initialization
- `validation.ts`: Move validation logic
- `rules.ts`: Game rules and state transitions
- `renderer.ts`: SVG board rendering
- `TicTacToeEngine.ts`: Main engine class orchestrating all modules
- `index.ts`: Barrel export
- `__tests__/`: Test files mirroring module structure

#### metadata.ts

**Exports**:
```typescript
export function getGameType(): string;
export function getMinPlayers(): number;
export function getMaxPlayers(): number;
export function getDescription(): string;
export function getGameName(): string;
```

**Design Rationale**: Metadata functions are pure and stateless, making them easy to test and use for game discovery without loading the entire engine.

#### initialization.ts

**Exports**:
```typescript
export function initializeGame(
  players: Player[],
  config: GameConfig
): GameState;

export function createEmptyBoard(): Board;
```

**Design Rationale**: Separating initialization logic makes it easy to understand how games start and allows for future configuration options (e.g., different board sizes).

#### validation.ts

**Exports**:
```typescript
export function validateMove(
  state: GameState,
  playerId: string,
  move: Move
): ValidationResult;

export function isValidPosition(row: number, col: number): boolean;
export function isSpaceOccupied(state: GameState, row: number, col: number): boolean;
export function isPlayerTurn(state: GameState, playerId: string): boolean;
```

**Design Rationale**: Pure validation functions that don't mutate state. Helper functions can be tested independently and reused.


#### rules.ts

**Exports**:
```typescript
export function applyMove(
  state: GameState,
  playerId: string,
  move: Move
): GameState;

export function isGameOver(state: GameState): boolean;
export function getWinner(state: GameState): string | null;
export function checkWinPattern(state: GameState, pattern: string[]): string | null;
export function isBoardFull(state: GameState): boolean;
```

**Design Rationale**: Immutable state transitions following functional programming principles. Each function has a single responsibility and can be tested in isolation.

#### renderer.ts

**Exports**:
```typescript
export function renderBoard(state: GameState): BoardRenderData;
export function createGridLayer(): RenderElement[];
export function createTokenLayer(state: GameState): RenderElement[];
export function renderXToken(centerX: number, centerY: number): RenderElement[];
export function renderOToken(centerX: number, centerY: number): RenderElement[];
```

**Design Rationale**: Separating rendering logic allows for easy visual updates without touching game rules. Helper functions for rendering individual elements promote reusability.

#### TicTacToeEngine.ts

**Purpose**: Main engine class that implements the `BaseGameEngine` interface and orchestrates all modules.

```typescript
export class TicTacToeEngine extends BaseGameEngine {
  getGameType(): string {
    return metadata.getGameType();
  }

  getMinPlayers(): number {
    return metadata.getMinPlayers();
  }

  // ... delegates to module functions
  
  initializeGame(players: Player[], config: GameConfig): GameState {
    return initialization.initializeGame(players, config);
  }

  validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
    return validation.validateMove(state, playerId, move);
  }

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    return rules.applyMove(state, playerId, move);
  }

  isGameOver(state: GameState): boolean {
    return rules.isGameOver(state);
  }

  getWinner(state: GameState): string | null {
    return rules.getWinner(state);
  }

  renderBoard(state: GameState): BoardRenderData {
    return renderer.renderBoard(state);
  }
}
```

**Design Rationale**: The engine class acts as a facade, providing a clean interface while delegating to specialized modules. This maintains backward compatibility while enabling modular organization.


### UI Module (`games/tic-tac-toe/ui/`)

**Purpose**: Provide React components for game interaction.

**Files**:
- `components/TicTacToeMoveInput.tsx`: Move input component
- `components/TicTacToeMoveInput.module.css`: Move input styles
- `index.ts`: Barrel export
- `__tests__/`: Component tests

**Note**: Board display will continue to use SVG rendering from the backend engine. A dedicated board component may be added in a future UX refactoring phase.

#### TicTacToeMoveInput Component

**Props**:
```typescript
interface TicTacToeMoveInputProps {
  gameState: GameState;
  onMoveChange: (move: MoveInput) => void;
  disabled?: boolean;
}
```

**Responsibilities**:
- Render clickable grid for move selection
- Show visual feedback for selected cell
- Disable occupied cells
- Call callback with move parameters when cell is clicked

**Design Rationale**: Separating move input from board display allows for different interaction patterns. The component follows the existing registry pattern for game-specific inputs.


## Data Models

### Package Configuration

**games/tic-tac-toe/package.json**:
```json
{
  "name": "@boardgame-plugins/tic-tac-toe",
  "version": "1.0.0",
  "private": true,
  "description": "Tic-Tac-Toe game plugin for Async Boardgame Service",
  "main": "engine/index.ts",
  "types": "engine/index.ts",
  "exports": {
    "./shared": {
      "types": "./shared/index.ts",
      "default": "./shared/index.ts"
    },
    "./engine": {
      "types": "./engine/index.ts",
      "default": "./engine/index.ts"
    },
    "./ui": {
      "types": "./ui/index.ts",
      "default": "./ui/index.tsx"
    }
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "keywords": [
    "boardgame",
    "tic-tac-toe",
    "game-plugin"
  ]
}
```

**Root package.json** (updated):
```json
{
  "name": "async-boardgame-service",
  "workspaces": [
    "games/*"
  ],
  "dependencies": {
    "@boardgame-plugins/tic-tac-toe": "workspace:*"
  }
}
```

### TypeScript Configuration

**games/tic-tac-toe/tsconfig.json**:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "../../dist/games/tic-tac-toe",
    "jsx": "react-jsx"
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"]
}
```

**Root tsconfig.json** (updated paths):
```json
{
  "compilerOptions": {
    "paths": {
      "@games/tic-tac-toe/shared": ["games/tic-tac-toe/shared"],
      "@games/tic-tac-toe/engine": ["games/tic-tac-toe/engine"],
      "@games/tic-tac-toe/ui": ["games/tic-tac-toe/ui"],
      "@games/*": ["games/*"]
    }
  }
}
```


## Error Handling

### Module Import Errors

**Strategy**: Use TypeScript path aliases and workspace references to ensure compile-time validation of imports.

**Error Cases**:
1. Missing module: TypeScript will fail to compile if a module is not found
2. Circular dependencies: Prevented by design (shared → engine/ui, never reverse)
3. Invalid exports: Package.json exports field enforces valid entry points

### Runtime Errors

**Strategy**: Maintain existing error handling patterns from the current implementation.

**Error Cases**:
1. Invalid move parameters: Validation module returns `ValidationResult` with reason
2. Game state corruption: Immutable state transitions prevent mutation bugs
3. Rendering failures: Renderer module catches and logs errors, returns fallback render data

### Migration Errors

**Strategy**: Comprehensive test coverage ensures refactoring doesn't break functionality.

**Error Cases**:
1. Import path changes: Tests will fail if imports are incorrect
2. API changes: TypeScript will catch interface mismatches
3. Missing functionality: Existing test suite validates all behavior is preserved


## Testing Strategy

### Unit Testing

**Approach**: Test each module independently with focused test files.

**Test Organization**:
```
games/tic-tac-toe/
├── shared/__tests__/
│   ├── types.test.ts
│   └── constants.test.ts
├── engine/__tests__/
│   ├── metadata.test.ts
│   ├── initialization.test.ts
│   ├── validation.test.ts
│   ├── rules.test.ts
│   ├── renderer.test.ts
│   └── TicTacToeEngine.test.ts
└── ui/__tests__/
    └── TicTacToeMoveInput.test.tsx
```

**Test Coverage Goals**:
- Shared module: 100% (types are compile-time, constants are simple)
- Engine modules: 100% (all logic paths covered)
- UI components: 90%+ (visual components, focus on behavior)

**Migration Strategy**:
1. Copy existing tests to new locations
2. Update imports to use new module paths
3. Split monolithic engine tests into module-specific tests
4. Verify all tests pass without changing test logic
5. Add new tests for any exposed helper functions

### Integration Testing

**Approach**: Test that modules work together correctly.

**Test Cases**:
- Engine class correctly delegates to modules
- UI components correctly use shared types
- Full game flow from initialization to completion
- Plugin registration and discovery

### End-to-End Testing

**Approach**: Verify the refactored game works in the full application.

**Test Cases**:
- Create game via API
- Make moves via API
- Render board via API
- UI components display correctly
- Game completion detected correctly


## Implementation Phases

### Phase 1: Workspace Setup
- Create `games/tic-tac-toe/` directory structure
- Add package.json with proper exports
- Configure npm workspaces in root package.json
- Update TypeScript configuration with path aliases
- Update web client bundler configuration

### Phase 2: Shared Module
- Create shared/types.ts with game-specific types
- Create shared/constants.ts with game constants
- Extract constants from existing engine
- Create barrel export

### Phase 3: Engine Modules (Extract and Reorganize)
- Create metadata.ts and **move** existing metadata methods from TicTacToeEngine
- Create initialization.ts and **move** existing initializeGame logic
- Create validation.ts and **move** existing validateMove logic
- Create rules.ts and **move** existing applyMove, isGameOver, getWinner logic
- Create renderer.ts and **move** existing renderBoard logic
- Update TicTacToeEngine to delegate to the extracted modules
- Create barrel export

**Note**: This is code extraction, not rewriting. Copy existing implementations and organize them into modules.

### Phase 4: UI Module (Move Existing Components)
- **Move** existing TicTacToeMoveInput component to new location
- Update imports to use shared types
- **Copy** existing component styles
- Create barrel export

**Note**: The existing TicTacToeMoveInput component works well. We're just moving it to the new structure.

### Phase 5: Integration
- Update plugin registry to import from new paths
- Update UI component registry to import from new paths
- Update any other imports throughout codebase

### Phase 6: Test Migration
- Move and update engine tests
- Move and update UI component tests
- Add new tests for helper functions
- Verify 100% test pass rate

### Phase 7: Documentation
- Create README.md in game package
- Document module structure and purpose
- Add game rules and gameplay documentation
- Add examples of importing and using the game
- Update main project documentation

### Phase 8: Cleanup
- Remove old plugin directory (src/adapters/plugins/tic-tac-toe/)
- Remove old UI component files
- Verify no broken imports remain
- Run full test suite
- Verify application runs correctly


## Design Decisions and Rationale

### Why Workspace Packages?

**Decision**: Use npm workspaces with game plugins as separate packages.

**Rationale**:
- Enables future extraction to independent npm packages
- Provides clear boundaries and encapsulation
- Allows independent versioning when needed
- Supports monorepo tooling and workflows
- Aligns with industry best practices (Babel, ESLint, Rollup plugins)

**Trade-offs**:
- Slightly more complex build configuration
- Need to manage workspace dependencies
- Benefit: Clean architecture and future flexibility outweigh complexity

### Why Modular Engine Structure?

**Decision**: Split engine into metadata, initialization, validation, rules, and renderer modules.

**Rationale**:
- Single Responsibility Principle: Each module has one clear purpose
- Easier to understand: Developers can focus on specific aspects
- Better testability: Modules can be tested in isolation
- Improved maintainability: Changes are localized to relevant modules
- Reusability: Helper functions can be shared across modules

**Trade-offs**:
- More files to navigate
- Need to understand module boundaries
- Benefit: Code clarity and maintainability far exceed navigation cost

### Why Keep Engine Class?

**Decision**: Maintain TicTacToeEngine class that delegates to modules.

**Rationale**:
- Backward compatibility: Existing code expects a class implementing BaseGameEngine
- Clean interface: Consumers don't need to know about internal modules
- Facade pattern: Provides stable API while allowing internal refactoring
- Easy migration: Can refactor internals without changing external interface

**Trade-offs**:
- Extra layer of indirection
- Benefit: Smooth migration path and stable API


### Why Shared Module?

**Decision**: Create a shared module for types and constants used by both engine and UI.

**Rationale**:
- DRY principle: Single source of truth for types and constants
- Type safety: Frontend and backend use identical types
- Consistency: Constants ensure consistent behavior across layers
- Prevents drift: Changes to types automatically propagate
- Clear contract: Shared module defines the interface between layers

**Trade-offs**:
- Must avoid circular dependencies (shared can't import from engine/UI)
- Need to carefully design what belongs in shared
- Benefit: Type safety and consistency are critical for full-stack applications

### Why Separate UI Module?

**Decision**: Create dedicated UI module separate from engine.

**Rationale**:
- Separation of concerns: Presentation logic separate from business logic
- Independent development: Frontend developers can work without touching engine
- Different dependencies: UI needs React, engine doesn't
- Smaller bundles: Backend doesn't include React code
- Reusability: UI components can be used in different contexts

**Trade-offs**:
- Need to coordinate types between modules
- Benefit: Clean separation enables independent development and deployment

### Why TypeScript Path Aliases?

**Decision**: Use path aliases like `@games/tic-tac-toe/engine` instead of relative paths.

**Rationale**:
- Cleaner imports: `@games/tic-tac-toe/engine` vs `../../../games/tic-tac-toe/engine`
- Refactoring friendly: Moving files doesn't break imports
- Consistent style: Matches existing `@domain`, `@adapters` patterns
- IDE support: Better autocomplete and navigation
- Future-proof: Aliases can point to npm packages later

**Trade-offs**:
- Requires configuration in tsconfig.json and bundler
- Benefit: Developer experience and maintainability improvements


## Future Considerations

### npm Package Extraction

When ready to extract the game to a separate npm package:

1. **Remove `"private": true`** from package.json
2. **Add build scripts** to compile TypeScript
3. **Add publishing configuration** (registry, access level)
4. **Update imports** in main project to use npm package name
5. **Set up CI/CD** for automated publishing
6. **Add comprehensive README** for npm registry

The current structure is designed to make this transition seamless.

### Dynamic Plugin Loading

Future enhancement from backlog: Load game plugins dynamically at runtime.

**Current structure supports this**:
- Package.json metadata enables plugin discovery
- Clear exports make dynamic imports straightforward
- Modular structure allows lazy loading of specific modules

**Implementation path**:
```typescript
// Future: Dynamic plugin loading
const plugin = await import(`@boardgame-plugins/${gameType}`);
const engine = new plugin.engine.TicTacToeEngine();
const UI = plugin.ui.TicTacToeBoard;
```

### Multiple Game Variants

Future enhancement: Support game variants (e.g., 4x4 tic-tac-toe, 3D tic-tac-toe).

**Current structure supports this**:
- Shared constants can be made configurable
- Initialization accepts config parameter
- Validation and rules can check config
- Renderer can adapt to different board sizes

**Implementation path**:
- Add variant configurations to shared/constants.ts
- Update initialization to accept variant config
- Adjust validation and rules for variant-specific logic
- Update renderer for variant-specific display

### Game Plugin Marketplace

Future enhancement: Allow community to publish and discover game plugins.

**Current structure supports this**:
- Standard package.json format
- Clear exports and documentation
- Consistent structure across all games
- npm registry as distribution mechanism

**Implementation path**:
- Create plugin discovery service
- Add plugin validation and security checks
- Build plugin marketplace UI
- Implement plugin installation workflow

