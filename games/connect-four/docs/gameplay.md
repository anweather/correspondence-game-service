# Connect Four Gameplay Guide

## Getting Started

This guide explains how to play Connect Four through the Async Boardgame Service API and UI.

## Move Format

### API Move Structure

Moves are submitted as JSON objects with the following structure:

```json
{
  "action": "drop",
  "parameters": {
    "column": 3
  }
}
```

### Move Parameters

- **action**: Always `"drop"` for Connect Four
- **parameters.column**: Integer from 0 to 6 (0 = leftmost, 6 = rightmost)

### Board Coordinate System

The board uses a zero-indexed coordinate system with automatic gravity:

```
Column:  0   1   2   3   4   5   6
Row 0:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]  ← Top
Row 1:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 2:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 3:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 4:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 5:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]  ← Bottom (gravity pulls discs here)
```

**Important**: Players only specify the column. The row is automatically determined by gravity (disc falls to the lowest empty position).

## Gameplay Examples

### Example 1: Complete Game with Horizontal Win

**Initial State**: Empty board

**Move 1** - Player 1 (Red) drops in column 3:
```json
{ "action": "drop", "parameters": { "column": 3 } }
```
```
Column:  0   1   2   3   4   5   6
Row 0:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 1:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 2:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 3:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 4:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 5:  [ ] [ ] [ ] [R] [ ] [ ] [ ]  ← Disc lands at bottom
```

**Move 2** - Player 2 (Yellow) drops in column 3:
```json
{ "action": "drop", "parameters": { "column": 3 } }
```
```
Row 4:  [ ] [ ] [ ] [Y] [ ] [ ] [ ]  ← Stacks on top of red
Row 5:  [ ] [ ] [ ] [R] [ ] [ ] [ ]
```

**Move 3** - Player 1 (Red) drops in column 4:
```json
{ "action": "drop", "parameters": { "column": 4 } }
```
```
Row 5:  [ ] [ ] [ ] [R] [R] [ ] [ ]
```

**Move 4** - Player 2 (Yellow) drops in column 4:
```json
{ "action": "drop", "parameters": { "column": 4 } }
```
```
Row 4:  [ ] [ ] [ ] [Y] [Y] [ ] [ ]
Row 5:  [ ] [ ] [ ] [R] [R] [ ] [ ]
```

**Move 5** - Player 1 (Red) drops in column 2:
```json
{ "action": "drop", "parameters": { "column": 2 } }
```
```
Row 5:  [ ] [ ] [R] [R] [R] [ ] [ ]
```

**Move 6** - Player 2 (Yellow) drops in column 2:
```json
{ "action": "drop", "parameters": { "column": 2 } }
```
```
Row 4:  [ ] [ ] [Y] [Y] [Y] [ ] [ ]
Row 5:  [ ] [ ] [R] [R] [R] [ ] [ ]
```

**Move 7** - Player 1 (Red) drops in column 5 (WINS):
```json
{ "action": "drop", "parameters": { "column": 5 } }
```
```
Row 5:  [ ] [ ] [R] [R] [R] [R] [ ]  ← Four in a row!
```
**Result**: Player 1 (Red) wins with horizontal line at row 5, columns 2-5

### Example 2: Vertical Win

**Move Sequence**:
1. Player 1 (Red): column 3
2. Player 2 (Yellow): column 4
3. Player 1 (Red): column 3
4. Player 2 (Yellow): column 4
5. Player 1 (Red): column 3
6. Player 2 (Yellow): column 4
7. Player 1 (Red): column 3 (WINS)

**Final Board State**:
```
Column:  0   1   2   3   4   5   6
Row 0:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 1:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 2:  [ ] [ ] [ ] [R] [Y] [ ] [ ]  ← Top of red stack
Row 3:  [ ] [ ] [ ] [R] [Y] [ ] [ ]
Row 4:  [ ] [ ] [ ] [R] [Y] [ ] [ ]
Row 5:  [ ] [ ] [ ] [R] [Y] [ ] [ ]  ← Four red in column 3
```
**Result**: Player 1 (Red) wins with vertical line in column 3, rows 2-5

