# Connect Four Game Plugin - Design Document

## Overview

The Connect Four game plugin implements the classic vertical grid connection game for the Async Boardgame Service. Following the established plugin architecture pattern from Tic-Tac-Toe, this implementation provides a complete game engine with move validation, gravity mechanics, win detection, SVG rendering, and a React-based UI component for player interaction.

The plugin is structured into three main modules:
- **Shared Module**: Type definitions and constants shared between backend and frontend
- **Engine Module**: Backend game logic including initialization, validation, rules, and rendering
- **UI Module**: React components for move input and game interaction

## Architecture

### Module Structure

```
games/connect-four/
├── shared/
│   ├── types.ts           # ConnectFourMove, ConnectFourMetadata interfaces
│   ├── constants.ts       # Board dimensions, player colors, win patterns
│   └── index.ts           # Barrel export
│
├── engine/
│   ├── metadata.ts        # Game metadata (name, description, player limits)
│   ├── initialization.ts  # Game state initialization
│   ├── validation.ts      # Move validation logic
│   ├── gravity.ts         # Gravity mechanics for disc placement
│   ├── rules.ts           # Game rules, win detection, state transitions
│   ├── renderer.ts        # SVG board rendering
│   ├── ConnectFourEngine.ts  # Main engine class
│   ├── index.ts           # Barrel export
│   └── __tests__/         # Engine unit tests
│
└── ui/
    ├── components/
    │   ├── ConnectFourMoveInput.tsx
    │   └── ConnectFourMoveInput.module.css
    ├── types.ts           # UI-specific types
    ├── index.ts           # Barrel export
    └── __tests__/         # UI component tests
```

### Design Principles

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Immutability**: All state transitions create new state objects
3. **Pure Functions**: Game logic functions are pure and deterministic
4. **Testability**: Modules can be tested independently
5. **Type Safety**: Strict TypeScript typing throughout
6. **Plugin Compatibility**: Implements BaseGameEngine interface

## Components and Interfaces

### Shared Module Types

```typescript
// ConnectFourMove - Player move representation
interface ConnectFourMove {
  action: 'drop';
  parameters: {
    column: number;  // 0-6
  };
}

// ConnectFourMetadata - Game-specific metadata
interface ConnectFourMetadata {
  board: CellState[][];  // 6 rows × 7 columns
  lastMove?: {
    row: number;
    column: number;
    player: string;
  };
}

// CellState - Individual cell state
type CellState = null | 'red' | 'yellow';

// PlayerColor - Player color assignment
type PlayerColor = 'red' | 'yellow';
```

### Constants

```typescript
// Board dimensions
const ROWS = 6;
const COLUMNS = 7;
const TOTAL_CELLS = 42;
const WIN_LENGTH = 4;

// Player configuration
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 2;
const PLAYER_COLORS: PlayerColor[] = ['red', 'yellow'];

// Game identification
const GAME_TYPE = 'connect-four';
const GAME_NAME = 'Connect Four';
const GAME_DESCRIPTION = 'Drop discs to connect four in a row';

// Win pattern directions
const DIRECTIONS = {
  HORIZONTAL: { row: 0, col: 1 },
  VERTICAL: { row: 1, col: 0 },
  DIAGONAL_UP: { row: -1, col: 1 },
  DIAGONAL_DOWN: { row: 1, col: 1 }
};
```

### Engine Module Functions

#### metadata.ts
```typescript
function getGameType(): string
function getGameName(): string
function getDescription(): string
function getMinPlayers(): number
function getMaxPlayers(): number
```

#### initialization.ts
```typescript
function initializeGame(players: Player[], config: GameConfig): GameState
function createEmptyBoard(): CellState[][]
function assignPlayerColors(players: Player[]): Map<string, PlayerColor>
```

#### validation.ts
```typescript
function validateMove(state: GameState, playerId: string, move: ConnectFourMove): ValidationResult
function isValidColumn(column: number): boolean
function isColumnFull(board: CellState[][], column: number): boolean
function isPlayerTurn(state: GameState, playerId: string): boolean
```

#### gravity.ts
```typescript
function findLowestEmptyRow(board: CellState[][], column: number): number | null
function applyGravity(board: CellState[][], column: number, color: PlayerColor): { board: CellState[][], row: number }
```