### Example 3: Diagonal Win (Ascending)

**Move Sequence**:
1. Player 1 (Red): column 0
2. Player 2 (Yellow): column 1
3. Player 1 (Red): column 1
4. Player 2 (Yellow): column 2
5. Player 1 (Red): column 2
6. Player 2 (Yellow): column 3
7. Player 1 (Red): column 2
8. Player 2 (Yellow): column 3
9. Player 1 (Red): column 3
10. Player 2 (Yellow): column 0
11. Player 1 (Red): column 3 (WINS)

**Final Board State**:
```
Column:  0   1   2   3   4   5   6
Row 0:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 1:  [ ] [ ] [ ] [ ] [ ] [ ] [ ]
Row 2:  [ ] [ ] [ ] [R] [ ] [ ] [ ]  ← Top of diagonal
Row 3:  [ ] [ ] [R] [Y] [ ] [ ] [ ]
Row 4:  [ ] [R] [Y] [Y] [ ] [ ] [ ]
Row 5:  [R] [Y] [R] [Y] [ ] [ ] [ ]  ← Bottom of diagonal
```
**Result**: Player 1 (Red) wins with ascending diagonal: (5,0), (4,1), (3,2), (2,3)

### Example 4: Draw Game

**Final Board State** (all 42 spaces filled, no winner):
```
Column:  0   1   2   3   4   5   6
Row 0:  [R] [Y] [R] [Y] [R] [Y] [R]
Row 1:  [Y] [R] [Y] [R] [Y] [R] [Y]
Row 2:  [R] [Y] [R] [Y] [R] [Y] [R]
Row 3:  [Y] [R] [Y] [R] [Y] [R] [Y]
Row 4:  [R] [Y] [R] [Y] [R] [Y] [R]
Row 5:  [Y] [R] [Y] [R] [Y] [R] [Y]
```
**Result**: Draw - all spaces filled, no four in a row

### Example 5: Invalid Move Scenarios

**Scenario A: Column Full**

Current board (column 3 is full):
```
Row 0:  [ ] [ ] [ ] [Y] [ ] [ ] [ ]
Row 1:  [ ] [ ] [ ] [R] [ ] [ ] [ ]
Row 2:  [ ] [ ] [ ] [Y] [ ] [ ] [ ]
Row 3:  [ ] [ ] [ ] [R] [ ] [ ] [ ]
Row 4:  [ ] [ ] [ ] [Y] [ ] [ ] [ ]
Row 5:  [ ] [ ] [ ] [R] [ ] [ ] [ ]
```

Invalid move (column full):
```json
{ "action": "drop", "parameters": { "column": 3 } }
```
**Error**: "Column 3 is full"

**Scenario B: Out of Bounds**

Invalid move (column out of range):
```json
{ "action": "drop", "parameters": { "column": 7 } }
```
**Error**: "Column must be between 0 and 6"

Invalid move (negative column):
```json
{ "action": "drop", "parameters": { "column": -1 } }
```
**Error**: "Column must be between 0 and 6"

**Scenario C: Wrong Turn**

Current board (Player 2's turn):
```
Row 5:  [R] [ ] [ ] [ ] [ ] [ ] [ ]
```

Player 1 attempts to move again:
```json
{ "action": "drop", "parameters": { "column": 1 } }
```
**Error**: "It is not your turn"

**Scenario D: Game Already Completed**

Board with winner:
```
Row 5:  [R] [R] [R] [R] [ ] [ ] [ ]  ← Red wins
```

Any player attempts to move:
```json
{ "action": "drop", "parameters": { "column": 4 } }
```
**Error**: "Game is already completed"

## Using the API

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

**Response**:
```json
{
  "gameId": "game-123",
  "gameType": "connect-four",
  "status": "in_progress",
  "players": [
    { "id": "player1", "name": "Alice" },
    { "id": "player2", "name": "Bob" }
  ],
  "currentPlayerIndex": 0,
  "metadata": {
    "board": [
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null]
    ]
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
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

**Response** (successful move):
```json
{
  "success": true,
  "gameState": {
    "gameId": "game-123",
    "status": "in_progress",
    "currentPlayerIndex": 1,
    "metadata": {
      "board": [
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        [null, null, null, "red", null, null, null]
      ],
      "lastMove": {
        "row": 5,
        "column": 3,
        "player": "player1"
      }
    }
  }
}
```

**Response** (invalid move):
```json
{
  "success": false,
  "error": "Column 3 is full"
}
```

### Getting Game State

```bash
GET /api/games/{gameId}
```

**Response**:
```json
{
  "gameId": "game-123",
  "gameType": "connect-four",
  "status": "in_progress",
  "players": [
    { "id": "player1", "name": "Alice" },
    { "id": "player2", "name": "Bob" }
  ],
  "currentPlayerIndex": 1,
  "winner": null,
  "metadata": {
    "board": [
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, "yellow", null, null, null],
      [null, null, null, "red", null, null, null]
    ],
    "lastMove": {
      "row": 4,
      "column": 3,
      "player": "player2"
    }
  },
  "version": 2,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:31:00Z"
}
```

### Getting Board Rendering

```bash
GET /api/games/{gameId}/render
```

**Response**:
```json
{
  "format": "svg",
  "data": "<svg>...</svg>"
}
```

The SVG rendering includes:
- 7×6 grid structure
- Grid lines separating columns and rows
- Red discs for Player 1
- Yellow discs for Player 2
- White circles for empty spaces
- Highlighted winning pattern (if game is completed)

## Using the UI

### Web Client Interface

1. **View Games**: See list of all active games
2. **Select Game**: Click on a game to view details
3. **Make Move**: Click on a column button to drop your disc
4. **Visual Feedback**: 
   - Your disc appears immediately in the correct position
   - Full columns are disabled
   - Current player's turn is highlighted
   - Hover effects show which column you're selecting
5. **Game End**: Winner or draw is displayed when game concludes

### Move Input Component

The `ConnectFourMoveInput` component provides:
- 7 clickable column buttons (labeled 0-6 or 1-7)
- Visual indication of full columns (disabled buttons)
- Hover effects to preview column selection
- Automatic validation of moves
- Disabled state when not your turn or game is completed

## Strategy Tips

### Opening Moves
1. **Center Control**: Starting in the middle columns (3, 4) provides more winning opportunities
2. **Avoid Edges Early**: Edge columns (0, 6) have fewer strategic options
3. **Build Flexibility**: Don't commit to one column too early

### Mid-Game Tactics
1. **Create Threats**: Build multiple potential winning lines
2. **Block Opponent**: Always check if opponent has three in a row
3. **Vertical Stacking**: Build up in columns to create vertical threats
4. **Diagonal Awareness**: Watch for diagonal opportunities as columns fill

### Advanced Strategies
1. **Forcing Moves**: Create situations where opponent must respond to your threat
2. **Double Threats**: Set up two winning opportunities simultaneously
3. **Column Control**: Dominate key columns to limit opponent's options
4. **Trap Setup**: Force opponent into positions that benefit you

### Common Mistakes to Avoid
1. **Ignoring Opponent Threats**: Always check for opponent's three in a row
2. **Filling Columns Too Fast**: Leaves fewer options later in the game
3. **Neglecting Diagonals**: Diagonal wins are easy to miss
4. **Playing Too Defensively**: Balance defense with offensive threats

## Common Questions

**Q: Can I choose which row to place my disc?**
A: No, you can only select the column. Gravity automatically places the disc in the lowest empty row.

**Q: What happens if I click a full column?**
A: The button will be disabled, preventing you from selecting that column.

**Q: Can I undo a move?**
A: No, once a move is submitted and validated, it cannot be undone.

**Q: How do I know whose turn it is?**
A: The game state includes `currentPlayerIndex` and the UI highlights the active player.

**Q: Can the game end before the board is full?**
A: Yes, the game ends immediately when a player achieves four in a row.

**Q: What if both players disconnect?**
A: The game state is preserved on the server and can be resumed at any time.

**Q: Is there a time limit for moves?**
A: No, this is an asynchronous game. Players can take as long as they need.

**Q: Can I see where my disc will land before dropping it?**
A: The UI may provide hover effects, but the disc always lands in the lowest empty row of the selected column.

**Q: How is the winner determined if multiple four-in-a-row patterns exist?**
A: The game ends as soon as any four-in-a-row pattern is created. The player who made that move wins.

## Differences from Physical Connect Four

This digital implementation differs slightly from the physical game:

1. **Column Selection**: You select a column number (0-6) rather than physically dropping a disc
2. **Instant Placement**: Disc placement is instantaneous (no physical dropping animation)
3. **Automatic Validation**: Invalid moves are prevented before submission
4. **State Persistence**: Game state is saved and can be resumed anytime
5. **Asynchronous Play**: Players don't need to be present simultaneously
6. **Visual Rendering**: Board is rendered as SVG rather than physical pieces

## API Integration Examples

### JavaScript/TypeScript Client

```typescript
import { ConnectFourEngine } from '@games/connect-four/engine';
import type { ConnectFourMove } from '@games/connect-four/shared';