#### rules.ts
```typescript
function applyMove(state: GameState, playerId: string, move: ConnectFourMove): GameState
function isGameOver(state: GameState): boolean
function getWinner(state: GameState): string | null
function checkWinFromPosition(board: CellState[][], row: number, col: number, color: PlayerColor): boolean
function checkDirection(board: CellState[][], row: number, col: number, color: PlayerColor, direction: Direction): boolean
function isBoardFull(board: CellState[][]): boolean
```

#### renderer.ts
```typescript
function renderBoard(state: GameState): RenderData
function createGridLayer(): SVGElement[]
function createDiscLayer(board: CellState[][]): SVGElement[]
function createWinHighlight(winningCells: Position[]): SVGElement[]
function renderDisc(row: number, col: number, color: PlayerColor): SVGElement
```

### UI Module Components

#### ConnectFourMoveInput
```typescript
interface ConnectFourMoveInputProps {
  gameState: GameState;
  onMoveChange: (move: MoveInput) => void;
  disabled?: boolean;
}

// Renders 7 column buttons
// Disables full columns
// Shows hover preview of where disc will land
// Submits move on column selection
```

## Data Models

### Game State Structure

```typescript
interface GameState {
  gameId: string;
  gameType: 'connect-four';
  players: Player[];
  currentPlayerIndex: number;
  status: 'waiting' | 'in_progress' | 'completed';
  winner: string | null;
  metadata: ConnectFourMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Board Representation

The board is represented as a 2D array with 6 rows and 7 columns:
- Row 0 is the top
- Row 5 is the bottom
- Column 0 is the leftmost
- Column 6 is the rightmost

```
Row 0: [null, null, null, null, null, null, null]
Row 1: [null, null, null, null, null, null, null]
Row 2: [null, null, null, null, null, null, null]
Row 3: [null, null, null, null, null, null, null]
Row 4: [null, null, null, 'red', null, null, null]
Row 5: [null, null, 'yellow', 'red', null, null, null]
       Col0  Col1  Col2     Col3    Col4  Col5  Col6
```

### Move Flow

1. Player selects column (0-6)
2. Validation checks:
   - Is it player's turn?
   - Is column valid (0-6)?
   - Is column not full?
3. Gravity calculation:
   - Find lowest empty row in column
4. Apply move:
   - Place disc at calculated position
   - Check for win from that position
   - Check for draw (board full)
   - Switch turns if game continues
5. Return new game state

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Board initialization creates correct structure
*For any* valid player configuration, initializing a game should create a board with exactly 6 rows and 7 columns, with all cells empty.
**Validates: Requirements 1.1**

### Property 2: Player color assignment is deterministic
*For any* two players, the first player should always be assigned red and the second player should always be assigned yellow.
**Validates: Requirements 1.2**

### Property 3: First player starts
*For any* initialized game, the active player should be the first player (red).
**Validates: Requirements 1.3**

### Property 4: Games start in progress
*For any* initialized game, the game status should be "in_progress".
**Validates: Requirements 1.4**

### Property 5: Wrong turn moves are rejected
*For any* game state and any player, attempting a move when it's not that player's turn should result in a validation error.
**Validates: Requirements 2.1**

### Property 6: Full column moves are rejected
*For any* board state with a completely filled column, attempting to drop a disc in that column should result in a validation error.
**Validates: Requirements 2.3**

### Property 7: Invalid moves return descriptive errors
*For any* invalid move (wrong turn, full column, out of bounds), the validation result should contain a descriptive error message.
**Validates: Requirements 2.4**

### Property 8: Valid moves pass validation
*For any* valid move (correct turn, valid column, column not full), the validation result should indicate success.
**Validates: Requirements 2.5**

### Property 9: Gravity places discs at lowest position
*For any* board state and any valid column, dropping a disc should place it in the lowest empty row of that column.
**Validates: Requirements 3.1**

### Property 10: Disc placement updates board correctly
*For any* valid move, the resulting board state should have the player's color at the gravity-calculated position, and all other positions should remain unchanged.
**Validates: Requirements 3.4**

### Property 11: Horizontal wins are detected
*For any* board state containing four consecutive discs of the same color in a horizontal line, the game should be marked as completed with that color's player as the winner.
**Validates: Requirements 4.1**

### Property 12: Vertical wins are detected
*For any* board state containing four consecutive discs of the same color in a vertical line, the game should be marked as completed with that color's player as the winner.
**Validates: Requirements 4.2**

### Property 13: Ascending diagonal wins are detected
*For any* board state containing four consecutive discs of the same color in an ascending diagonal line (bottom-left to top-right), the game should be marked as completed with that color's player as the winner.
**Validates: Requirements 4.3**

### Property 14: Descending diagonal wins are detected
*For any* board state containing four consecutive discs of the same color in a descending diagonal line (top-left to bottom-right), the game should be marked as completed with that color's player as the winner.
**Validates: Requirements 4.4**

### Property 15: Winning moves complete the game
*For any* move that creates a winning pattern, the resulting game state should have status "completed" and the winner should be recorded as the player who made the move.
**Validates: Requirements 4.5**

### Property 16: Full board without winner is a draw
*For any* board state where all 42 cells are filled and no winning pattern exists, the game should be marked as completed with no winner.
**Validates: Requirements 5.2**

### Property 17: Valid moves alternate turns
*For any* valid move in a non-completed game, applying the move should switch the active player to the other player.
**Validates: Requirements 6.1**

### Property 18: Completed games don't change turns
*For any* completed game, the active player should remain unchanged (or moves should be rejected).
**Validates: Requirements 6.2**

### Property 19: Game state indicates current turn
*For any* game state, it should be possible to determine which player's turn it is.
**Validates: Requirements 6.3**

### Property 20: Rendering produces valid SVG structure
*For any* board state, rendering should produce SVG data with the correct grid structure (7 columns × 6 rows).
**Validates: Requirements 7.1**

### Property 21: Empty cells render as white circles
*For any* board state with empty cells, the rendered SVG should contain white circles at those positions.
**Validates: Requirements 7.2**

### Property 22: Red discs render correctly
*For any* board state with red discs, the rendered SVG should contain red circles at those positions.
**Validates: Requirements 7.3**

### Property 23: Yellow discs render correctly
*For any* board state with yellow discs, the rendered SVG should contain yellow circles at those positions.
**Validates: Requirements 7.4**

### Property 24: Winning patterns are highlighted
*For any* completed game with a winner, the rendered SVG should highlight the four winning disc positions.
**Validates: Requirements 7.6**

### Property 25: Full columns disable UI buttons
*For any* board state with a full column, the UI component should disable that column's button.
**Validates: Requirements 8.2**

### Property 26: UI disables buttons when not player's turn
*For any* game state where it's not the current player's turn, all column buttons should be disabled.
**Validates: Requirements 8.3**

### Property 27: UI submits correct column on click
*For any* column button click, the UI should submit a move with the correct column number.
**Validates: Requirements 8.4**

### Property 28: Move application is immutable
*For any* move application, the original game state object should remain unchanged, and a new game state object should be returned.
**Validates: Requirements 9.1**

### Property 29: Invalid moves don't change state
*For any* invalid move, the game state should remain completely unchanged.
**Validates: Requirements 9.3**

### Property 30: Game state is complete
*For any* game state query, the returned state should contain all necessary information (board, players, turn, status, winner).
**Validates: Requirements 9.4**

## Error Handling

### Validation Errors

The engine provides descriptive error messages for all validation failures:

- **Wrong Turn**: "It is not your turn"
- **Invalid Column**: "Column must be between 0 and 6"
- **Full Column**: "Column {column} is full"
- **Game Completed**: "Game is already completed"
- **Invalid Player**: "Player {playerId} is not in this game"

### Error Response Format

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

### Error Handling Strategy

1. **Validate Early**: Check all preconditions before applying any state changes
2. **Fail Fast**: Return validation errors immediately
3. **Preserve State**: Never modify state on validation failure
4. **Descriptive Messages**: Provide clear, actionable error messages
5. **Type Safety**: Use TypeScript to prevent invalid states at compile time

## Testing Strategy

### Dual Testing Approach

The Connect Four implementation uses both unit testing and property-based testing to ensure correctness:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties that should hold across all inputs

Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness.

### Property-Based Testing

**Library**: `fast-check` (JavaScript/TypeScript property-based testing library)

**Configuration**: Each property-based test runs a minimum of 100 iterations to ensure thorough coverage of the input space.

**Test Tagging**: Each property-based test includes a comment explicitly referencing the correctness property from this design document using the format:
```typescript
// Feature: connect-four, Property 9: Gravity places discs at lowest position
```

**Property Implementation**: Each correctness property is implemented by a SINGLE property-based test. Multiple properties should not be combined into one test.

**Test Placement**: Property tests are placed as close to implementation as possible, so errors can be caught early.

### Unit Testing

Unit tests cover:
- Specific examples that demonstrate correct behavior (e.g., specific win patterns)
- Edge cases (e.g., empty board, full board, single disc)
- Error conditions (e.g., invalid column numbers, wrong player)
- Integration points between modules

### Test Organization

Tests mirror the module structure:
```
engine/__tests__/
├── metadata.test.ts           # Metadata functions
├── initialization.test.ts     # Game initialization
├── validation.test.ts         # Move validation
├── gravity.test.ts            # Gravity mechanics
├── rules.test.ts              # Game rules and win detection
├── renderer.test.ts           # SVG rendering
└── ConnectFourEngine.test.ts  # Integration tests