// Create engine
const engine = new ConnectFourEngine();

// Initialize game
const gameState = engine.initializeGame(
  [
    { id: 'player1', name: 'Alice' },
    { id: 'player2', name: 'Bob' }
  ],
  {}
);

// Make a move
const move: ConnectFourMove = {
  action: 'drop',
  parameters: { column: 3 }
};

// Validate move
const validation = engine.validateMove(gameState, 'player1', move);
if (validation.valid) {
  // Apply move
  const newState = engine.applyMove(gameState, 'player1', move);
  
  // Check if game is over
  if (engine.isGameOver(newState)) {
    const winner = engine.getWinner(newState);
    console.log(winner ? `${winner} wins!` : 'Draw!');
  }
}

// Render board
const renderData = engine.renderBoard(gameState);
```

### React Component Example

```typescript
import { ConnectFourMoveInput } from '@games/connect-four/ui';
import type { GameState, MoveInput } from '@games/connect-four/shared';

function ConnectFourGame({ gameState, onMove }: Props) {
  const handleMove = async (moveInput: MoveInput) => {
    try {
      const response = await fetch(`/api/games/${gameState.gameId}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayerId,
          move: moveInput
        })
      });
      
      const result = await response.json();
      if (result.success) {
        onMove(result.gameState);
      } else {
        console.error('Move failed:', result.error);
      }
    } catch (error) {
      console.error('Error making move:', error);
    }
  };

  return (
    <div>
      <h2>Connect Four</h2>
      <ConnectFourMoveInput
        gameState={gameState}
        onMoveChange={handleMove}
        disabled={gameState.status !== 'in_progress'}
      />
    </div>
  );
}
```

## Troubleshooting

### Move Rejected

**Problem**: Your move is being rejected
**Solutions**:
- Verify it's your turn (check `currentPlayerIndex`)
- Ensure column number is 0-6
- Check that the column isn't full
- Confirm game status is "in_progress"

### Column Full Error

**Problem**: Getting "column is full" error
**Solutions**:
- Choose a different column
- Check the board state to see which columns have space
- The UI should disable full columns automatically

### Wrong Turn Error

**Problem**: Getting "not your turn" error
**Solutions**:
- Wait for the other player to move
- Check `currentPlayerIndex` in game state
- Refresh game state to get latest turn information

### Game State Out of Sync

**Problem**: UI doesn't match server state
**Solutions**:
- Refresh the game state from the server
- Check for network errors
- Verify you're looking at the correct game ID

## Performance Considerations

- **Move Validation**: O(1) - constant time
- **Gravity Calculation**: O(rows) - linear in board height
- **Win Detection**: O(1) - checks only 4 directions from placed disc
- **Board Rendering**: O(rows × columns) - linear in board size
- **State Updates**: Immutable - creates new state object each move

The implementation is optimized for fast move processing and efficient win detection.