ui/__tests__/
└── ConnectFourMoveInput.test.tsx  # UI component tests
```

### Smart Generators for Property Tests

Property tests use intelligent generators that constrain the input space:

- **Board Generator**: Creates valid board states with varying fill levels
- **Move Generator**: Generates valid column selections (0-6)
- **Game State Generator**: Creates realistic game states at different stages
- **Win Pattern Generator**: Creates boards with specific winning configurations

### Test Coverage Goals

- **Engine modules**: 100% coverage of all logic paths
- **UI components**: 90%+ coverage focusing on behavior
- **Integration**: Full game flow from initialization to completion

## Implementation Notes

### Win Detection Optimization

To optimize win detection, only check patterns that include the most recently placed disc:
1. Check horizontal line through the placed disc
2. Check vertical line through the placed disc
3. Check both diagonal lines through the placed disc

This reduces the search space from checking the entire board to checking only 4 potential winning lines.

### Gravity Implementation

The gravity mechanic scans from bottom (row 5) to top (row 0) to find the first empty cell:
```typescript
for (let row = ROWS - 1; row >= 0; row--) {
  if (board[row][column] === null) {
    return row;
  }
}
return null; // Column is full
```

### Immutability Pattern

All state transitions use immutable updates:
```typescript
// Create new board with disc placed
const newBoard = board.map((row, r) =>
  row.map((cell, c) =>
    r === targetRow && c === column ? playerColor : cell
  )
);
```

### SVG Rendering Approach

The renderer generates SVG elements in layers:
1. **Background Layer**: Board background
2. **Grid Layer**: Column and row dividers
3. **Disc Layer**: All discs (empty, red, yellow)
4. **Highlight Layer**: Winning pattern highlight (if applicable)

This layered approach makes it easy to update specific parts of the rendering without regenerating the entire SVG.

## Future Enhancements

### Potential Extensions

1. **Undo/Redo**: Add move history and ability to undo moves
2. **AI Opponent**: Implement computer player with difficulty levels
3. **Custom Board Sizes**: Support different grid dimensions
4. **Timed Moves**: Add optional move time limits
5. **Move Hints**: Suggest optimal moves for players
6. **Replay Mode**: Replay completed games move-by-move
7. **Statistics**: Track win rates, average game length, etc.

### Plugin System Extensions

If these features are implemented, they may require extensions to the base plugin interface:
- `getAvailableMoves()`: Return list of valid moves
- `evaluatePosition()`: Evaluate board position for AI
- `getMoveHistory()`: Return chronological list of moves
- `undoMove()`: Revert to previous state

## References

- [Connect Four Wikipedia](https://en.wikipedia.org/wiki/Connect_Four)
- [Game Rules](https://www.gamesver.com/how-to-play-connect-4/)
- [Tic-Tac-Toe Plugin](../../games/tic-tac-toe/README.md) - Reference implementation
- [BaseGameEngine Interface](../../src/domain/interfaces/GameEnginePlugin.ts)
